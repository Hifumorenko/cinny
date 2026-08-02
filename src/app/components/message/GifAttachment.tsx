import React, { useState } from 'react';
import classNames from 'classnames';
import { Box, Button, Chip, Icon, Icons, Spinner, Text, as } from 'folds';
import { Attachment, AttachmentBox } from './attachment';
import { ImageOverlay } from '../ImageOverlay';
import { ImageViewer } from '../image-viewer';
import * as contentCss from './content/style.css';
import * as css from './GifAttachment.css';

export type GifAttachmentProps = {
  url: string;
  outlined?: boolean;
  /** Set when the sender spoiled the link; never inferred from the gif. */
  spoiler?: boolean;
};

export const GifAttachment = as<'div', GifAttachmentProps>(
  ({ url, outlined, spoiler, ...props }, ref) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [viewer, setViewer] = useState(false);
    const [blurred, setBlurred] = useState(spoiler ?? false);

    const handleRetry = () => {
      setError(false);
      setLoaded(false);
    };

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
              {/* A button, not the image itself: the frame opens a viewer, so it needs to be a real interactive element. */}
              <button
                className={css.GifButton}
                type="button"
                // A blurred frame must not be openable in the viewer.
                disabled={blurred}
                onClick={() => setViewer(true)}
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
              </button>
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
          renderViewer={(p) => <ImageViewer {...p} />}
        />
      </Attachment>
    );
  }
);
