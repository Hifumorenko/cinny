/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Avatar, Box, Icon, IconButton, Icons, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { PanBounds, clamp, usePan } from '../../hooks/usePan';
import { downloadMedia } from '../../utils/matrix';
import { UserAvatar } from '../user-avatar';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { timeHourMinute } from '../../utils/time';
import { getGalleryNavDirection } from '../../hooks/useMediaGalleryNav';

export type ImageViewerProps = {
  alt: string;
  src: string;
  /** Saved instead of `src`, for hosts that will not serve a readable copy. */
  downloadSrc?: string;
  /** Saved under this name instead of the alt text. */
  downloadName?: string;
  requestClose: () => void;
  /** Who sent it, shown top left. Omitted entirely when there is no sender to name. */
  senderId?: string;
  senderName?: string;
  /** Makes the sender name a link, e.g. to a tweet author's profile. */
  senderUrl?: string;
  avatarUrl?: string;
  timestamp?: number;
  /** What "Open in New Tab" opens, when it should not be `downloadSrc`/`src` — e.g. the tweet a photo came from, rather than the bare image file. */
  openUrl?: string;
  /** Step to the previous/next media in the room timeline. Omitted entirely when there is nothing to step through. */
  onPrev?: () => void;
  onNext?: () => void;
};

/** How much one notch of a wheel/trackpad changes the zoom level. */
const WHEEL_ZOOM_SENSITIVITY = 0.001;

/** Extra pan room past the strict edge-to-edge bound, as a fraction of the viewer's own size. */
const PAN_SLACK = 0.4;

/** Feather's "maximize" glyph — folds ships no fit-to-screen icon of its own. */
const maximizeIconSrc = (): JSX.Element => (
  <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </g>
);

