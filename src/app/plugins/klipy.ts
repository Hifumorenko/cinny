/**
 * Minimal client for the Klipy GIF API (https://docs.klipy.com).
 *
 * Klipy requires a developer key on every request, so it is supplied
 * per-user from Settings (see `settingsAtom.klipyApiKey`) rather than bundled
 * with the app. The key is embedded directly in the request path, as the v1
 * API expects.
 */

const KLIPY_API_BASE = 'https://api.klipy.com/api/v1';

export const KLIPY_DEFAULT_PER_PAGE = 24;

export type KlipyGif = {
  id: string;
  title: string;
  /** Animated URL used for the grid preview (small/light). */
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  /** Best-quality animated URL, used when actually sending the GIF. */
  sendUrl: string;
};

export type KlipyPage = {
  gifs: KlipyGif[];
  page: number;
  hasNext: boolean;
};

type KlipyMediaFormat = {
  url?: string;
  width?: number;
  height?: number;
};

// Each item exposes a `file`/`files` map keyed by quality tier (xs, sm, md,
// hd) then by format (gif, mp4, webp, jpg). The exact tiers Klipy returns can
// vary, so every lookup falls back through the available options.
type KlipyQuality = Record<string, KlipyMediaFormat | undefined>;
type KlipyFiles = Record<string, KlipyQuality | KlipyMediaFormat | undefined>;

type KlipyItem = {
  id?: number | string;
  slug?: string;
  title?: string;
  file?: KlipyFiles;
  files?: KlipyFiles;
};

type KlipyResponse = {
  result?: boolean;
  data?: {
    data?: KlipyItem[];
    current_page?: number;
    has_next?: boolean;
  };
};

const isMediaFormat = (value: unknown): value is KlipyMediaFormat =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as KlipyMediaFormat).url === 'string';

/**
 * Pick the first available `format` (e.g. `gif`) walking the given quality
 * tiers in order. Handles both the nested `{ tier: { format } }` shape and the
 * occasional flattened `{ format }` shape returned by Klipy.
 */
const pickFormat = (
  files: KlipyFiles | undefined,
  format: string,
  qualities: string[]
): KlipyMediaFormat | undefined => {
  if (!files) return undefined;

  // Flattened shape: files.gif.url
  const flat = files[format];
  if (isMediaFormat(flat)) return flat;

  for (let i = 0; i < qualities.length; i += 1) {
    const tier = files[qualities[i]];
    if (tier && !isMediaFormat(tier)) {
      const media = (tier as KlipyQuality)[format];
      if (isMediaFormat(media)) return media;
    }
  }
  return undefined;
};

const normalizeItem = (item: KlipyItem): KlipyGif | undefined => {
  const files = item.files ?? item.file;
  if (!files) return undefined;

  // Preview: prefer the smaller tiers so the grid stays light.
  const preview =
    pickFormat(files, 'gif', ['sm', 'xs', 'md', 'hd']) ??
    pickFormat(files, 'webp', ['sm', 'xs', 'md', 'hd']);
  // Send: prefer higher quality so the sent GIF looks good.
  const send =
    pickFormat(files, 'gif', ['md', 'hd', 'sm', 'xs']) ??
    pickFormat(files, 'webp', ['md', 'hd', 'sm', 'xs']) ??
    preview;

  const previewUrl = preview?.url ?? send?.url;
  const sendUrl = send?.url ?? previewUrl;
  if (!previewUrl || !sendUrl) return undefined;

  const id = item.id?.toString() ?? item.slug ?? previewUrl;
  return {
    id,
    title: item.title ?? 'GIF',
    previewUrl,
    previewWidth: preview?.width ?? 200,
    previewHeight: preview?.height ?? 200,
    sendUrl,
  };
};

const parsePage = (json: KlipyResponse, requestedPage: number): KlipyPage => {
  const items = json.data?.data ?? [];
  const gifs = items.map(normalizeItem).filter((gif): gif is KlipyGif => gif !== undefined);

  return {
    gifs,
    page: json.data?.current_page ?? requestedPage,
    hasNext: json.data?.has_next ?? false,
  };
};

export type KlipyRequestOptions = {
  apiKey: string;
  page?: number;
  perPage?: number;
  /** Content rating: `g`, `pg`, `pg-13` or `r`. */
  rating?: string;
  /** Stable per-device id, used by Klipy for recents/ads attribution. */
  customerId?: string;
  signal?: AbortSignal;
};

const buildUrl = (path: string, apiKey: string, params: Record<string, string>): string => {
  const search = new URLSearchParams(params).toString();
  return `${KLIPY_API_BASE}/${encodeURIComponent(apiKey)}/${path}${search ? `?${search}` : ''}`;
};

const commonParams = (opts: KlipyRequestOptions): Record<string, string> => {
  const params: Record<string, string> = {
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? KLIPY_DEFAULT_PER_PAGE),
  };
  if (opts.rating) params.rating = opts.rating;
  if (opts.customerId) params.customer_id = opts.customerId;
  return params;
};

export const searchKlipyGifs = async (
  query: string,
  opts: KlipyRequestOptions
): Promise<KlipyPage> => {
  const page = opts.page ?? 1;
  const url = buildUrl('gifs/search', opts.apiKey, {
    q: query,
    ...commonParams(opts),
  });
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Klipy search failed (${res.status})`);
  const json = (await res.json()) as KlipyResponse;
  if (json.result === false) throw new Error('Klipy search was rejected');
  return parsePage(json, page);
};

const CUSTOMER_ID_KEY = 'klipyCustomerId';

/** Stable, anonymous per-device id persisted in localStorage. */
export const getKlipyCustomerId = (): string => {
  let id = localStorage.getItem(CUSTOMER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CUSTOMER_ID_KEY, id);
  }
  return id;
};
