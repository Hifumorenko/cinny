import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UrlPreview = style([
  DefaultReset,
  {
    width: toRem(400),
    maxWidth: '100%',
    display: 'flex',
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const UrlPreviewAccent = style([
  DefaultReset,
  {
    width: toRem(4),
    flexShrink: 0,
    backgroundColor: color.Success.Main,
  },
]);

export const UrlPreviewImg = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    maxHeight: toRem(300),
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: config.radii.R300,
    overflow: 'hidden',
    cursor: 'pointer',

    ':hover': {
      filter: 'brightness(0.8)',
    },
  },
]);

export const UrlPreviewContent = style([
  DefaultReset,
  {
    minWidth: 0,
    alignItems: 'flex-start',
    padding: `${config.space.S200} ${config.space.S400} ${config.space.S400} ${config.space.S300}`,
  },
]);

export const UrlPreviewTitle = style([DefaultReset, { color: color.Success.Main }]);

export const UrlPreviewDescription = style([
  DefaultReset,
  {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
]);
