import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { Box, Chip, Icon, Icons, Spinner, Text, as, config } from 'folds';
import { ImageOverlay } from '../ImageOverlay';
import { ImageViewer } from '../image-viewer';
import { useMediaGalleryNav } from '../../hooks/useMediaGalleryNav';
import { UrlPreviewDescription } from './UrlPreview';
// Reuses the spoiler blur and overlay the message media content already uses.
import * as contentCss from '../message/content/style.css';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { millify } from '../../plugins/millify';
import { timeHourMinute } from '../../utils/time';
import {
  FixupxMedia,
  FixupxTweet,
  FixupxVideo,
  getGifImageUrl,
  getMediaFileName,
  getTweet,
  getTweetMedia,
  getXProfileUrl,
  getXStatusUrl,
  isPhoto,
  parseTwitterStatusUrl,
} from '../../plugins/fixupx';
import * as css from './TweetPreviewCard.css';

/** Used when the status carries no dominant color of its own. */
const DEFAULT_ACCENT = '#1d9bf0';

const X_LOGO_PATH =
  'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';

function XLogo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d={X_LOGO_PATH} />
    </svg>
  );
}

type ViewingMedia = {
  /** Which frame of the mosaic this viewer came from, for gallery prev/next. */
  index: number;
  src: string;
  alt: string;
  /**
   * The gif transcode host serves no CORS headers, so its bytes cannot be read
   * back for saving. The mp4 X actually stores can be, so that is what a gif
   * downloads as.
   */
  downloadSrc?: string;
  downloadName?: string;
};

function TweetStat({ src, count }: { src: (filled?: boolean) => JSX.Element; count: number }) {
  return (
    <Box className={css.TweetFooterStat} alignItems="Center" shrink="No">
      <Icon size="50" src={src} />
      <Text size="T200" priority="300">
        {millify(count)}
      </Text>
    </Box>
  );
}

function TweetAuthorLine({ author, size }: { author: FixupxTweet['author']; size: number }) {
  return (
    <a
      className={css.TweetAuthor}
      href={getXProfileUrl(author.screen_name)}
      target="_blank"
      rel="noreferrer"
    >
      {author.avatar_url && (
        <img
          className={css.TweetAuthorAvatar}
          style={size !== 24 ? { width: size, height: size } : undefined}
          src={author.avatar_url}
          alt=""
          loading="lazy"
        />
      )}
      <Text size="T300" truncate>
        <b>{author.name}</b>{' '}
        <Text as="span" size="T200" priority="300">
          (@{author.screen_name})
        </Text>
      </Text>
    </a>
  );
}

/**
 * X's video host answers 403 to anything carrying a foreign Referer. The
 * service worker strips it for us, but it is not running everywhere the client
 * is — notably the desktop build's custom scheme — so fall back to pulling the
 * file down without a referrer and playing it from a blob.
 */
function TweetVideo({ item }: { item: FixupxVideo }) {
  const [src, setSrc] = useState(item.url);
  const objectUrlRef = useRef<string>();

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const handleError = useCallback(async () => {
    if (objectUrlRef.current) return;
    try {
      const response = await fetch(item.url, { referrerPolicy: 'no-referrer' });
      if (!response.ok) return;
      const objectUrl = URL.createObjectURL(await response.blob());
      objectUrlRef.current = objectUrl;
      setSrc(objectUrl);
    } catch {
      // Leave the element showing its own error state.
    }
  }, [item.url]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      className={css.TweetMediaVideo}
      src={src}
      poster={item.thumbnail_url ?? undefined}
      controls={item.type === 'video'}
      autoPlay={item.type === 'gif'}
      loop={item.type === 'gif'}
      muted={item.type === 'gif'}
      playsInline
      preload="metadata"
      onError={handleError}
    />
  );
}

type TweetMediaProps = {
  media: FixupxMedia[];
  /** Fallback description for the viewer when a frame carries no alt text. */
  description: string;
  /** Set when the sender spoiled the link; never inferred from the status. */
  spoiler?: boolean;
  /** Shown in the viewer opened from this media — the tweet's, not the room message's. */
  author: FixupxTweet['author'];
  timestamp: number;
  /** What "Open in New Tab" opens from the viewer — the tweet, not the bare media file. */
  postUrl: string;
};

