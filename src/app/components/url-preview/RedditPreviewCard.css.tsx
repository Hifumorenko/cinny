import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const RedditPreview = style([
  DefaultReset,
  {
    marginTop: config.space.S200,
    width: toRem(400),
    maxWidth: '100%',
    display: 'flex',
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const RedditPreviewAccent = style([
  DefaultReset,
  { width: toRem(4), flexShrink: 0, backgroundColor: '#ff4500' },
]);

export const RedditPreviewContent = style([
  DefaultReset,
  {
    minWidth: 0,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: config.space.S200,
    padding: `${config.space.S200} ${config.space.S400} ${config.space.S400} ${config.space.S300}`,
  },
]);

export const RedditTitle = style([
  DefaultReset,
  {
    maxWidth: '100%',
    color: color.Success.Main,
    textDecoration: 'none',
    wordBreak: 'break-word',
    ':hover': { textDecoration: 'underline' },
  },
]);

export const RedditMediaFrame = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    maxHeight: toRem(500),
    borderRadius: config.radii.R300,
    overflow: 'hidden',
    backgroundColor: color.SurfaceVariant.ContainerActive,
  },
]);

export const RedditMedia = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    maxHeight: toRem(500),
    objectFit: 'contain',
    backgroundColor: 'black',
  },
]);
