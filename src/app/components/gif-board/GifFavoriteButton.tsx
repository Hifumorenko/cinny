import React from 'react';
import { Icon, Icons } from 'folds';
import classNames from 'classnames';
import * as css from './GifBoard.css';

type GifFavoriteButtonProps = {
  favorite: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * The star overlay used both on picker tiles and on GIF embeds in the timeline.
 * Swallows the click so it never falls through to the send button / media link
 * beneath it, nor reads as an outside click to any enclosing FocusTrap.
 */
export function GifFavoriteButton({ favorite, onToggle, className }: GifFavoriteButtonProps) {
  return (
    <button
      type="button"
      className={classNames(css.FavBtn, favorite && css.FavBtnActive, className)}
      onClick={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onToggle();
      }}
      aria-pressed={favorite}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Icon src={Icons.Star} filled={favorite} size="100" />
    </button>
  );
}
