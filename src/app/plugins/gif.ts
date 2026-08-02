/**
 * A direct link to a `.gif` file is rendered as an attachment instead of a
 * plain link — the same treatment Discord gives gif links.
 */
export const testGifUrl = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  return /\.gif$/i.test(parsed.pathname);
};

/**
 * A message stuffed with gif links would otherwise flood the timeline with
 * that many full-size embeds, so past this count none of them get one —
 * they fall back to a normal link (preview).
 */
export const MAX_GIF_EMBEDS = 5;
