import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import { Box, Button, Chip, Icon, Icons, Spinner, Text, as } from 'folds';
import { Attachment, AttachmentBox } from './attachment';
import { ImageOverlay } from '../ImageOverlay';
import { ImageViewer } from '../image-viewer';
import { useMediaGalleryNav } from '../../hooks/useMediaGalleryNav';
import * as contentCss from './content/style.css';
import * as css from './GifAttachment.css';

export type GifAttachmentProps = {
  url: string;
  outlined?: boolean;
  /** Set when the sender spoiled the link; never inferred from the gif. */
  spoiler?: boolean;
  /** Who sent it, shown in the viewer opened from this gif. */
  senderId?: string;
  senderName?: string;
  avatarUrl?: string;
  timestamp?: number;
};

export const GifAttachment = as<'div', GifAttachmentProps>(
  ({ url, outlined, spoiler, senderId, senderName, avatarUrl, timestamp, ...props }, ref) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [viewer, setViewer] = useState(false);
    const [blurred, setBlurred] = useState(spoiler ?? false);

    const handleRetry = () => {
      setError(false);
      setLoaded(false);
    };

    const closeViewer = useCallback(() => setViewer(false), []);
    const { onPrev, onNext } = useMediaGalleryNav(url, closeViewer);

    return (
      <Attachment {...props} ref={ref} outlined={outlined} className={css.GifAttachmentRoot}>
        <AttachmentBox className={css.GifBox}>
          {error ? (
            <Box
              className={classNames(contentCss.AbsoluteContainer, css.GifError)}
              direction="Column"
              alignItems="Center"
              justifyContent="Center"
              gap="200"
            >
              <Icon size="600" src={Icons.Warning} filled />
              <Text size="T200" priority="300">
                GIF unavailable
              </Text>
              <Button
                size="300"
                variant="Critical"
                fill="Soft"
                outlined
                radii="300"
                onClick={handleRetry}
              >
                <Text size="B300">Retry</Text>
              </Button>
            </Box>
          ) : (
            <>
              {/* A real link, not the image itself: middle/ctrl/cmd-click opens the gif in a new tab, a plain click opens the in-app viewer. */}
              <a
                className={contentCss.MediaLink}
                href={url}
                target="_blank"
                rel="noreferrer"
                // Not a navigation target while spoilered: its own click
                // handler refuses to open a blurred frame, so offering it to
                // prev/next would stall navigation on something that cannot
                // open. Revealing it puts it back in the gallery.
                data-media-nav={blurred ? undefined : url}
                onClick={(evt) => {
                  // A blurred frame must not be openable in the viewer.
                  if (blurred) {
                    evt.preventDefault();
                    return;
                  }
                  if (evt.button !== 0 || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
                  evt.preventDefault();
                  setViewer(true);
                }}
              >
                <img
                  className={classNames(css.GifImage, blurred && contentCss.Blur)}
                  src={url}
                  alt="GIF"
                  loading="lazy"
                  onLoad={() => setLoaded(true)}
                  onError={() => {
                    setLoaded(false);
                    setError(true);
                  }}
                />
              </a>
              {blurred && (
                <Box
                  className={contentCss.AbsoluteContainer}
                  alignItems="Center"
                  justifyContent="Center"
                >
                  <Chip
                    variant="Secondary"
                    radii="Pill"
                    size="500"
                    outlined
                    onClick={() => setBlurred(false)}
                  >
                    <Text size="B300">Spoiler</Text>
                  </Chip>
                </Box>
              )}
              {!loaded && !blurred && (
                <Box
                  className={contentCss.AbsoluteContainer}
                  alignItems="Center"
                  justifyContent="Center"
                >
                  <Spinner variant="Secondary" />
                </Box>
              )}
            </>
          )}
        </AttachmentBox>
        <ImageOverlay
          src={url}
          alt="GIF"
          viewer={viewer}
          requestClose={() => setViewer(false)}
          renderViewer={(p) => (
            <ImageViewer
              {...p}
              senderId={senderId}
              senderName={senderName}
              avatarUrl={avatarUrl}
              timestamp={timestamp}
              onPrev={onPrev}
              onNext={onNext}
            />
          )}
        />
      </Attachment>
    );
  }
);
