/**
 * Unlike X, YouTube serves an official public oEmbed endpoint with CORS enabled
 * (no API key needed), so the title/channel come straight from Google rather
 * than a third party proxy. The thumbnail is not fetched through it at all —
 * `i.ytimg.com` serves a deterministic file per video id, so the frame can
 * paint before the oEmbed request even resolves.
 */

const OEMBED_BASE = 'https://www.youtube.com/oembed';
const THUMBNAIL_BASE = 'https://i.ytimg.com/vi';
/** youtube-nocookie.com avoids setting cookies until the viewer presses play. */
const EMBED_BASE = 'https://www.youtube-nocookie.com/embed';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

const VIDEO_ID_REG = /^[a-zA-Z0-9_-]{11}$/;

export type YouTubeLink = {
  /** Video id, as used by the thumbnail, embed and oEmbed urls. */
  id: string;
  /** Start offset in seconds, when the link carried one. */
  start?: number;
  /** Canonical link, rewritten onto a plain watch url. */
  url: string;
};

/** Parses `1h2m3s`, `90s` and bare-second `t`/`start` params alike. */
const parseTimeParam = (value: string): number | undefined => {
  if (/^\d+$/.test(value)) return parseInt(value, 10);

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return undefined;
  const [, h, m, s] = match;
  if (!h && !m && !s) return undefined;

  return parseInt(h ?? '0', 10) * 3600 + parseInt(m ?? '0', 10) * 60 + parseInt(s ?? '0', 10);
};

export const parseYouTubeUrl = (url: string): YouTubeLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!YOUTUBE_HOSTS.has(host)) return undefined;

  let id: string | undefined;
  if (host === 'youtu.be') {
    [id] = parsed.pathname.slice(1).split('/');
  } else if (parsed.pathname === '/watch') {
    id = parsed.searchParams.get('v') ?? undefined;
  } else {
    const match = parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/);
    id = match?.[1];
  }

  if (!id || !VIDEO_ID_REG.test(id)) return undefined;

  const timeParam = parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
  const start = timeParam ? parseTimeParam(timeParam) : undefined;

  return {
    id,
    start,
    url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`,
  };
};

export const testYouTubeUrl = (url: string): boolean => parseYouTubeUrl(url) !== undefined;

/** `hqdefault` is generated for every upload, unlike the higher resolutions. */
export const getYouTubeThumbnailUrl = (id: string): string =>
  `${THUMBNAIL_BASE}/${id}/hqdefault.jpg`;

export const getYouTubeEmbedUrl = (id: string, start?: number): string =>
  `${EMBED_BASE}/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`;

export type YouTubeOEmbed = {
  title: string;
  author_name: string;
  author_url: string;
};

/**
 * Kept for the lifetime of the session, same reasoning as the tweet cache: a
 * video linked in several rooms, or re-rendered on timeline virtualization,
 * should only ever cost one request.
 */
const oEmbedCache = new Map<string, Promise<YouTubeOEmbed>>();

const fetchOEmbed = async (id: string): Promise<YouTubeOEmbed> => {
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const response = await fetch(`${OEMBED_BASE}?url=${encodeURIComponent(watchUrl)}&format=json`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`YouTube oEmbed responded with ${response.status}`);
  }

  return response.json();
};

export const getYouTubeOEmbed = (id: string): Promise<YouTubeOEmbed> => {
  const cached = oEmbedCache.get(id);
  if (cached) return cached;

  const request = fetchOEmbed(id).catch((e) => {
    // Do not cache failures, so a card can retry on the next mount.
    oEmbedCache.delete(id);
    throw e;
  });
  oEmbedCache.set(id, request);

  return request;
};