export const ImageViewer = as<'div', ImageViewerProps>(
  (
    {
      className,
      alt,
      src,
      downloadSrc,
      downloadName,
      requestClose,
      senderId,
      senderName,
      senderUrl,
      avatarUrl,
      timestamp,
      openUrl,
      onPrev,
      onNext,
      ...props
    },
    ref
  ) => {
    const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
    const { zoom, setZoom, min: minZoom, max: maxZoom } = useZoom(0.2);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    /**
     * How far the image may be dragged off-center, for `targetZoom` (the
     * current zoom if omitted). `translateX`/`Y` live in pre-scale units, so
     * the on-screen (post-scale) limit is divided back down by that zoom.
     * The strict version of this bound stops an edge exactly at the middle
     * of the viewer, which reads as a hard wall — `PAN_SLACK` adds room to
     * keep pulling past that, most of the way to the screen edge, while
     * still stopping short of losing the image entirely.
     *
     * Accepts a zoom other than the current one so a caller about to change
     * zoom can clamp its pan for where the image is *headed*, before that
     * lands and `imgRect` itself reflects it — the image's on-screen rect
     * only updates once React re-renders with the new zoom, one tick behind
     * a synchronous caller like `handleWheel`.
     */
    const getBounds = (targetZoom: number = zoom): PanBounds | undefined => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return undefined;
      const containerRect = container.getBoundingClientRect();
      // The image's own rect reflects whatever zoom last actually rendered.
      // Dividing out that zoom and back in at `targetZoom` projects what the
      // rect will be once the DOM catches up — its unscaled size is
      // constant, so this holds regardless of current pan.
      const imgRect = img.getBoundingClientRect();
      const projectedWidth = (imgRect.width / zoom) * targetZoom;
      const projectedHeight = (imgRect.height / zoom) * targetZoom;
      const maxScreenX =
        Math.max(0, (projectedWidth - containerRect.width) / 2) + containerRect.width * PAN_SLACK;
      const maxScreenY =
        Math.max(0, (projectedHeight - containerRect.height) / 2) + containerRect.height * PAN_SLACK;
      return { x: maxScreenX / targetZoom, y: maxScreenY / targetZoom };
    };

    // Always active: even at zoom 1 a wide/tall image can outgrow the viewer
    // on one axis, and `getBounds` already keeps a fitting image from moving.
    const { pan, setPan, cursor, onMouseDown } = usePan(true, zoom, getBounds);

    const handleDownload = async () => {
      const fileContent = await downloadMedia(downloadSrc ?? src);
      FileSaver.saveAs(fileContent, downloadName ?? alt);
    };

    const handleWheel = (evt: React.WheelEvent) => {
      evt.preventDefault();
      // Multiplicative, not additive: scaling `zoom` by a constant ratio per
      // tick (rather than shifting it by a constant amount) keeps the
      // *percentage* change per tick the same at any zoom level, which is
      // what reads as a constant pace. An additive step feels fast when
      // zoomed out (a fixed amount is a big fraction of a small zoom) and
      // slow when zoomed in (that same fixed amount is a tiny fraction of a
      // large one).
      const newZoom = Math.min(
        maxZoom,
        Math.max(minZoom, zoom * Math.exp(-evt.deltaY * WHEEL_ZOOM_SENSITIVITY))
      );
      if (newZoom === zoom) return;

      const container = containerRef.current;
      if (!container) {
        setZoom(newZoom);
        return;
      }

      // `pan` lives in pre-scale units, so keeping the point under the cursor
      // stationary on screen means shifting it by how much the point's own
      // *scaled* offset from center just changed, converted back down into
      // those pre-scale units via the new zoom.
      const rect = container.getBoundingClientRect();
      const mouseX = evt.clientX - (rect.left + rect.width / 2);
      const mouseY = evt.clientY - (rect.top + rect.height / 2);
      const rawTranslateX = pan.translateX + mouseX * (1 / newZoom - 1 / zoom);
      const rawTranslateY = pan.translateY + mouseY * (1 / newZoom - 1 / zoom);

      // Clamp for the zoom this is headed to *before* setting it. Leaving
      // that to usePan's own post-render clamp effect meant the unclamped
      // (sometimes far out of range) pan rendered for a frame first, then
      // visibly snapped back once the effect caught up — the "teleport".
      const bounds = getBounds(newZoom);
      setPan({
        translateX: bounds ? clamp(rawTranslateX, bounds.x) : rawTranslateX,
        translateY: bounds ? clamp(rawTranslateY, bounds.y) : rawTranslateY,
      });
      setZoom(newZoom);
    };

    const handleResetZoom = () => {
      setZoom(1);
      setPan({ translateX: 0, translateY: 0 });
    };

    // Scales a too-small image up to fill the viewer. A too-large image is
    // already shrunk to fit at zoom 1 (the browser does that itself, via the
    // image's own max-width/max-height), so the ratio computed from its raw
    // natural size would come out under 1 there and shrink it further —
    // clamping to a floor of 1 keeps this a zoom *in* only, never further out.
    const handleFitToScreen = () => {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !img.naturalWidth || !img.naturalHeight) return;
      const containerRect = container.getBoundingClientRect();
      const fitZoom = Math.max(
        1,
        Math.min(containerRect.width / img.naturalWidth, containerRect.height / img.naturalHeight)
      );
      setZoom(fitZoom);
      setPan({ translateX: 0, translateY: 0 });
    };

    // Closes on a click that lands on the empty backdrop, not one that
    // bubbled up from the image (or a control) sitting on top of it.
    const handleBackdropClick = (evt: React.MouseEvent) => {
      if (evt.target === evt.currentTarget) requestClose();
    };

    // The overlay only mounts this component while it is actually open (see
    // ImageOverlay/ImageContent), so a document-level listener here is safe —
    // it cannot fire while some other part of the app has focus.
    useEffect(() => {
      const handleKeyDown = (evt: KeyboardEvent) => {
        const direction = getGalleryNavDirection(evt);
        if (direction === undefined) return;
        // Navigating closes this viewer and briefly hands focus back to
        // whatever had it before (usually the composer, via the focus trap's
        // own cleanup) before the next one opens. Without this, the browser
        // would still run its default action for the keypress — typing the
        // letter into that now-focused composer. (A second, standalone
        // shield in useMediaGalleryNav covers the rest of the gap, where
        // this listener isn't even mounted yet/anymore to catch it.)
        evt.preventDefault();
        // A held-down (or OS auto-repeating) key would otherwise fire many
        // overlapping navigations before the first even finishes.
        if (evt.repeat) return;
        if (direction === -1) onPrev?.();
        else onNext?.();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onPrev, onNext]);

    return (
      <Box className={classNames(css.ImageViewer, className)} {...props} ref={ref}>
        {senderName && (
          <Box className={css.SenderInfo} alignItems="Center" gap="200">
            <Avatar size="300">
              <UserAvatar
                userId={senderId ?? senderName}
                src={avatarUrl}
                alt={senderName}
                renderFallback={() => <Icon size="200" src={Icons.User} filled />}
              />
            </Avatar>
            <Box direction="Column" gap="0">
              {senderUrl ? (
                <Text
                  className={classNames(css.SenderText, css.SenderTextLink)}
                  size="T400"
                  truncate
                  as="a"
                  href={senderUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {senderName}
                </Text>
              ) : (
                <Text className={css.SenderText} size="T400" truncate>
                  {senderName}
                </Text>
              )}
              {typeof timestamp === 'number' && (
                <Text className={css.SenderTime} size="T200" truncate>
                  {`${timeHourMinute(timestamp, hour24Clock)} · ${dayjs(timestamp).format(
                    'MMM D, YYYY'
                  )}`}
                </Text>
              )}
            </Box>
          </Box>
        )}
        <Box className={css.TopRightControls} alignItems="Center" gap="200">
          <Box className={css.ControlIsland} alignItems="Center">
            <IconButton
              variant="SurfaceVariant"
              fill="None"
              size="400"
              radii="Pill"
              onClick={handleResetZoom}
              aria-label="Reset Zoom"
            >
              {/* "1:1" reads unambiguously as actual-size, unlike a reload-style icon. */}
              <Text style={{ color: 'white' }} size="B300">
                1:1
              </Text>
            </IconButton>
            <IconButton
              variant="SurfaceVariant"
              fill="None"
              size="400"
              radii="Pill"
              onClick={handleFitToScreen}
              aria-label="Fit to Screen"
            >
              <Icon style={{ color: 'white' }} size="100" src={maximizeIconSrc} />
            </IconButton>
            <IconButton
              variant="SurfaceVariant"
              fill="None"
              size="400"
              radii="Pill"
              onClick={handleDownload}
              aria-label="Download"
            >
              <Icon style={{ color: 'white' }} size="100" src={Icons.Download} />
            </IconButton>
            <IconButton
              as="a"
              href={openUrl ?? downloadSrc ?? src}
              target="_blank"
              rel="noreferrer"
              variant="SurfaceVariant"
              fill="None"
              size="400"
              radii="Pill"
              aria-label="Open in New Tab"
            >
              <Icon style={{ color: 'white' }} size="100" src={Icons.External} />
            </IconButton>
          </Box>
          <IconButton
            className={css.CloseButton}
            variant="SurfaceVariant"
            fill="None"
            size="400"
            radii="Pill"
            onClick={requestClose}
            aria-label="Close"
          >
            <Icon style={{ color: 'white' }} size="100" src={Icons.Cross} />
          </IconButton>
        </Box>
        {onPrev && (
          <IconButton
            className={classNames(css.NavButton, css.NavButtonPrev)}
            variant="SurfaceVariant"
            fill="None"
            size="500"
            radii="Pill"
            onClick={onPrev}
            aria-label="Previous"
          >
            <Icon style={{ color: 'white' }} size="200" src={Icons.ChevronLeft} />
          </IconButton>
        )}
        {onNext && (
          <IconButton
            className={classNames(css.NavButton, css.NavButtonNext)}
            variant="SurfaceVariant"
            fill="None"
            size="500"
            radii="Pill"
            onClick={onNext}
            aria-label="Next"
          >
            <Icon style={{ color: 'white' }} size="200" src={Icons.ChevronRight} />
          </IconButton>
        )}
        <Box
          grow="Yes"
          className={css.ImageViewerContent}
          justifyContent="Center"
          alignItems="Center"
          onWheel={handleWheel}
          onClick={handleBackdropClick}
          ref={containerRef}
        >
          <img
            ref={imgRef}
            className={css.ImageViewerImg}
            style={{
              cursor,
              transform: `scale(${zoom}) translate(${pan.translateX}px, ${pan.translateY}px)`,
            }}
            src={src}
            alt={alt}
            onMouseDown={onMouseDown}
          />
        </Box>
      </Box>
    );
  }
);
