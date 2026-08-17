import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

const YOUTUBE_RED = '#FF0000';

export const YouTubePreview = style([
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

export const YouTubePreviewAccent = style([
  DefaultReset,
  {
    width: toRem(4),
    flexShrink: 0,
    backgroundColor: YOUTUBE_RED,
  },
]);

export const YouTubePreviewContent = style([
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

export const YouTubeTitle = style([
  DefaultReset,
  {
    color: color.Success.Main,
    textDecoration: 'none',
    wordBreak: 'break-word',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

export const YouTubeChannel = style([
  DefaultReset,
  {
    maxWidth: '100%',
    color: 'inherit',
    textDecoration: 'none',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

/** Anchors the play button / spoiler cover, same trick as the tweet media frame. */
export const YouTubeMediaFrame = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: config.radii.R300,
    overflow: 'hidden',
    backgroundColor: 'black',
  },
]);

/** Lets Shorts fill the card while retaining their portrait shape. */
export const YouTubeShortsMediaFrame = style([
  DefaultReset,
  {
    aspectRatio: '9 / 16',
  },
]);

export const YouTubeThumbnail = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
]);

export const YouTubeIframe = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    border: 'none',
  },
]);

export const YouTubePlayButton = style([
  DefaultReset,
  {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    padding: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    cursor: 'pointer',
  },
]);
