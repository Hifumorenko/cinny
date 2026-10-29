import { AvatarFallback, AvatarImage, color } from 'folds';
import React, { ReactEventHandler, ReactNode, useState } from 'react';
import classNames from 'classnames';
import * as css from './UserAvatar.css';
import colorMXID from '../../../util/colorMXID';

type UserAvatarProps = {
  className?: string;
  userId: string;
  src?: string;
  alt?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  renderFallback: () => ReactNode;
};
export function UserAvatar({
  className,
  userId,
  src,
  alt,
  referrerPolicy,
  renderFallback,
}: UserAvatarProps) {
  const [error, setError] = useState(false);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  if (!src || error) {
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(userId), color: color.Surface.Container }}
        className={classNames(css.UserAvatar, className)}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      className={classNames(css.UserAvatar, className)}
      src={src}
      alt={alt}
      referrerPolicy={referrerPolicy}
      onError={() => setError(true)}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}
