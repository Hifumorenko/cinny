import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

/** Matches the `size="400"` header the viewer puts above the image. */
const HEADER_HEIGHT = toRem(56);

/** Height follows the image rather than the modal, so no empty band is left. */
export const ImageViewer = style([
  DefaultReset,
  {
    height: 'fit-content',
  },
]);

export const ImageViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const ImageViewerContent = style([
  DefaultReset,
  {
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    overflow: 'hidden',
  },
]);

export const ImageViewerImg = style([
  DefaultReset,
  {
    objectFit: 'contain',
    // The image sizes the viewer now, so it carries the bounds itself: its own
    // ratio decides the shape, and the viewport decides how large it may get.
    // The subtraction leaves room for the header sitting above it.
    width: 'auto',
    height: 'auto',
    maxWidth: '90vw',
    maxHeight: `calc(90vh - ${HEADER_HEIGHT})`,
    backgroundColor: color.Surface.Container,
    transition: 'transform 100ms linear',
  },
]);
