import { style } from '@vanilla-extract/css';

export const ModalWide = style({
  minWidth: '85vw',
  minHeight: '90vh',
});

/**
 * Fixed to the full screen, rather than shrinking to fit the media — so the
 * image viewer's corner controls land in the actual screen corners, and a
 * zoomed image has the whole viewport to pan across, not just its own box.
 * The doubled selector is there to outrank the Modal component's own
 * styling: its `size` variant caps `max-width`/`max-height` to a fixed
 * (non-viewport-relative) pixel value regardless of screen size, which must
 * be lifted or `width`/`height` below get silently clamped down to it; its
 * `variant` also draws a real border and a card background/shadow, which are
 * stripped here too — the image viewer floats directly on the darkened
 * backdrop, borderless.
 */
export const ModalMedia = style({
  selectors: {
    '&&': {
      width: '100vw',
      height: '100vh',
      maxWidth: 'none',
      maxHeight: 'none',
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      borderRadius: 0,
      overflow: 'visible',
    },
  },
});
