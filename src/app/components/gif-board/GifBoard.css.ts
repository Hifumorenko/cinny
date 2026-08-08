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
  paddingBottom: config.space.S300,
});

export const GifItem = style([
  DefaultReset,
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
    top: config.space.S100,
    right: config.space.S100,
    // Above the full-tile select button so clicks always land on the star.
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: toRem(28),
    height: toRem(28),
    borderRadius: config.radii.Pill,
    border: 'none',
    cursor: 'pointer',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // Dim by default so it reads as a control without hiding the GIF; brighter
    // on hover/focus. Kept clickable at all times (no opacity: 0).
    opacity: 0.75,
    transition: 'opacity 100ms ease, background-color 100ms ease',

    selectors: {
      [`${GifItem}:hover &`]: {
        opacity: 1,
      },
      '&:hover': {
        opacity: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      },
      '&:focus-visible': {
        opacity: 1,
      },
    },
  },
]);

// Favorited tiles show a solid gold star.
export const FavBtnActive = style({
  opacity: 1,
  color: '#ffcc4d',
});

export const Footer = style({
  padding: `${config.space.S100} ${config.space.S300}`,
  borderTop: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
});
