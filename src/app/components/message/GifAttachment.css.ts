import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

/**
 * Footprint before the gif's own size is known (or once it has failed to
 * load), so the spinner/error card has something to center in rather than
 * collapsing to zero height.
 */
const PLACEHOLDER_HEIGHT = toRem(200);

// Matches the gap the tweet/YouTube cards put between themselves and the
// message text sitting above them, since a gif embed lives alongside them.
export const GifAttachmentRoot = style([
  DefaultReset,
  {
    marginTop: config.space.S200,
  },
]);

export const GifBox = style([
  DefaultReset,
  {
    position: 'relative',
    minHeight: PLACEHOLDER_HEIGHT,
  },
]);

export const GifButton = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
]);

export const GifImage = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
]);

export const GifError = style([
  DefaultReset,
  {
    width: '100%',
    height: '100%',
    minHeight: PLACEHOLDER_HEIGHT,
    padding: toRem(16),
    textAlign: 'center',
  },
]);
