import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClientEvent, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { FavoriteGif, getGifFavorites, toggleGifFavorite } from '../plugins/gif-favorites';
import { AccountDataEvent } from '../../types/matrix/accountData';

export const useGifFavorites = (mx: MatrixClient): FavoriteGif[] => {
  const [favorites, setFavorites] = useState(() => getGifFavorites(mx));

  useEffect(() => {
    const handleAccountData = (event: MatrixEvent) => {
      // Favorites live across the base manifest and `<base>.<n>` chunk events.
      if (!event.getType().startsWith(AccountDataEvent.CinnyGifFavorites)) return;
      setFavorites(getGifFavorites(mx));
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx]);

  return favorites;
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
