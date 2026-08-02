import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import FocusTrap from 'focus-trap-react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { IImageInfo, MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import * as css from './style.css';
import { bytesToSize } from '../../../utils/common';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { stopPropagation } from '../../../utils/keyboard';
import { decryptFile, downloadEncryptedMedia, mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { ModalMedia, OverlayBackdropNoAnimation } from '../../../styles/Modal.css';
import { validBlurHash } from '../../../utils/blurHash';
import { useMediaGalleryNav } from '../../../hooks/useMediaGalleryNav';

type RenderViewerProps = {
  src: string;
  alt: string;
  requestClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  openUrl?: string;
  canOpenExternally?: boolean;
};
type RenderImageProps = {
  alt: string;
  title: string;
  src: string;
  onLoad: () => void;
  onError: () => void;
};
export type ImageContentProps = {
  body: string;
  mimeType?: string;
  url: string;
  info?: IImageInfo;
  encInfo?: EncryptedAttachmentInfo;
  autoPlay?: boolean;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
  /** A sticker is not a resource of its own worth opening in a new tab. */
  openInNewTab?: boolean;
  /** A sticker is not meant to be opened at all — no viewer, no new tab. */
  viewable?: boolean;
  renderViewer: (props: RenderViewerProps) => ReactNode;
  renderImage: (props: RenderImageProps) => ReactNode;
};
export const ImageContent = as<'div', ImageContentProps>(
  (
    {
      className,
      body,
      mimeType,
      url,
      info,
      encInfo,
      autoPlay,
      markedAsSpoiler,
      spoilerReason,
      openInNewTab = true,
      viewable = true,
      renderViewer,
      renderImage,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const blurHash = validBlurHash(info?.[MATRIX_BLUR_HASH_PROPERTY_NAME]);

    // The plain http(s) location of the media — used to actually fetch it
    // (and, for encrypted media, decrypt it into the blob `srcState.data`
    // ends up holding for in-app display). This is unconditional: fetching
    // needs it regardless of encryption or auth, since this app's own
    // already-logged-in code is what attaches the auth header / decrypts.
    const httpUrl = useMemo(
      // matrix-js-sdk returns `""` (not `null`) when it can't build a URL —
      // `||` catches that too, where `??` would let an empty string through
      // as if it were a valid href.
      () => mxcUrlToHttp(mx, url, useAuthentication) || undefined,
      [mx, url, useAuthentication]
    );

    // By contrast, this is the URL (if any) that's safe to hand to something
    // *outside* this app — a middle-click, "open in new tab", or a Tauri
    // build routing the link through the system shell. `httpUrl` itself
    // isn't always fit for that:
    //  - Authenticated media (MSC3916) 401s on a bare request; only this
    //    app's own already-logged-in fetch can attach the token.
    //  - Encrypted media's raw URL is undecrypted ciphertext, not a viewable
    //    image, regardless of who requests it.
    //  - `srcState.data` (the decrypted result) is a `blob:` URL in that
    //    case — fine in this webview, but the OS has no handler for `blob:`
    //    externally and falls back to an "open with" prompt instead.
    // `undefined` here means "there is no safe external link", which
    // `ImageViewer`/the thumbnail link below use to hide that action rather
    // than fall back to the in-app-only blob.
    const externalUrl = useAuthentication || encInfo ? undefined : httpUrl;

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);
    const [viewer, setViewer] = useState(false);
    const [blurred, setBlurred] = useState(markedAsSpoiler ?? false);

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(async () => {
        if (!httpUrl) throw new Error('Invalid media URL');
        if (encInfo) {
          const fileContent = await downloadEncryptedMedia(httpUrl, (encBuf) =>
            decryptFile(encBuf, mimeType ?? FALLBACK_MIMETYPE, encInfo)
          );
          return URL.createObjectURL(fileContent);
        }
        return httpUrl;
      }, [httpUrl, mimeType, encInfo])
    );

    const handleLoad = () => {
      setLoad(true);
    };
    const handleError = () => {
      setLoad(false);
      setError(true);
    };

    const handleRetry = () => {
      setError(false);
      loadSrc();
    };

    useEffect(() => {
      if (autoPlay) loadSrc();
    }, [autoPlay, loadSrc]);

    const modalRef = useRef<HTMLDivElement>(null);
    const mediaKey =
      viewable && srcState.status === AsyncStatus.Success ? srcState.data : undefined;
    const closeViewer = useCallback(() => setViewer(false), []);
    const { onPrev, onNext } = useMediaGalleryNav(mediaKey, closeViewer);

    return (
      <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
        {viewable && srcState.status === AsyncStatus.Success && (
          <Overlay
            open={viewer}
            backdrop={<OverlayBackdrop className={OverlayBackdropNoAnimation} />}
          >
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: () => modalRef.current ?? false,
                  onDeactivate: () => setViewer(false),
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
                    src: srcState.data,
                    alt: body,
                    requestClose: () => setViewer(false),
                    onPrev,
                    onNext,
                    openUrl: externalUrl,
                    canOpenExternally: !!externalUrl,
                  })}
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
        {typeof blurHash === 'string' && !load && (
          <BlurhashCanvas
            style={{ width: '100%', height: '100%' }}
            width={32}
            height={32}
            hash={blurHash}
            punch={1}
          />
        )}
        {!autoPlay && !markedAsSpoiler && srcState.status === AsyncStatus.Idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="300"
              onClick={loadSrc}
              before={<Icon size="Inherit" src={Icons.Photo} filled />}
            >
              <Text size="B300">View</Text>
            </Button>
          </Box>
        )}
        {srcState.status === AsyncStatus.Success &&
          (() => {
            const image = renderImage({
              alt: body,
              title: body,
              src: srcState.data,
              onLoad: handleLoad,
              onError: handleError,
            });

            if (!viewable) {
              return (
                <Box className={classNames(css.AbsoluteContainer, blurred && css.Blur)}>
                  {image}
                </Box>
              );
            }

            if (openInNewTab && externalUrl) {
              return (
                <Box className={classNames(css.AbsoluteContainer, blurred && css.Blur)}>
                  <a
                    className={css.MediaLink}
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-media-nav={mediaKey}
                    onClick={(evt) => {
                      // Let a middle click, or a modifier held on a plain
                      // click, open the media in a new tab like any link.
                      if (evt.button !== 0 || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
                      evt.preventDefault();
                      setViewer(true);
                    }}
                  >
                    {image}
                  </a>
                </Box>
              );
            }

            return (
              <Box className={classNames(css.AbsoluteContainer, blurred && css.Blur)}>
                <button
                  className={css.MediaButton}
                  type="button"
                  data-media-nav={mediaKey}
                  onClick={() => setViewer(true)}
                >
                  {image}
                </button>
              </Box>
            );
          })()}
        {blurred && !error && srcState.status !== AsyncStatus.Error && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                typeof spoilerReason === 'string' && (
                  <Tooltip variant="Secondary">
                    <Text>{spoilerReason}</Text>
                  </Tooltip>
                )
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Chip
                  ref={triggerRef}
                  variant="Secondary"
                  radii="Pill"
                  size="500"
                  outlined
                  onClick={() => {
                    setBlurred(false);
                    if (srcState.status === AsyncStatus.Idle) {
                      loadSrc();
                    }
                  }}
                >
                  <Text size="B300">Spoiler</Text>
                </Chip>
              )}
            </TooltipProvider>
          </Box>
        )}
        {(srcState.status === AsyncStatus.Loading || srcState.status === AsyncStatus.Success) &&
          !load &&
          !blurred && (
            <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
              <Spinner variant="Secondary" />
            </Box>
          )}
        {(error || srcState.status === AsyncStatus.Error) && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                <Tooltip variant="Critical">
                  <Text>Failed to load image!</Text>
                </Tooltip>
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Button
                  ref={triggerRef}
                  size="300"
                  variant="Critical"
                  fill="Soft"
                  outlined
                  radii="300"
                  onClick={handleRetry}
                  before={<Icon size="Inherit" src={Icons.Warning} filled />}
                >
                  <Text size="B300">Retry</Text>
                </Button>
              )}
            </TooltipProvider>
          </Box>
        )}
        {!load && typeof info?.size === 'number' && (
          <Box className={css.AbsoluteFooter} justifyContent="End" alignContent="Center" gap="200">
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{bytesToSize(info.size)}</Text>
            </Badge>
          </Box>
        )}
      </Box>
    );
  }
);
