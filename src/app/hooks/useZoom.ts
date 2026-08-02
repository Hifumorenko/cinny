import { useState } from 'react';

export const useZoom = (step: number, min = 0.1, max = 5) => {
  const [zoom, setZoom] = useState<number>(1);

  const zoomIn = () => {
    setZoom((z) => {
      const newZ = z + step;
      return newZ > max ? z : newZ;
    });
  };

  const zoomOut = () => {
    setZoom((z) => {
      const newZ = z - step;
      return newZ < min ? z : newZ;
    });
  };

  /** Same clamping as `zoomIn`/`zoomOut`, for a continuous input like a wheel. */
  const zoomBy = (delta: number) => {
    setZoom((z) => Math.min(max, Math.max(min, z + delta)));
  };

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    zoomBy,
  };
};
