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
      // The Modal component's own pop-in animation is what makes stepping to
      // the next/previous media (which closes one viewer and opens another)
      // read as a jarring reopen rather than an instant swap — the base
      // (non-animated) styles already leave it fully visible, so dropping
      // the animation is a safe no-op for a first open too.
      animation: 'none',
      // Promotes this to its own compositing layer. Gallery navigation
      // mounts/unmounts this element (and the backdrop below it, and a
      // matching scrim during the swap — see useMediaGalleryNav) several
      // times in quick succession; without a layer of its own, each of those
      // has nothing to isolate it from whatever it overlaps, so the browser
      // repaints the *shared* layer underneath — the room timeline — on
      // every one, even though none of its pixels actually changed. That
      // repaint is what reads as the room flickering behind the viewer.
      transform: 'translateZ(0)',
    },
  },
});

/**
 * Same reasoning as ModalMedia's `animation: none` — without this the
 * backdrop still fades in from transparent on every navigation step, even
 * though the Modal above it no longer animates.
 */
export const OverlayBackdropNoAnimation = style({
  selectors: {
    '&&': {
      animation: 'none',
      // See ModalMedia's own `transform: translateZ(0)` — same reasoning,
      // applied to the other half of the same overlay.
      transform: 'translateZ(0)',
    },
  },
});
