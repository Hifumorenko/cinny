import { MouseEventHandler, useEffect, useState } from 'react';

export type Pan = {
  translateX: number;
  translateY: number;
};

const INITIAL_PAN = {
  translateX: 0,
  translateY: 0,
};

/** Max `translateX`/`translateY` magnitude, in the same pre-scale units as `Pan`. */
export type PanBounds = {
  x: number;
  y: number;
};

export const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value));

export const usePan = (active: boolean, zoom: number, getBounds?: () => PanBounds | undefined) => {
  const [pan, setPan] = useState<Pan>(INITIAL_PAN);
  const [cursor, setCursor] = useState<'grab' | 'grabbing' | 'initial'>(
    active ? 'grab' : 'initial'
  );

  useEffect(() => {
    setCursor(active ? 'grab' : 'initial');
  }, [active]);

  // Bounds shrink as zoom changes even without a drag, so a pan that was
  // valid a moment ago can go stale — pull back in whenever that happens.
  // Deliberately runs every render: `getBounds` reads live layout (container
  // and image size), not just a value a dependency array could capture. Safe
  // from an infinite loop because the updater above returns the same object
  // when nothing actually changed, which makes React bail out of rerendering.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const bounds = getBounds?.();
    if (!bounds) return;
    setPan((p) => {
      const translateX = clamp(p.translateX, bounds.x);
      const translateY = clamp(p.translateY, bounds.y);
      if (translateX === p.translateX && translateY === p.translateY) return p;
      return { translateX, translateY };
    });
  });

  const handleMouseMove = (evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    const bounds = getBounds?.();

    setPan((p) => {
      const { translateX, translateY } = p;
      // translateX/Y live in pre-scale units, but the cursor moves in real
      // screen pixels — dividing by zoom keeps the image tracking the cursor
      // 1:1 on screen instead of moving `zoom` times faster than it.
      const mX = translateX + evt.movementX / zoom;
      const mY = translateY + evt.movementY / zoom;

      return {
        translateX: bounds ? clamp(mX, bounds.x) : mX,
        translateY: bounds ? clamp(mY, bounds.y) : mY,
      };
    });
  };

  const handleMouseUp = (evt: MouseEvent) => {
    evt.preventDefault();
    setCursor('grab');

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown: MouseEventHandler<HTMLElement> = (evt) => {
    if (!active) return;
    evt.preventDefault();
    setCursor('grabbing');

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (!active) setPan(INITIAL_PAN);
  }, [active]);

  return {
    pan,
    setPan,
    cursor,
    onMouseDown: handleMouseDown,
  };
};
