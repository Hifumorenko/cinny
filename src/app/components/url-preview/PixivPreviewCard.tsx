import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Chip, Spinner, Text, as, config } from 'folds';
import { ImageOverlay } from '../ImageOverlay';
import { ImageViewer } from '../image-viewer';
import { useMediaGalleryNav } from '../../hooks/useMediaGalleryNav';
import { UrlPreviewDescription } from './UrlPreview';
// Reuses the spoiler blur and overlay the message media content already uses.
import * as contentCss from '../message/content/style.css';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import {
  getPixivArtworkUrl,
  getPixivOriginalFileName,
  getPixivOriginalImageUrls,
  parsePixivArtworkUrl,
  splitPixivTitle,
} from '../../plugins/phixiv';
import * as css from './PixivPreviewCard.css';

export const PixivPreviewCard = as<'div', { url: string; ts: number; spoiler?: boolean }>(
  ({ url, ts, spoiler, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const link = useMemo(() => parsePixivArtworkUrl(url), [url]);
    const [blurred, setBlurred] = useState(spoiler ?? false);
    const [viewing, setViewing] = useState(false);

    // Fetched through the homeserver's own scraper (like any other link
    // preview) rather than a direct client-side request, because — unlike
    // FixupX — Phixiv exposes no CORS-enabled JSON API a browser could call
    // directly.
    const [previewState] = useAsyncCallbackValue<IPreviewUrlResponse, unknown>(
      useCallback(
        () =>
          link ? mx.getUrlPreview(link.url, ts) : Promise.reject(new Error('Not an artwork url')),
        [link, mx, ts]
      )
    );

    const success = previewState.status === AsyncStatus.Success;
    // `og:image` comes back as an mxc:// URI — the homeserver already
    // downloaded it server-side — so it has to go through the same
    // mxc-to-http conversion as any other Matrix media before it is fit to
    // put in an <img src>.
    const mxcImage = success ? previewState.data['og:image'] : undefined;
    // Bounded to roughly the card's own display size; the full-resolution
    // file (requested unsized, only when the viewer actually opens) is what
    // was making this slow to appear at all.
    const imageUrl = mxcImage
      ? mxcUrlToHttp(mx, mxcImage, useAuthentication, 800, 1200, 'scale', false) ?? undefined
      : undefined;
    const fullImageUrl = mxcImage
      ? mxcUrlToHttp(mx, mxcImage, useAuthentication) ?? undefined
      : undefined;

    const closeViewer = useCallback(() => setViewing(false), []);
    const { navKeyFor, onPrev, onNext } = useMediaGalleryNav(viewing ? 0 : undefined, closeViewer);

    if (!link || previewState.status === AsyncStatus.Error) return null;

    if (!success) {
      return (
        <Box
          {...props}
          ref={ref}
          className={css.PixivPreview}
          alignItems="Center"
          justifyContent="Center"
          style={{ minHeight: config.space.S700 }}
        >
          <Spinner variant="Secondary" size="400" />
        </Box>
      );
    }

    const preview = previewState.data;
    const { title, author } = splitPixivTitle(preview['og:title'] || link.url);
    const width = preview['og:image:width'];
    const height = preview['og:image:height'];
    const ratio = width && height ? `${width} / ${height}` : undefined;
    const postUrl = getPixivArtworkUrl(link.id);
    const originalImageUrls = getPixivOriginalImageUrls(link.id);

    return (
      <Box {...props} ref={ref} className={css.PixivPreview}>
        <div className={css.PixivPreviewAccent} />
        <div className={css.PixivPreviewContent}>
          {author && (
            <Text
              className={classNames(css.PixivAuthor, css.PixivAuthorLink)}
              size="T300"
              truncate
              as="a"
              // Phixiv only bakes the artist's name into `og:title`, never
              // their numeric pixiv user id (and the id-bearing tags on its
              // page are ones the homeserver's OG scraper doesn't read), so
              // there's no way to link straight to their profile. This opens
              // the real pixiv post instead, where that profile link is one
              // click away and guaranteed correct — better than guessing a
              // profile url from the name alone and risking sending someone
              // to the wrong account.
              href={postUrl}
              target="_blank"
              rel="noreferrer"
            >
              <b>{author}</b>
            </Text>
          )}
          <Text
            className={css.PixivTitle}
            size="T300"
            as="a"
            href={postUrl}
            target="_blank"
            rel="noreferrer"
          >
            {title}
          </Text>

          {imageUrl && (
            <div className={css.PixivMediaFrame} style={ratio ? { aspectRatio: ratio } : undefined}>
              <a
                className={contentCss.MediaLink}
                // Deliberately the pixiv post, not `fullImageUrl`/`imageUrl`:
                // those are the homeserver's own mxc-derived media urls, an
                // implementation detail that shouldn't leak out through a
                // middle-click/ctrl-click or "copy link" — unlike the tweet
                // media grid, which links straight to a public CDN file
                // because FixupX hands back one directly, this has no such
                // url to offer.
                href={postUrl}
                target="_blank"
                rel="noreferrer"
                title={title}
                // Not a navigation target while spoilered, same reasoning as
                // the tweet media grid: a blurred frame must not open, and
                // revealing it is what puts it back in the gallery.
                data-media-nav={blurred ? undefined : navKeyFor()}
                onClick={(evt) => {
                  if (blurred) {
                    evt.preventDefault();
                    return;
                  }
                  if (evt.button !== 0 || evt.ctrlKey || evt.metaKey || evt.shiftKey) return;
                  evt.preventDefault();
                  setViewing(true);
                }}
              >
                <img
                  className={classNames(css.PixivImg, blurred && contentCss.Blur)}
                  src={imageUrl}
                  alt={title}
                  loading="lazy"
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
            </div>
          )}

          {preview['og:description'] && (
            <Text size="T200" priority="300">
              <UrlPreviewDescription>{preview['og:description']}</UrlPreviewDescription>
            </Text>
          )}
        </div>

        {imageUrl && viewing && (
          <ImageOverlay
            src={fullImageUrl ?? imageUrl}
            alt={title}
            viewer
            requestClose={closeViewer}
            renderViewer={(p) => (
              <ImageViewer
                {...p}
                // Saves the artwork at its original resolution rather than the
                // 1200px derivative every mxc-backed url here is capped at —
                // see `getPixivOriginalImageUrls`. The viewer keeps
                // *displaying* the mxc copy, which is already cached and enough
                // to fill a screen; pulling an original that can run to tens of
                // megabytes is worth it only when actually asked to save one.
                // The viewer falls back to that displayed copy if none resolve.
                downloadSrc={originalImageUrls}
                // Pixiv's own name for the file, so a saved artwork carries the
                // id that leads back to the post. The extension is appended
                // from the downloaded bytes, the only thing that knows whether
                // this particular work is a png or a jpg.
                downloadName={getPixivOriginalFileName(link.id)}
                // No avatar or upload-date field survives to a browser here —
                // Phixiv bakes only the username into `og:title`, and its old
                // JSON API that carried the rest was retired.
                senderName={author}
                // Same fallback as the card's own byline: no numeric user id
                // to link straight to their profile with, so this opens the
                // real pixiv post instead, one click from it.
                senderUrl={author ? postUrl : undefined}
                openUrl={postUrl}
                onPrev={onPrev}
                onNext={onNext}
              />
            )}
          />
        )}
      </Box>
    );
  }
);
