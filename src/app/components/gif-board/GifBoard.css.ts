import { style } from '@vanilla-extract/css';
import { toRem, color, config, DefaultReset, FocusOutline } from 'folds';

export const Base = style({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: toRem(432),
  width: `calc(100vw - 2 * ${config.space.S400})`,
  height: toRem(450),
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
  overflow: 'hidden',
});

export const Header = style({
  padding: config.space.S300,
  paddingBottom: config.space.S200,
});

export const Content = style({
  padding: `0 ${config.space.S300}`,
});

// Two-column masonry, like Discord's GIF picker. `columns` keeps rows of
// mixed-height GIFs tightly packed without a layout library.
export const Masonry = style({
  columnCount: 2,
  columnGap: config.space.S200,
  // Top padding so the first row's edge and hover outline aren't clipped by the
  // scroll container / hidden under the header.
  paddingTop: config.space.S200,
  paddingBottom: config.space.S300,
});

// Marker applied to any GIF container (picker tile or chat embed) so the
// favorite star can reveal itself on hover of its container, wherever it lives.
export const GifHoverArea = style({});

export const GifItem = style([
  DefaultReset,
  GifHoverArea,
  {
    position: 'relative',
    display: 'block',
    width: '100%',
    marginBottom: config.space.S200,
    breakInside: 'avoid',
    borderRadius: config.radii.R400,
    overflow: 'hidden',
    backgroundColor: color.SurfaceVariant.Container,
    lineHeight: 0,

    ':hover': {
      outline: `${config.borderWidth.B500} solid ${color.Primary.Main}`,
    },
  },
]);

// The full-tile select button; the favorite star sits above it (a button
// cannot be nested inside another button).
export const GifSelect = style([
  DefaultReset,
  FocusOutline,
  {
    display: 'block',
    width: '100%',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
]);

export const GifImg = style([
  DefaultReset,
  {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
  },
]);

export const FavBtn = style([
  DefaultReset,
  FocusOutline,
  {
    position: 'absolute',
    // Inset enough that the fade-in slide stays clear of the container's edges
    // and rounded corners (which are clipped by overflow: hidden).
    top: config.space.S200,
    left: config.space.S200,
    // Above the full-tile select button so clicks always land on the star.
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    // A generous, invisible hit area around the bare star.
    width: toRem(24),
    height: toRem(24),
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'white',
    // Drop shadow keeps the bare star legible over light GIFs (no background).
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.7))',
    // Hidden until the GIF is hovered; fades and slides down from the top,
    // Discord-style. Not interactive while hidden.
    opacity: 0,
    transform: 'translateY(-6px)',
    pointerEvents: 'none',
    willChange: 'opacity, transform',
    transition: 'opacity 150ms ease, transform 150ms ease',

    selectors: {
      [`${GifHoverArea}:hover &`]: {
        opacity: 1,
        transform: 'translateY(0)',
        pointerEvents: 'auto',
      },
      '&:focus-visible': {
        opacity: 1,
        transform: 'translateY(0)',
        pointerEvents: 'auto',
      },
    },
  },
]);

// A favorited GIF shows a solid gold star (still only while hovered).
export const FavBtnActive = style({
  color: '#ffcc4d',
});

export const Footer = style({
  padding: `${config.space.S100} ${config.space.S300}`,
  borderTop: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
});
