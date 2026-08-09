import { style } from '@vanilla-extract/css';
import { color, config, toRem, DefaultReset } from 'folds';

// A Discord-style "GIF" badge instead of a plain icon glyph: a small bordered
// chip that inverts to a solid fill once its IconButton is toggled active
// (aria-pressed), instead of just the faint highlight other toolbar buttons
// get. `currentColor` follows the button's own (variant-driven) text color
// so it matches surrounding icons in both the default and disabled states.
export const GifBadge = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: toRem(20),
    height: toRem(20),
    borderRadius: config.radii.R300,
    border: `${config.borderWidth.B400} solid currentColor`,
    fontSize: toRem(8),
    fontWeight: config.fontWeight.W700,
    lineHeight: 1,

    selectors: {
      '[aria-pressed="true"] &': {
        backgroundColor: color.Surface.OnContainer,
        color: color.Surface.Container,
      },
    },
  },
]);
