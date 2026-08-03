import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

const PIXIV_BLUE = '#0096fa';

export const PixivPreview = style([
  DefaultReset,
  {
    marginTop: config.space.S200,
    // Matches the tweet card's fixed width, so every embed lines up in the timeline.
    width: toRem(400),
    maxWidth: '100%',
    display: 'flex',
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const PixivPreviewAccent = style([
  DefaultReset,
  {
    width: toRem(4),
    flexShrink: 0,
    backgroundColor: PIXIV_BLUE,
  },
]);

export const PixivPreviewContent = style([
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

/** Artist byline, shown above the title — there's no avatar to pair it with (see splitPixivTitle). */
export const PixivAuthor = style([
  DefaultReset,
  {
    maxWidth: '100%',
    color: color.SurfaceVariant.OnContainer,
  },
]);

export const PixivAuthorLink = style([
  DefaultReset,
  {
    textDecoration: 'none',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

export const PixivTitle = style([
  DefaultReset,
  {
    maxWidth: '100%',
    color: 'inherit',
    textDecoration: 'none',
    wordBreak: 'break-word',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

/**
 * Anchors the spoiler cover and clips the blur to the media rectangle, same
 * trick as the tweet media frame. Sized to the artwork's own ratio (from
 * `og:image:width`/`height`) when known, so a tall or wide piece shows
 * without letterboxing; falls back to a portrait-ish ratio while that data
 * is still loading or absent.
 */
export const PixivMediaFrame = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    aspectRatio: '3 / 4',
    maxHeight: toRem(500),
    borderRadius: config.radii.R300,
    overflow: 'hidden',
    backgroundColor: color.SurfaceVariant.ContainerActive,
  },
]);

export const PixivImg = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
  },
]);
