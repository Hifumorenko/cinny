/**
 * Pixiv artwork links are rewritten onto Phixiv before being handed to the
 * homeserver's /preview_url endpoint. A plain pixiv.net link only yields a
 * decorative, watermarked preview image server-side, and gives no usable
 * data at all for R-18 works unless the scraper is logged in. Phixiv scrapes
 * Pixiv on our behalf and serves back a clean, embed-friendly OpenGraph page
 * — including for R-18 works — with the artwork's own image proxied through
 * a host that needs no special Referer to load.
 *
 * Unlike FixupX, Phixiv exposes no CORS-enabled JSON API for a client to
 * fetch directly (its old /api/info endpoint was retired), so the preview
 * still goes through the homeserver's own scraper rather than a direct
 * client-side request.
 */

const PHIXIV_BASE = 'https://www.phixiv.net';
const PIXIV_BASE = 'https://www.pixiv.net';

const ARTWORK_HOSTS = new Set(['pixiv.net', 'phixiv.net', 'ppxiv.net']);

// Optional language prefix ("en", "zh_tw", ...), optional trailing image
// index or range — the latter two are a Phixiv-only convention, kept here so
// a pasted phixiv.net/ppxiv.net link round-trips through this parser too.
const ARTWORK_PATH_REG =
  /^\/(?:[a-z]{2}(?:_[a-z]{2})?\/)?artworks\/(\d{1,20})(?:\/\d{1,4}(?:-\d{1,4})?)?/i;
const SHORT_PATH_REG = /^\/i\/(\d{1,20})/;

export type PixivArtworkLink = {
  /** Artwork id, as used by both pixiv.net and phixiv.net. */
  id: string;
  /** Canonical link, rewritten onto phixiv.net. */
  url: string;
};

export const parsePixivArtworkUrl = (url: string): PixivArtworkLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;

  const host = parsed.hostname.toLowerCase().replace(/^(www|touch)\./, '');
  if (!ARTWORK_HOSTS.has(host)) return undefined;

  const artworkMatch = parsed.pathname.match(ARTWORK_PATH_REG);
  const shortMatch = !artworkMatch && parsed.pathname.match(SHORT_PATH_REG);
  const id =
    artworkMatch?.[1] ??
    (shortMatch && shortMatch[1]) ??
    (parsed.pathname === '/member_illust.php' ? parsed.searchParams.get('illust_id') : null);
  if (!id) return undefined;

  return { id, url: `${PHIXIV_BASE}/artworks/${id}` };
};

export const testPixivArtworkUrl = (url: string): boolean =>
  parsePixivArtworkUrl(url) !== undefined;

/** Plain pixiv.net, unlike `PixivArtworkLink.url` — for links meant to leave the app for the real site. */
export const getPixivArtworkUrl = (id: string): string => `${PIXIV_BASE}/artworks/${id}`;

/**
 * Phixiv bakes the artist's pixiv username into `og:title` itself, as
 * "{artwork title} by (@{username})" — there is no separate field for it, so
 * this is the only way to recover an author byline. Phixiv exposes no avatar
 * or upload-date field at all (its old JSON API that carried them was
 * retired), so neither can be shown here.
 */
const TITLE_BY_AUTHOR_REG = /^(.*) by \(@(.+)\)$/;

export const splitPixivTitle = (ogTitle: string): { title: string; author?: string } => {
  const match = ogTitle.match(TITLE_BY_AUTHOR_REG);
  if (!match) return { title: ogTitle };
  const [, title, author] = match;
  return { title, author };
};
