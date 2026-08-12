export type RedditPostLink = {
  id: string;
  url: string;
  previewUrls: string[];
};

const REDDIT_HOSTS = new Set(['reddit.com', 'old.reddit.com', 'new.reddit.com', 'redd.it']);
const REDDIT_PREVIEW_HOSTS = new Set(['rxddit.com', 'vxreddit.com']);

export const parseRedditPostUrl = (url: string): RedditPostLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
  const host = parsed.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (!REDDIT_HOSTS.has(host) && !REDDIT_PREVIEW_HOSTS.has(host)) return undefined;

  const shortId =
    host === 'redd.it' ? parsed.pathname.match(/^\/([A-Za-z0-9]+)(?:\/|$)/)?.[1] : undefined;
  const postId = parsed.pathname.match(/\/comments\/([A-Za-z0-9]+)(?:\/|$)/i)?.[1];
  const shareId = parsed.pathname.match(/^\/r\/[^/]+\/s\/([A-Za-z0-9_-]+)(?:\/|$)/i)?.[1];
  const id = postId ?? shortId ?? shareId;
  if (!id) return undefined;

  const canonicalPath = postId || shareId ? parsed.pathname : `/comments/${id}/`;
  const pathAndQuery = `${canonicalPath}${parsed.search}`;
  return {
    id,
    url: `https://www.reddit.com${pathAndQuery}`,
    previewUrls: [
      `https://vxreddit.com${pathAndQuery}`,
      `https://rxddit.com${pathAndQuery}`,
      `https://www.reddit.com${pathAndQuery}`,
    ],
  };
};

export const testRedditPostUrl = (url: string): boolean => parseRedditPostUrl(url) !== undefined;
