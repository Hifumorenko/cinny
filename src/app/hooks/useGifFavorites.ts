import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClientEvent, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import {
  FavoriteGif,
  getGifFavorites,
  isGifFavorite,
  toggleGifFavorite,
} from '../plugins/gif-favorites';
import { AccountDataEvent } from '../../types/matrix/accountData';

const isFavoritesEvent = (event: MatrixEvent): boolean =>
  event.getType().startsWith(AccountDataEvent.CinnyGifFavorites);

export const useGifFavorites = (mx: MatrixClient): FavoriteGif[] => {
  const [favorites, setFavorites] = useState(() => getGifFavorites(mx));

  useEffect(() => {
    const handleAccountData = (event: MatrixEvent) => {
      // Favorites live across the base manifest and `<base>.<n>` chunk events.
      if (!isFavoritesEvent(event)) return;
      setFavorites(getGifFavorites(mx));
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx]);

  return favorites;
};

/** Live favorite state for a single GIF id (lighter than the full list). */
export const useIsGifFavorite = (mx: MatrixClient, id: string): boolean => {
  const [favorite, setFavorite] = useState(() => isGifFavorite(mx, id));

  useEffect(() => {
    setFavorite(isGifFavorite(mx, id));
    const handleAccountData = (event: MatrixEvent) => {
      if (!isFavoritesEvent(event)) return;
      setFavorite(isGifFavorite(mx, id));
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx, id]);

  return favorite;
};

/** Set of favorite GIF ids for cheap membership checks in a grid. */
export const useGifFavoriteIds = (favorites: FavoriteGif[]): Set<string> =>
  useMemo(() => new Set(favorites.map((gif) => gif.id)), [favorites]);

/**
 * Returns a toggler that decides add-vs-remove from the *current* stored state
 * at click time, rather than a possibly-stale React value — so unfavoriting is
 * reliable even before the account-data round-trip has refreshed the list.
 */
export const useToggleGifFavorite = (mx: MatrixClient) =>
  useCallback((gif: FavoriteGif) => toggleGifFavorite(mx, gif), [mx]);
