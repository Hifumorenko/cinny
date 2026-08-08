import React, {
  ChangeEventHandler,
  ReactNode,
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Icon, Icons, Input, Scroll, Spinner, Text, color } from 'folds';
import { GifFavoriteButton } from './GifFavoriteButton';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useDebounce } from '../../hooks/useDebounce';
import { mobileOrTablet } from '../../utils/user-agent';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  useGifFavoriteIds,
  useGifFavorites,
  useToggleGifFavorite,
} from '../../hooks/useGifFavorites';
import { KlipyGif, getKlipyCustomerId, searchKlipyGifs } from '../../plugins/klipy';
import * as css from './GifBoard.css';

// Klipy content rating. `pg-13` roughly matches Discord's default mixed feed
// without surfacing explicit content.
const KLIPY_RATING = 'pg-13';

// Distance (px) from the bottom of the scroll area at which the next page is
// requested, so new GIFs stream in before the user hits the end.
const LOAD_MORE_THRESHOLD = 400;

type LoadState = 'idle' | 'loading' | 'error';

function GifPlaceholder({ children, tone }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Box justifyContent="Center" style={{ padding: '2rem 1rem' }}>
      <Text
        size="T300"
        align="Center"
        style={{ color: tone === 'error' ? color.Critical.Main : color.SurfaceVariant.OnContainer }}
      >
        {children}
      </Text>
    </Box>
  );
}

type GifTileProps = {
  gif: KlipyGif;
  favorite: boolean;
  onSelect: (gif: KlipyGif) => void;
  onToggleFavorite: (gif: KlipyGif) => void;
};
function GifTile({ gif, favorite, onSelect, onToggleFavorite }: GifTileProps) {
  return (
    <div className={css.GifItem}>
      <button
        type="button"
        className={css.GifSelect}
        onClick={() => onSelect(gif)}
        aria-label={gif.title}
      >
        <img
          className={css.GifImg}
          src={gif.previewUrl}
          alt={gif.title}
          width={gif.previewWidth}
          height={gif.previewHeight}
          loading="lazy"
          draggable={false}
        />
      </button>
      <GifFavoriteButton favorite={favorite} onToggle={() => onToggleFavorite(gif)} />
    </div>
  );
}

type GifContentProps = {
  /** Rendered above the search input (e.g. the picker tabs). */
  header?: ReactNode;
  onGifSelect: (gif: KlipyGif) => void;
};

/**
 * The GIF picker body — favorites by default, live search on typing. There is
 * deliberately no trending/discovery feed: an empty query shows the user's own
 * favorites, nothing else. Meant to live inside the emoji/sticker board, which
 * supplies the surrounding FocusTrap and tabs.
 */
export function GifContent({ header, onGifSelect }: GifContentProps) {
  const mx = useMatrixClient();
  const [apiKey] = useSetting(settingsAtom, 'klipyApiKey');
  const customerId = useMemo(() => getKlipyCustomerId(), []);

  const favorites = useGifFavorites(mx);
  const favoriteIds = useGifFavoriteIds(favorites);
  const toggleFavorite = useToggleGifFavorite(mx);

  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [state, setState] = useState<LoadState>('idle');

  // With no query the picker shows the user's favorites (never a trending
  // feed); search results only appear once something is typed.
  const searching = query.trim().length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();
  // Guards against out-of-order responses: only the latest request may commit.
  const reqIdRef = useRef(0);

  const load = useCallback(
    async (term: string, requestedPage: number) => {
      if (!apiKey || !term.trim()) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = reqIdRef.current + 1;
      reqIdRef.current = reqId;

      setState('loading');
      try {
        const result = await searchKlipyGifs(term.trim(), {
          apiKey,
          page: requestedPage,
          rating: KLIPY_RATING,
          customerId,
          signal: controller.signal,
        });

        if (reqId !== reqIdRef.current) return;
        setGifs((prev) => (requestedPage === 1 ? result.gifs : [...prev, ...result.gifs]));
        setPage(result.page);
        setHasNext(result.hasNext);
        setState('idle');
      } catch (err) {
        if (controller.signal.aborted || reqId !== reqIdRef.current) return;
        setState('error');
      }
    },
    [apiKey, customerId]
  );

  // Run a fresh search from the first page whenever the query changes.
  useEffect(() => {
    if (!searching) {
      setGifs([]);
      setState('idle');
      return;
    }
    load(query, 1);
  }, [query, searching, load]);

  const applyQuery = useDebounce(
    useCallback((term: string) => setQuery(term), []),
    { wait: 400 }
  );

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    applyQuery(evt.target.value);
  };

  const loadMore = useCallback(() => {
    if (!searching || state === 'loading' || !hasNext) return;
    load(query, page + 1);
  }, [searching, state, hasNext, load, query, page]);

  const handleScroll: UIEventHandler<HTMLDivElement> = (evt) => {
    const el = evt.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
      loadMore();
    }
  };

  const displayGifs = searching ? gifs : favorites;
  const empty = displayGifs.length === 0;

  const renderStatus = () => {
    if (!apiKey) {
      return (
        <GifPlaceholder>
          Add your Klipy API key in Settings → General to search GIFs.
        </GifPlaceholder>
      );
    }
    if (!empty) {
      return (
        <div className={css.Masonry}>
          {displayGifs.map((gif) => (
            <GifTile
              key={gif.id}
              gif={gif}
              favorite={favoriteIds.has(gif.id)}
              onSelect={onGifSelect}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      );
    }
    if (!searching) {
      return (
        <GifPlaceholder>
          No favorite GIFs yet. Search above and tap the star to save some here.
        </GifPlaceholder>
      );
    }
    if (state === 'loading') {
      return (
        <Box justifyContent="Center" style={{ padding: '1rem' }}>
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }
    if (state === 'error') {
      return (
        <GifPlaceholder tone="error">
          Could not load GIFs. Check your Klipy API key and connection.
        </GifPlaceholder>
      );
    }
    return <GifPlaceholder>No GIFs found.</GifPlaceholder>;
  };

  return (
    <Box className={css.Base} direction="Column">
      <Box className={css.Header} shrink="No" direction="Column" gap="200">
        {header}
        <Input
          variant="SurfaceVariant"
          size="400"
          placeholder="Search KLIPY"
          maxLength={100}
          after={<Icon src={Icons.Search} size="50" />}
          onChange={handleSearchChange}
          autoFocus={!mobileOrTablet()}
        />
      </Box>

      <Box grow="Yes">
        <Scroll ref={scrollRef} onScroll={handleScroll} size="300" hideTrack visibility="Hover">
          <Box className={css.Content} direction="Column">
            {renderStatus()}
          </Box>
        </Scroll>
      </Box>

      <Box className={css.Footer} shrink="No" justifyContent="Center">
        <Text size="T200" style={{ color: color.SurfaceVariant.OnContainer }}>
          Powered by KLIPY
        </Text>
      </Box>
    </Box>
  );
}
