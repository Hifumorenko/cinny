export type InstagramPostLink = {
  id: string;
  type: 'p' | 'reel' | 'tv';
  url: string;
};

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'uuinstagram.com']);

export const parseInstagramPostUrl = (url: string): InstagramPostLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
  const host = parsed.hostname.toLowerCase().replace(/^(www|mobile|m)\./, '');
  if (!INSTAGRAM_HOSTS.has(host)) return undefined;

  const match = parsed.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)(?:\/|$)/i);
  if (!match) return undefined;

  const type = match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase();
  if (type !== 'p' && type !== 'reel' && type !== 'tv') return undefined;

  const id = match[2];
  return { id, type, url: `https://www.instagram.com/${type}/${id}/` };
};

export const testInstagramPostUrl = (url: string): boolean =>
  parseInstagramPostUrl(url) !== undefined;

export const getInstagramPreviewUrl = (link: InstagramPostLink): string =>
  `https://uuinstagram.com/${link.type}/${link.id}/`;
