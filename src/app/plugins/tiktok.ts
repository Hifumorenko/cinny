const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'm.tiktok.com',
  'tnktok.com',
]);

export type TikTokLink = {
  id: string;
  url: string;
  previewUrl: string;
};

export const parseTikTokUrl = (url: string): TikTokLink | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!TIKTOK_HOSTS.has(host)) return undefined;

  const videoId = parsed.pathname.match(/\/video\/(\d+)/)?.[1];
  const shareId = parsed.pathname.match(/^\/(?:t\/)?([A-Za-z0-9_-]+)\/?$/)?.[1];
  const id = videoId ?? shareId;
  if (!id) return undefined;

  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  return {
    id,
    url: `https://www.tiktok.com${pathAndQuery}`,
    previewUrl: `https://tnktok.com${pathAndQuery}`,
  };
};

export const testTikTokUrl = (url: string): boolean => parseTikTokUrl(url) !== undefined;
