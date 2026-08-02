import { style } from '@vanilla-extract/css';

export const ModalWide = style({
  minWidth: '85vw',
  minHeight: '90vh',
});

/**
 * Lets a modal shrink to fit whatever it holds, so the image viewer takes the
 * media's own proportions rather than a fixed landscape box. The doubled
 * selector is there to outrank the size cap the Modal component sets on itself.
 */
export const ModalMedia = style({
  selectors: {
    '&&': {
      width: 'fit-content',
      height: 'fit-content',
      // A floor for the header's controls, so a narrow image cannot crush them.
      // Only images displayed narrower than this get a box wider than they are.
      minWidth: `min(20rem, 90vw)`,
      maxWidth: '90vw',
      maxHeight: '90vh',
    },
  },
});
