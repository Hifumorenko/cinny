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
import { parseTikTokUrl } from '../../plugins/tiktok';
import { UrlPreviewDescription } from './UrlPreview';
import * as css from './TikTokPreviewCard.css';

export const TikTokPreviewCard = as<'div', { url: string; ts: number; spoiler?: boolean }>(
  ({ url, ts, spoiler, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const link = useMemo(() => parseTikTokUrl(url), [url]);
    const [blurred, setBlurred] = useState(spoiler ?? false);
    const [previewState] = useAsyncCallbackValue<IPreviewUrlResponse, unknown>(
      useCallback(
        () =>
          link
            ? mx.getUrlPreview(link.previewUrl, ts)
            : Promise.reject(new Error('Not a TikTok url')),
        [link, mx, ts]
      )
    );

    if (!link || previewState.status === AsyncStatus.Error) return null;
    if (previewState.status !== AsyncStatus.Success) {
      return (
        <Box
          {...props}
          ref={ref}
          className={css.TikTokPreview}
          alignItems="Center"
          justifyContent="Center"
          style={{ minHeight: config.space.S700 }}
        >
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }

    const preview = previewState.data;
    const mxcImage = preview['og:image'];
    const imageUrl = mxcImage
      ? mxcUrlToHttp(mx, mxcImage, useAuthentication, 800, 1000, 'scale', false) ?? undefined
      : undefined;
    const rawVideoUrl = preview['og:video'] ?? preview['og:video:url'];
    const videoUrl =
      typeof rawVideoUrl === 'string'
        ? new URL(rawVideoUrl, link.previewUrl).toString()
        : undefined;
    const title = preview['og:title'] || 'TikTok video';

    return (
      <Box {...props} ref={ref} className={css.TikTokPreview}>
        <div className={css.TikTokPreviewAccent} />
        <div className={css.TikTokPreviewContent}>
          <Text size="T200" priority="300">
            TikTok
          </Text>
          <Text
            className={css.TikTokTitle}
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
          {(videoUrl || imageUrl) && (
            <div className={css.TikTokMediaFrame}>
              {videoUrl ? (
                <Video
                  className={classNames(css.TikTokMedia, blurred && contentCss.Blur)}
                  src={videoUrl}
                  poster={imageUrl}
                  controls={!blurred}
                  preload="metadata"
                />
              ) : (
                <img
                  className={classNames(css.TikTokMedia, blurred && contentCss.Blur)}
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
        </div>
      </Box>
    );
  }
);