function TweetMedia({ media, description, spoiler, author, timestamp, postUrl }: TweetMediaProps) {
  const [blurred, setBlurred] = useState(spoiler ?? false);
  const [viewing, setViewing] = useState<ViewingMedia>();
  // Gifs whose transcode could not be loaded, which fall back to the mp4.
  const [gifFailed, setGifFailed] = useState<string[]>([]);

  /** The still or animated image to show, or nothing when it needs a player. */
  const imageSrc = (item: FixupxMedia): string | undefined => {
    if (isPhoto(item)) return item.url;
    if (gifFailed.includes(item.url)) return undefined;
    return getGifImageUrl(item);
  };

  const closeViewer = useCallback(() => setViewing(undefined), []);
  const { navKeyFor, onPrev, onNext } = useMediaGalleryNav(viewing?.index, closeViewer);

  if (media.length === 0) return null;
  const count = media.length as 1 | 2 | 3 | 4;

  // A lone frame sizes the rectangle to its own ratio, so the whole of it shows
  // without bars. Mosaics keep the 16/9 the stylesheet gives them.
  const [only] = media;
  const singleRatio =
    count === 1 && only.width && only.height ? `${only.width} / ${only.height}` : undefined;

  const view = (item: FixupxMedia, index: number) =>
    setViewing({
      index,
      src: imageSrc(item) ?? item.url,
      alt: (isPhoto(item) ? item.altText : undefined) || description || 'Attachment',
      downloadSrc: item.url,
      downloadName: getMediaFileName(item),
    });

  return (
    <>
      <div className={css.TweetMediaFrame}>
        <div
          className={classNames(css.TweetMediaGrid({ count }), blurred && contentCss.Blur)}
          style={singleRatio ? { aspectRatio: singleRatio } : undefined}
        >
          {media.map((item, index) => {
            const src = imageSrc(item);
            const photo = isPhoto(item);

            return (
              <div
                key={item.url}
                className={classNames(
                  css.TweetMediaItem,
                  count === 3 && index === 0 && css.TweetMediaItemTall
                )}
              >
                {src ? (
                  <a
                    className={contentCss.MediaLink}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    title={photo ? item.altText : undefined}
                    // Not a navigation target while spoilered: its own click
                    // handler refuses to open a blurred frame, so offering it
                    // to prev/next would stall navigation on something that
                    // cannot open. Revealing it puts it back in the gallery.
                    data-media-nav={blurred ? undefined : navKeyFor(index)}
                    onClick={(evt) => {
                      // A blurred frame must not be openable in the viewer.
                      if (blurred) {
                        evt.preventDefault();
                        return;
                      }
                      // Let a middle click, or a modifier held on a plain
                      // click, open the media in a new tab like any link.
                      if (evt.button !== 0 || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
                      evt.preventDefault();
                      view(item, index);
                    }}
                  >
                    <img
                      className={css.TweetMediaImg}
                      src={src}
                      alt={(photo && item.altText) || (photo ? 'Attachment' : 'GIF')}
                      loading="lazy"
                      // Fall back to the mp4 when the transcode is unavailable.
                      onError={
                        photo ? undefined : () => setGifFailed((failed) => [...failed, item.url])
                      }
                    />
                  </a>
                ) : (
                  !photo && <TweetVideo item={item} />
                )}
              </div>
            );
          })}
        </div>

        {blurred && (
          <Box className={contentCss.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Chip
              variant="Secondary"
              radii="Pill"
              size="500"
              outlined
              onClick={() => setBlurred(false)}
            >
              <Text size="B300">Spoiler</Text>
            </Chip>
          </Box>
        )}
      </div>

      {viewing && (
        <ImageOverlay
          src={viewing.src}
          alt={viewing.alt}
          viewer
          requestClose={() => setViewing(undefined)}
          renderViewer={(p) => (
            <ImageViewer
              {...p}
              downloadSrc={viewing.downloadSrc}
              downloadName={viewing.downloadName}
              senderId={author.screen_name}
              senderName={`${author.name} (@${author.screen_name})`}
              senderUrl={getXProfileUrl(author.screen_name)}
              avatarUrl={author.avatar_url ?? undefined}
              timestamp={timestamp}
              openUrl={postUrl}
              onPrev={onPrev}
              onNext={onNext}
            />
          )}
        />
      )}
    </>
  );
}

function TweetQuoteCard({ quote }: { quote: FixupxTweet }) {
  return (
    <a className={css.TweetQuote} href={quote.url} target="_blank" rel="noreferrer">
      <TweetAuthorLine author={quote.author} size={16} />
      {quote.text && (
        <Text size="T200" priority="300">
          <UrlPreviewDescription>{quote.text}</UrlPreviewDescription>
        </Text>
      )}
    </a>
  );
}

export const TweetPreviewCard = as<'div', { url: string; spoiler?: boolean }>(
  ({ url, spoiler, ...props }, ref) => {
    const link = useMemo(() => parseTwitterStatusUrl(url), [url]);
    const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

    const [tweetState] = useAsyncCallbackValue<FixupxTweet, unknown>(
      useCallback(
        () => (link ? getTweet(link.id) : Promise.reject(new Error('Not a status url'))),
        [link]
      )
    );

    if (!link || tweetState.status === AsyncStatus.Error) return null;

    if (tweetState.status !== AsyncStatus.Success) {
      return (
        <Box
          {...props}
          ref={ref}
          className={css.TweetPreview}
          alignItems="Center"
          justifyContent="Center"
          style={{ minHeight: config.space.S700 }}
        >
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }

    const tweet = tweetState.data;
    const media = getTweetMedia(tweet);
    const accent = tweet.color ?? DEFAULT_ACCENT;
    const ts = tweet.created_timestamp
      ? tweet.created_timestamp * 1000
      : Date.parse(tweet.created_at);

    const renderPoll = () => {
      const { poll } = tweet;
      if (!poll) return null;

      return (
        <Box direction="Column" gap="200" style={{ width: '100%' }}>
          {poll.choices.map((choice) => (
            <div key={choice.label} className={css.TweetPollChoice}>
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text size="T200" truncate>
                  {choice.label}
                </Text>
                <Text size="T200" priority="300">
                  {choice.percentage}%
                </Text>
              </Box>
              <div className={css.TweetPollTrack}>
                <div
                  className={css.TweetPollFill}
                  style={{ width: `${choice.percentage}%`, backgroundColor: accent }}
                />
              </div>
            </div>
          ))}
          <Text size="T200" priority="300">
            {millify(poll.total_votes)} votes
            {poll.time_left_en ? ` · ${poll.time_left_en}` : ''}
          </Text>
        </Box>
      );
    };

    return (
      <Box {...props} ref={ref} className={css.TweetPreview}>
        <div className={css.TweetPreviewAccent} style={{ backgroundColor: accent }} />
        <div className={css.TweetPreviewContent}>
          <TweetAuthorLine author={tweet.author} size={24} />

          {tweet.text && (
            <Text className={css.TweetText} size="T300">
              {tweet.text}
            </Text>
          )}

          {renderPoll()}
          <TweetMedia
            media={media}
            description={tweet.text}
            spoiler={spoiler}
            author={tweet.author}
            timestamp={ts}
            postUrl={getXStatusUrl(link)}
          />
          {tweet.quote && <TweetQuoteCard quote={tweet.quote} />}

          <Box className={css.TweetFooter} alignItems="Center">
            <XLogo size={14} />
            {typeof tweet.replies === 'number' && (
              <TweetStat src={Icons.Message} count={tweet.replies} />
            )}
            {typeof tweet.retweets === 'number' && (
              <TweetStat src={Icons.Reload} count={tweet.retweets} />
            )}
            {typeof tweet.likes === 'number' && <TweetStat src={Icons.Heart} count={tweet.likes} />}
            {typeof tweet.views === 'number' && <TweetStat src={Icons.Eye} count={tweet.views} />}
            <Text
              size="T200"
              priority="300"
              as="a"
              href={link.url}
              target="_blank"
              rel="noreferrer"
            >
              {`${timeHourMinute(ts, hour24Clock)} · ${dayjs(ts).format('MMM D, YYYY')}`}
            </Text>
          </Box>
        </div>
      </Box>
    );
  }
);
