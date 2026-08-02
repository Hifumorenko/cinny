import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

/** Subtle dark pill behind floating controls, legible over any image content. */
const FLOATING_SURFACE = 'rgba(0, 0, 0, 0.5)';

// Fills the modal, which is itself sized to the available screen space (see
// ModalMedia) — so the floating corner controls below land in the actual
// screen corners, and there is room to pan a zoomed image across the whole
// viewer rather than just the image's own, possibly much smaller, box.
export const ImageViewer = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
]);

export const SenderInfo = style([
  DefaultReset,
  {
    position: 'absolute',
    top: config.space.S300,
    left: config.space.S300,
    zIndex: 2,
    display: 'flex',
    maxWidth: `calc(100% - ${toRem(120)})`,
  },
]);

/** White with a shadow, so it reads over both bright and dark images alike. */
export const SenderText = style([
  DefaultReset,
  {
    color: 'white',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
  },
]);

/**
 * Layered on top of SenderText only when the name is actually a link (e.g.
 * to a tweet author's profile) — a plain name must not hint at being
 * clickable by underlining on hover.
 */
export const SenderTextLink = style([
  DefaultReset,
  {
    textDecoration: 'none',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

/** Dimmer than the name above it, so the two do not blend together. */
export const SenderTime = style([
  DefaultReset,
  {
    color: 'rgba(255, 255, 255, 0.7)',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
  },
]);

export const TopRightControls = style([
  DefaultReset,
  {
    position: 'absolute',
    top: config.space.S300,
    right: config.space.S300,
    zIndex: 2,
  },
]);

export const ControlIsland = style([
  DefaultReset,
  {
    display: 'flex',
    backgroundColor: FLOATING_SURFACE,
    borderRadius: config.radii.Pill,
    overflow: 'hidden',
  },
]);

export const CloseButton = style([
  DefaultReset,
  {
    backgroundColor: FLOATING_SURFACE,
  },
]);

export const NavButton = style([
  DefaultReset,
  {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    backgroundColor: FLOATING_SURFACE,
  },
]);

export const NavButtonPrev = style([
  DefaultReset,
  {
    left: config.space.S300,
  },
]);

export const NavButtonNext = style([
  DefaultReset,
  {
    right: config.space.S300,
  },
]);

export const ImageViewerContent = style([
  DefaultReset,
  {
    overflow: 'hidden',
  },
]);

export const ImageViewerImg = style([
  DefaultReset,
  {
    objectFit: 'contain',
    // Bounded by the viewer's own content box now (see ImageViewerContent),
    // not the viewport directly.
    width: 'auto',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
  },
]);
