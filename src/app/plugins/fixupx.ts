/**
 * X/Twitter status links are resolved through FixupX (FxTwitter) instead of the
 * homeserver's /preview_url endpoint. X serves no usable OpenGraph data to a
 * server side scraper, and OpenGraph could only ever carry a single image
 * anyway, while a status can hold up to four media items.
 *
 * The JSON API is only served from api.fxtwitter.com — api.fixupx.com does not
 * resolve — so the API host and the user facing host are separate constants.
 */

const FIXUPX_API_BASE = 'https://api.fxtwitter.com';
const FIXUPX_BASE = 'https://fixupx.com';

const STATUS_HOSTS = new Set([
  'twitter.com',
  'x.com',
  'fixupx.com',
  'fxtwitter.com',
  'vxtwitter.com',
  'twittpr.com',
  'girlcockx.com',
]);

const STATUS_PATH_REG = /^\/(?:([a-zA-Z0-9_]{1,20})|i\/web)\/status(?:es)?\/(\d{1,20})/;

export type TwitterStatusLink = {
  /** Status id, as used by the API. */
  id: string;
  /** Author handle, when the link carried one. */
  handle?: string;
  /** Canonical link, rewritten onto fixupx.com. */
  url: string;
};

export const parseTwitterStatusUrl = (url: string): TwitterStatusLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;

  const host = parsed.hostname.toLowerCase().replace(/^(www|mobile|m)\./, '');
  if (!STATUS_HOSTS.has(host)) return undefined;

  const match = parsed.pathname.match(STATUS_PATH_REG);
  if (!match) return undefined;

  const [, handle, id] = match;
  return {
    id,
    handle,
    url: `${FIXUPX_BASE}/${handle ?? 'i/web'}/status/${id}`,
  };
};

export const testTwitterStatusUrl = (url: string): boolean =>
  parseTwitterStatusUrl(url) !== undefined;

export const getTwitterProfileUrl = (screenName: string): string => `${FIXUPX_BASE}/${screenName}`;

export type FixupxPhoto = {
  type: 'photo';
  url: string;
  width: number;
  height: number;
  altText?: string;
};

export type FixupxVideo = {
  type: 'video' | 'gif';
  url: string;
  thumbnail_url?: string | null;
  width: number;
  height: number;
  duration?: number;
  format?: string;
};

export type FixupxMedia = FixupxPhoto | FixupxVideo;

export type FixupxAuthor = {
  name: string;
  screen_name: string;
  avatar_url: string | null;
  url: string;
  verification?: {
    verified: boolean;
    type: 'organization' | 'government' | 'individual' | null;
  };
};

export type FixupxPoll = {
  choices: {
    label: string;
    count: number;
    percentage: number;
  }[];
  total_votes: number;
  ends_at?: string;
  time_left_en?: string;
};

export type FixupxTweet = {
  id: string;
  url: string;
  text: string;
  author: FixupxAuthor;
  created_at: string;
  /** Unix seconds. */
  created_timestamp: number;
  replies?: number;
  retweets?: number;
  likes?: number;
  views?: number | null;
  color?: string | null;
  possibly_sensitive?: boolean;
  lang?: string | null;
  media?: {
    all?: FixupxMedia[];
    photos?: FixupxPhoto[];
    videos?: FixupxVideo[];
  };
  poll?: FixupxPoll;
  quote?: FixupxTweet;
};

type FixupxResponse = {
  code: number;
  message: string;
  tweet?: FixupxTweet;
};

/**
 * Statuses are immutable enough to cache for the lifetime of the session, which
 * keeps a status posted in several rooms — or re-rendered on timeline
 * virtualization — down to one request.
 */
const statusCache = new Map<string, Promise<FixupxTweet>>();

const fetchTweet = async (id: string): Promise<FixupxTweet> => {
  const response = await fetch(`${FIXUPX_API_BASE}/status/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    throw new Error(`FixupX responded with ${response.status}`);
  }

  const data: FixupxResponse = await response.json();
  if (data.code !== 200 || !data.tweet) {
    throw new Error(data.message || 'Status unavailable');
  }

  return data.tweet;
};

export const getTweet = (id: string): Promise<FixupxTweet> => {
  const cached = statusCache.get(id);
  if (cached) return cached;

  const request = fetchTweet(id).catch((e) => {
    // Do not cache failures, so a card can retry on the next mount.
    statusCache.delete(id);
    throw e;
  });
  statusCache.set(id, request);

  return request;
};

/** Media the embed can render, capped at the four items a status can hold. */
export const getTweetMedia = (tweet: FixupxTweet): FixupxMedia[] => {
  const all = tweet.media?.all ?? [...(tweet.media?.videos ?? []), ...(tweet.media?.photos ?? [])];

  return all
    .filter((media) => media.type === 'photo' || media.type === 'video' || media.type === 'gif')
    .slice(0, 4);
};

export const isPhoto = (media: FixupxMedia): media is FixupxPhoto => media.type === 'photo';

const TWITTER_VIDEO_BASE = 'https://video.twimg.com';
const GIF_TRANSCODE_BASE = 'https://gif.fxtwitter.com';

/** Basename of the media file, to save it under something meaningful. */
export const getMediaFileName = (media: FixupxMedia): string | undefined => {
  try {
    return new URL(media.url).pathname.split('/').pop() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * X stores every uploaded gif as a silent looping mp4, but FixupX transcodes
 * them back into animated images on its own host — the very file it hands
 * Discord. The api never reports that url, because FixupX turns transcoding off
 * for api hosts and leaves `transcode_url` null, so derive it with the same
 * transform FixupX applies: swap the host and the extension.
 *
 * Animated webp rather than gif: it is what Discord is served, and roughly a
 * quarter of the bytes for the same frames.
 */
export const getGifImageUrl = (media: FixupxMedia): string | undefined => {
  if (media.type !== 'gif' || !media.url.startsWith(TWITTER_VIDEO_BASE)) return undefined;

  return media.url.replace(TWITTER_VIDEO_BASE, GIF_TRANSCODE_BASE).replace('.mp4', '.webp');
};
