import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const TweetPreview = style([
  DefaultReset,
  {
    marginTop: config.space.S200,
    // Fixed rather than max width, so every embed is the same size. Matches the
    // width of a sent image attachment, so the two line up in the timeline.
    width: toRem(400),
    maxWidth: '100%',
    display: 'flex',
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const TweetPreviewAccent = style([
  DefaultReset,
  {
    width: toRem(4),
    flexShrink: 0,
  },
]);

export const TweetPreviewContent = style([
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

export const TweetAuthor = style([
  DefaultReset,
  {
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    textDecoration: 'none',
    color: 'inherit',

    ':hover': {
      textDecoration: 'underline',
    },
  },
]);

export const TweetAuthorAvatar = style([
  DefaultReset,
  {
    width: toRem(24),
    height: toRem(24),
    flexShrink: 0,
    borderRadius: config.radii.Round,
    // Fit the whole frame inside the rectangle instead of cropping to fill it.
    objectFit: 'contain',
    backgroundColor: color.SurfaceVariant.ContainerActive,
  },
]);

export const TweetText = style([
  DefaultReset,
  {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
]);

/**
 * Mirrors the mosaic layouts FixupX renders for Discord: side by side for two,
 * one tall beside a stack of two for three, and a 2x2 grid for four.
 *
 * Width is always the full content width, so every embed lines up with every
 * other one — and with the quote card, which shares that width. Height follows
 * the frame's own ratio for a lone image (set inline, since only the status
 * knows it) and falls back to the 16/9 mosaic otherwise. The cap keeps a tall
 * portrait from taking over the timeline; it sits below the 600px this client
 * allows a bare attachment because the embed also carries author text, body
 * text and a footer around the media.
 */
export const TweetMediaGrid = recipe({
  base: [
    DefaultReset,
    {
      width: '100%',
      aspectRatio: '16 / 9',
      maxHeight: toRem(500),
      display: 'grid',
      gap: toRem(4),
      borderRadius: config.radii.R300,
      overflow: 'hidden',
    },
  ],
  variants: {
    count: {
      1: {},
      2: {
        gridTemplateColumns: '1fr 1fr',
      },
      3: {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      },
      4: {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      },
    },
  },
  defaultVariants: {
    count: 1,
  },
});

/** Anchors the spoiler cover and clips the blur to the media rectangle. */
export const TweetMediaFrame = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

/** First of three media items, filling the left column beside the other two. */
export const TweetMediaItemTall = style([
  DefaultReset,
  {
    gridRow: 'span 2',
  },
]);

export const TweetMediaItem = style([
  DefaultReset,
  {
    position: 'relative',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: color.SurfaceVariant.ContainerActive,
  },
]);

export const TweetMediaButton = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    padding: 0,
    border: 'none',
    background: 'none',
    // Deliberately not a pointer: the frame opens a viewer but should not
    // advertise itself as a link.
    cursor: 'default',
  },
]);

export const TweetMediaImg = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    // Fit the whole frame inside the rectangle instead of cropping to fill it.
    objectFit: 'contain',
    objectPosition: 'center',
  },
]);

export const TweetMediaVideo = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    // Fit the whole frame inside the rectangle instead of cropping to fill it.
    objectFit: 'contain',
  },
]);

export const TweetQuote = style([
  DefaultReset,
  {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: config.space.S100,
    padding: config.space.S200,
    border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
    borderRadius: config.radii.R300,
    textDecoration: 'none',
    color: 'inherit',
  },
]);

export const TweetPollChoice = style([
  DefaultReset,
  {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: config.space.S100,
  },
]);

export const TweetPollTrack = style([
  DefaultReset,
  {
    width: '100%',
    height: toRem(6),
    borderRadius: config.radii.Pill,
    backgroundColor: color.SurfaceVariant.ContainerActive,
    overflow: 'hidden',
  },
]);

export const TweetPollFill = style([
  DefaultReset,
  {
    height: '100%',
    borderRadius: config.radii.Pill,
  },
]);

export const TweetFooter = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: config.space.S200,
  },
]);

export const TweetFooterStat = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S100,
  },
]);
