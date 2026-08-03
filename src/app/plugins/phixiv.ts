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

const PIXIV_RE_BASE = 'https://pixiv.re';

/**
 * The artwork at full original resolution, for saving.
 *
 * Phixiv's `og:image` — and therefore the copy the homeserver scraped and the
 * only one an mxc url can ever serve — is Pixiv's `master1200` derivative: a
 * re-encoded JPEG capped at 1200px on its long edge, typically a fraction of
 * the original's size. Nothing about the preview flow can do better, since
 * Phixiv offers no route that puts the original in `og:image` and the real
 * `img-original` path embeds the artwork's upload timestamp, which is
 * recoverable only from a url we no longer have by then (the homeserver hands
 * back an mxc, not the phixiv url it scraped).
 *
 * pixiv.re is keyed on the artwork id alone, so it needs none of that, and
 * unlike Phixiv's own `/i/` proxy it serves CORS headers — a requirement here,
 * because saving means reading the bytes back with `fetch`, not just pointing
 * an `<img>` at them. It returns the original file untouched (byte-identical
 * to what Pixiv's own `img-original` serves), and the extension in the request
 * is ignored: `.png` is a placeholder that comes back as whatever the artwork
 * actually is, correctly typed.
 *
 * Only reached on an explicit download click, so it is the one moment this
 * card talks to anything but the homeserver. It can 404 — deleted works, or an
 * outage — so callers must keep the mxc copy as a fallback rather than trust
 * this to resolve.
 *
 * Two candidates, because neither form covers every work and which one applies
 * is not knowable from the id:
 *
 * - `{id}-1.png` is the first page of a multi-page work. Bare `{id}.png` also
 *   resolves to it, but only via a 301 that carries no CORS headers — and a
 *   redirect response must clear CORS in its own right, so a browser aborts
 *   the whole fetch there rather than following it. Asking for the redirect
 *   target directly is what keeps that request readable.
 * - `{id}.png` is a single-page work, where the `-1` form is a 404 instead.
 *
 * Both name page 0 — pixiv.re counts pages from 1 — which is the single image
 * the card and viewer show. Callers try them in order and keep the first that
 * resolves.
 */
export const getPixivOriginalImageUrls = (id: string): string[] => [
  `${PIXIV_RE_BASE}/${id}-1.png`,
  `${PIXIV_RE_BASE}/${id}.png`,
];

/**
 * What Pixiv itself calls the file — `131385841_p0` — leaving the extension to
 * whoever ends up holding the downloaded bytes, since the format is not
 * knowable from the id. Saving under the artwork's *title* instead loses the
 * only identifier that ties the file back to the post it came from, and
 * collides across the many works sharing a common title.
 */
export const getPixivOriginalFileName = (id: string): string => `${id}_p0`;

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
