import FocusTrap from 'focus-trap-react';
import { as, Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import React, { ReactNode, useRef } from 'react';
import { ModalMedia, OverlayBackdropNoAnimation } from '../styles/Modal.css';
import { stopPropagation } from '../utils/keyboard';

export type RenderViewerProps = {
  src: string;
  alt: string;
  requestClose: () => void;
};

type ImageOverlayProps = RenderViewerProps & {
  viewer: boolean;
  renderViewer: (props: RenderViewerProps) => ReactNode;
};

export const ImageOverlay = as<'div', ImageOverlayProps>(
  ({ src, alt, viewer, requestClose, renderViewer, ...props }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);

    return (
      <Overlay
        {...props}
        ref={ref}
        open={viewer}
        backdrop={<OverlayBackdrop className={OverlayBackdropNoAnimation} />}
      >
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: () => modalRef.current ?? false,
              onDeactivate: () => requestClose(),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal
              ref={modalRef}
              // Focusable only programmatically — never a tab stop of its own.
              tabIndex={-1}
              className={ModalMedia}
              size="500"
              onContextMenu={(evt: any) => evt.stopPropagation()}
            >
              {renderViewer({
                src,
                alt,
                requestClose,
              })}
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    );
  }
);
