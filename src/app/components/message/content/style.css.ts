import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const RelativeBase = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
]);

export const AbsoluteContainer = style([
  DefaultReset,
  {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
]);

export const AbsoluteFooter = style([
  DefaultReset,
  {
    position: 'absolute',
    pointerEvents: 'none',
    bottom: config.space.S100,
    left: config.space.S100,
    right: config.space.S100,
  },
]);

export const Blur = style([
  DefaultReset,
  {
    filter: 'blur(44px)',
  },
]);

// A real link, not a button: middle/ctrl/cmd-click should open the media in
// a new tab the way any other link does, while a plain click opens it in the
// in-app viewer instead.
export const MediaLink = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: 'pointer',
  },
]);

// Same footprint as MediaLink, for media that opens the in-app viewer only —
// a sticker is not a resource of its own worth opening in a new tab.
export const MediaButton = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
    padding: 0,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
]);
