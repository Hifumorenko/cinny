import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Chip, Spinner, Text, as, config } from 'folds';
import { Video } from '../media';
import { ImageOverlay } from '../ImageOverlay';
import { ImageViewer } from '../image-viewer';
import * as contentCss from '../message/content/style.css';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import { useMediaGalleryNav } from '../../hooks/useMediaGalleryNav';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import { parseRedditPostUrl } from '../../plugins/reddit';
import { UrlPreviewDescription } from './UrlPreview';
import * as css from './RedditPreviewCard.css';

const getRedditPreview = async (
  getPreview: (url: string) => Promise<IPreviewUrlResponse>,
  urls: string[]
): Promise<IPreviewUrlResponse> => {
  const [previewUrl, ...fallbackUrls] = urls;
  if (!previewUrl) throw new Error('No Reddit preview urls available');
  try {
    return await getPreview(previewUrl);
  } catch (error) {
    if (fallbackUrls.length === 0) throw error;
    return getRedditPreview(getPreview, fallbackUrls);
  }
};

type RedditPostMetadata = {
  author?: string;
  timestamp?: number;
};

const getRedditPostMetadata = async (id: string): Promise<RedditPostMetadata> => {
  const response = await fetch(
    `https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${encodeURIComponent(id)}`
  );
  if (!response.ok) throw new Error(`Reddit metadata request failed: ${response.status}`);

  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data))
    return {};
  const post: unknown = body.data[0];
  if (!post || typeof post !== 'object') return {};

  const author = 'author' in post && typeof post.author === 'string' ? post.author : undefined;
  const created =
    'created_utc' in post && typeof post.created_utc === 'number' ? post.created_utc : undefined;
  return { author, timestamp: created === undefined ? undefined : created * 1000 };
};

const firstString = (preview: IPreviewUrlResponse, keys: string[]): string | undefined => {
  const value = keys.map((key) => preview[key]).find((item) => typeof item === 'string');
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getRedditAuthor = (preview: IPreviewUrlResponse): string | undefined => {
  const metadataAuthor = firstString(preview, [
    'article:author',
    'og:article:author',
    'author',
    'twitter:creator',
  ]);
  if (metadataAuthor) {
    const username = metadataAuthor.match(/(?:^|\/)u(?:ser)?\/([\w-]+)/i)?.[1];
    return username ? `u/${username}` : metadataAuthor.replace(/^@/, 'u/');
  }

  const description = preview['og:description'];
  const siteName = preview['og:site_name'];
  const source = [siteName, description].find((value) => typeof value === 'string');
  return typeof source === 'string'
    ? source.match(/(?:posted by\s+)?(u\/[\w-]+)/i)?.[1]
    : undefined;
};

const getRedditTimestamp = (preview: IPreviewUrlResponse): number | undefined => {
  const rawTimestamp = firstString(preview, [
    'article:published_time',
    'og:article:published_time',
    'datePublished',
    'date',
  ]);
  if (!rawTimestamp) return undefined;

  const numericTimestamp = Number(rawTimestamp);
  if (Number.isFinite(numericTimestamp)) {
    return numericTimestamp < 10_000_000_000 ? numericTimestamp * 1000 : numericTimestamp;
  }
  const parsedTimestamp = Date.parse(rawTimestamp);
  return Number.isNaN(parsedTimestamp) ? undefined : parsedTimestamp;
};

export const RedditPreviewCard = as<'div', { url: string; ts: number; spoiler?: boolean }>(
  ({ url, ts, spoiler, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const link = useMemo(() => parseRedditPostUrl(url), [url]);
    const [blurred, setBlurred] = useState(spoiler ?? false);
    const [viewing, setViewing] = useState(false);
    const [previewState] = useAsyncCallbackValue<IPreviewUrlResponse, unknown>(
      useCallback(
        () =>
          link
            ? getRedditPreview((previewUrl) => mx.getUrlPreview(previewUrl, ts), link.previewUrls)
            : Promise.reject(new Error('Not a Reddit post url')),
        [link, mx, ts]
      )
    );
    const [metadataState] = useAsyncCallbackValue<RedditPostMetadata, unknown>(
      useCallback(
        () =>
          link && viewing
            ? getRedditPostMetadata(link.id)
            : Promise.reject(new Error('Reddit viewer is closed')),
        [link, viewing]
      )
    );
    const closeViewer = useCallback(() => setViewing(false), []);
    const { navKeyFor, onPrev, onNext } = useMediaGalleryNav(viewing ? 0 : undefined, closeViewer);

    if (!link || previewState.status === AsyncStatus.Error) return null;
    if (previewState.status !== AsyncStatus.Success) {
      return (
        <Box
          {...props}
          ref={ref}
          className={css.RedditPreview}
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
    const fullImageUrl = mxcImage
      ? mxcUrlToHttp(mx, mxcImage, useAuthentication) ?? undefined
      : undefined;
    const rawVideoUrl = preview['og:video'] ?? preview['og:video:url'];
    const videoUrl =
      typeof rawVideoUrl === 'string'
        ? new URL(rawVideoUrl, link.previewUrls[0]).toString()
        : undefined;
    const title = preview['og:title'] || 'Reddit post';
    const archivedMetadata =
      metadataState.status === AsyncStatus.Success ? metadataState.data : undefined;
    const author = archivedMetadata?.author
      ? `u/${archivedMetadata.author}`
      : getRedditAuthor(preview);
    const authorName = author?.match(/^u\/([\w-]+)$/i)?.[1];
    const postTimestamp = archivedMetadata?.timestamp ?? getRedditTimestamp(preview);

    return (
      <Box {...props} ref={ref} className={css.RedditPreview}>
        <div className={css.RedditPreviewAccent} />
        <div className={css.RedditPreviewContent}>
          <Text size="T200" priority="300">
            Reddit
          </Text>
          <Text
            className={css.RedditTitle}
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
            <div className={css.RedditMediaFrame}>
              {videoUrl ? (
                <Video
                  className={classNames(css.RedditMedia, blurred && contentCss.Blur)}
                  src={videoUrl}
                  poster={imageUrl}
                  controls={!blurred}
                  preload="metadata"
                />
              ) : (
                <a
                  className={contentCss.MediaLink}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  title={title}
                  data-media-nav={blurred ? undefined : navKeyFor()}
                  onClick={(event) => {
                    if (blurred) {
                      event.preventDefault();
                      return;
                    }
                    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey)
                      return;
                    event.preventDefault();
                    setViewing(true);
                  }}
                >
                  <img
                    className={classNames(css.RedditMedia, blurred && contentCss.Blur)}
                    src={imageUrl ?? ''}
                    alt={title}
                    loading="lazy"
                  />
                </a>
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
        {imageUrl && !videoUrl && viewing && (
          <ImageOverlay
            src={fullImageUrl ?? imageUrl}
            alt={title}
            viewer
            requestClose={closeViewer}
            renderViewer={(viewerProps) => (
              <ImageViewer
                {...viewerProps}
                senderId={authorName}
                senderName={author}
                senderUrl={authorName ? `https://www.reddit.com/user/${authorName}/` : undefined}
                timestamp={postTimestamp}
                openUrl={link.url}
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
