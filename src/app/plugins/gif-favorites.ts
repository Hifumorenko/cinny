import { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { KlipyGif } from './klipy';

// A favorite is a source-agnostic GIF descriptor. It happens to be produced by
// the Klipy client today, but nothing here is Klipy-specific — a GIF from any
// URL can be favorited the same way once a UI entry point exists.
export type FavoriteGif = KlipyGif;

/**
 * Favorites are stored in Matrix account data (synced across all devices), but
 * a single account-data event caps out near ~64 KB. To scale past a few
 * hundred favorites they are sharded across `<base>.<n>` chunk events, oldest
 * first, with a small manifest at the base type recording the chunk count.
 *
 * NOTE: account data is NOT end-to-end encrypted — the homeserver can read it.
 */
const FAVORITES_BASE = AccountDataEvent.CinnyGifFavorites;
const FAVORITES_VERSION = 2;
// Entries per chunk. ~350 bytes each keeps a chunk well under the ~64 KB limit.
const CHUNK_SIZE = 100;

const chunkType = (index: number): string => `${FAVORITES_BASE}.${index}`;

type FavoritesManifest = {
  version?: number;
  chunks?: number;
  // v1 stored the entire list inline here (newest-first); kept for migration.
  favorites?: FavoriteGif[];
};
type FavoritesChunk = { items?: FavoriteGif[] };

const isValid = (gif: unknown): gif is FavoriteGif =>
  typeof gif === 'object' &&
  gif !== null &&
  typeof (gif as FavoriteGif).id === 'string' &&
  typeof (gif as FavoriteGif).sendUrl === 'string';

const readManifest = (mx: MatrixClient): FavoritesManifest =>
  (
    mx.getAccountData(FAVORITES_BASE as any) as MatrixEvent | undefined
  )?.getContent<FavoritesManifest>() ?? {};

const readChunk = (mx: MatrixClient, index: number): FavoriteGif[] => {
  const items = (
    mx.getAccountData(chunkType(index) as any) as MatrixEvent | undefined
  )?.getContent<FavoritesChunk>().items;
  return Array.isArray(items) ? items.filter(isValid) : [];
};

// Internal list order: oldest first (matches chunk layout).
const readOrdered = (mx: MatrixClient): FavoriteGif[] => {
  const manifest = readManifest(mx);
  if (Array.isArray(manifest.favorites)) {
    // v1 inline list was newest-first; flip to the internal oldest-first order.
    return manifest.favorites.filter(isValid).reverse();
  }
  const count = manifest.chunks ?? 0;
  const all: FavoriteGif[] = [];
  for (let i = 0; i < count; i += 1) all.push(...readChunk(mx, i));
  return all;
};

const dedupe = (list: FavoriteGif[]): FavoriteGif[] => {
  const seen = new Set<string>();
  return list.filter((gif) => {
    if (seen.has(gif.id)) return false;
    seen.add(gif.id);
    return true;
  });
};

/** Favorites for display, newest first. */
export const getGifFavorites = (mx: MatrixClient): FavoriteGif[] =>
  dedupe(readOrdered(mx).reverse());

export const isGifFavorite = (mx: MatrixClient, id: string): boolean =>
  readOrdered(mx).some((gif) => gif.id === id);

const writeChunk = (mx: MatrixClient, index: number, items: FavoriteGif[]) =>
  mx.setAccountData(chunkType(index) as any, { items });

const writeManifest = (mx: MatrixClient, chunks: number) =>
  mx.setAccountData(FAVORITES_BASE, { version: FAVORITES_VERSION, chunks });

// Rewrite the whole list, packed into chunks. Used for migration and removal so
// chunks stay CHUNK_SIZE-packed (which keeps cheap appends correct).
const writeAll = async (mx: MatrixClient, ordered: FavoriteGif[]): Promise<void> => {
  const chunkCount = Math.max(1, Math.ceil(ordered.length / CHUNK_SIZE));
  for (let i = 0; i < chunkCount; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await writeChunk(mx, i, ordered.slice(i * CHUNK_SIZE, i * CHUNK_SIZE + CHUNK_SIZE));
  }
  await writeManifest(mx, chunkCount);
};

export const addGifFavorite = async (mx: MatrixClient, gif: FavoriteGif): Promise<void> => {
  if (!isValid(gif)) return;

  const manifest = readManifest(mx);
  const legacy = Array.isArray(manifest.favorites);
  const ordered = readOrdered(mx);
  if (ordered.some((g) => g.id === gif.id)) return; // already favorited

  ordered.push(gif); // newest at the end (internal order)

  if (legacy) {
    // First write after v1: migrate the whole list into chunks.
    await writeAll(mx, ordered);
    return;
  }

  // Invariant: every chunk except the last is full, so appending only ever
  // touches the last chunk (O(chunk) write, not O(n)).
  const lastIndex = Math.floor((ordered.length - 1) / CHUNK_SIZE);
  await writeChunk(
    mx,
    lastIndex,
    ordered.slice(lastIndex * CHUNK_SIZE, lastIndex * CHUNK_SIZE + CHUNK_SIZE)
  );
  if (lastIndex + 1 !== (manifest.chunks ?? 0)) await writeManifest(mx, lastIndex + 1);
};

export const removeGifFavorite = async (mx: MatrixClient, id: string): Promise<void> => {
  const ordered = readOrdered(mx);
  if (!ordered.some((g) => g.id === id)) return;
  // Rewrite packed so chunks stay CHUNK_SIZE-aligned for future appends.
  await writeAll(
    mx,
    ordered.filter((g) => g.id !== id)
  );
};

export const toggleGifFavorite = (mx: MatrixClient, gif: FavoriteGif): Promise<void> =>
  isGifFavorite(mx, gif.id) ? removeGifFavorite(mx, gif.id) : addGifFavorite(mx, gif);
