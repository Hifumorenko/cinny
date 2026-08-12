import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const TikTokPreview = style([
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

export const TikTokPreviewAccent = style([
  DefaultReset,
  {
    width: toRem(4),
    flexShrink: 0,
    background: 'linear-gradient(#25f4ee, #fe2c55)',
  },
]);

export const TikTokPreviewContent = style([
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

export const TikTokTitle = style([
  DefaultReset,
  {
    maxWidth: '100%',
    color: color.Success.Main,
    textDecoration: 'none',
    wordBreak: 'break-word',
    ':hover': { textDecoration: 'underline' },
  },
]);

export const TikTokMediaFrame = style([
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

export const TikTokMedia = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    maxHeight: toRem(500),
    objectFit: 'contain',
    backgroundColor: 'black',
  },
]);
