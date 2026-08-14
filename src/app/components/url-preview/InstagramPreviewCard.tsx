import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Chip, Spinner, Text, as, config } from 'folds';
import { Video } from '../media';
import * as contentCss from '../message/content/style.css';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import { getInstagramPreviewUrl, parseInstagramPostUrl } from '../../plugins/instagram';
import { UrlPreviewDescription } from './UrlPreview';
import * as css from './InstagramPreviewCard.css';

export const InstagramPreviewCard = as<'div', { url: string; ts: number; spoiler?: boolean }>(
  ({ url, ts, spoiler, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const link = useMemo(() => parseInstagramPostUrl(url), [url]);
    const [blurred, setBlurred] = useState(spoiler ?? false);
    const [videoFailed, setVideoFailed] = useState(false);
    const previewUrl = link ? getInstagramPreviewUrl(link) : undefined;
    const [previewState] = useAsyncCallbackValue<IPreviewUrlResponse, unknown>(
      useCallback(
        () =>
          previewUrl
            ? mx.getUrlPreview(previewUrl, ts)
            : Promise.reject(new Error('Not an Instagram url')),
        [mx, previewUrl, ts]
      )
    );
    const needsFallbackImage =
      link &&
      previewState.status === AsyncStatus.Success &&
      typeof previewState.data['og:image'] !== 'string';
    const [fallbackPreviewState] = useAsyncCallbackValue<IPreviewUrlResponse, unknown>(
      useCallback(
        () =>
          needsFallbackImage && link
            ? mx.getUrlPreview(link.url, ts)
            : Promise.reject(new Error('Instagram fallback image is not needed')),
        [link, mx, needsFallbackImage, ts]
      )
    );

    if (!link || previewState.status === AsyncStatus.Error) return null;
    if (previewState.status !== AsyncStatus.Success) {
      return (
        <Box
          {...props}
          ref={ref}
          className={css.InstagramPreview}
          alignItems="Center"
          justifyContent="Center"
          style={{ minHeight: config.space.S700 }}
        >
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }

    const preview = previewState.data;
    const fallbackPreview =
      fallbackPreviewState.status === AsyncStatus.Success ? fallbackPreviewState.data : undefined;
    const mxcImage = preview['og:image'] ?? fallbackPreview?.['og:image'];
    const imageUrl = mxcImage
      ? mxcUrlToHttp(mx, mxcImage, useAuthentication, 800, 1000, 'scale', false) ?? undefined
      : undefined;
    const title = preview['og:title'] || `Instagram ${link.type === 'reel' ? 'reel' : 'post'}`;
    const rawVideoUrl = preview['og:video'] ?? preview['og:video:url'];
    const videoUrl =
      previewUrl && typeof rawVideoUrl === 'string'
        ? new URL(rawVideoUrl, previewUrl).toString()
        : undefined;
    const playableVideoUrl = videoFailed ? undefined : videoUrl;

    return (
      <Box {...props} ref={ref} className={css.InstagramPreview}>
        <div className={css.InstagramPreviewAccent} />
        <div className={css.InstagramPreviewContent}>
          <Text size="T200" priority="300">
            Instagram
          </Text>
          <Text
            className={css.InstagramTitle}
            size="T300"
            as="a"
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            <b>{title}</b>
          </Text>
          {preview['og:description'] && (
            <Text size="T200" priority="300">
              <UrlPreviewDescription>{preview['og:description']}</UrlPreviewDescription>
            </Text>
          )}
          {(playableVideoUrl || imageUrl) && (
            <div className={css.InstagramMediaFrame}>
              {playableVideoUrl ? (
                <Video
                  className={classNames(css.InstagramVideo, blurred && contentCss.Blur)}
                  src={playableVideoUrl}
                  poster={imageUrl}
                  controls={!blurred}
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                  onLoadedMetadata={(event) => {
                    const { duration } = event.currentTarget;
                    if (!Number.isFinite(duration) || duration <= 0) setVideoFailed(true);
                  }}
                />
              ) : (
                <img
                  className={classNames(css.InstagramImg, blurred && contentCss.Blur)}
                  src={imageUrl ?? ''}
                  alt={title}
                  loading="lazy"
                />
              )}
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
            </div>
          )}
          {videoFailed && (
            <Text size="T200" priority="300" role="status">
              {imageUrl
                ? 'Video could not be loaded. Showing the thumbnail instead.'
                : 'Video could not be loaded. Open the post on Instagram to watch it.'}
            </Text>
          )}
        </div>
      </Box>
    );
  }
);
