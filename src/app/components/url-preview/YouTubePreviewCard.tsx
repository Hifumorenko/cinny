import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { Box, Chip, Icon, Icons, Text, as } from 'folds';
// Reuses the spoiler blur and overlay the message media content already uses.
import * as contentCss from '../message/content/style.css';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import {
  YouTubeOEmbed,
  getYouTubeEmbedUrl,
  getYouTubeOEmbed,
  getYouTubeThumbnailUrl,
  parseYouTubeUrl,
} from '../../plugins/youtube';
import * as css from './YouTubePreviewCard.css';

export const YouTubePreviewCard = as<'div', { url: string; spoiler?: boolean }>(
  ({ url, spoiler, ...props }, ref) => {
    const link = useMemo(() => parseYouTubeUrl(url), [url]);
    const [blurred, setBlurred] = useState(spoiler ?? false);
    const [playing, setPlaying] = useState(false);

    const [oEmbedState] = useAsyncCallbackValue<YouTubeOEmbed, unknown>(
      useCallback(
        () => (link ? getYouTubeOEmbed(link.id) : Promise.reject(new Error('Not a video url'))),
        [link]
      )
    );

    if (!link) return null;

    const title = oEmbedState.status === AsyncStatus.Success ? oEmbedState.data.title : undefined;
    const channel =
      oEmbedState.status === AsyncStatus.Success ? oEmbedState.data.author_name : undefined;
    const channelUrl =
      oEmbedState.status === AsyncStatus.Success ? oEmbedState.data.author_url : undefined;

    return (
      <Box {...props} ref={ref} className={css.YouTubePreview}>
        <div className={css.YouTubePreviewAccent} />
        <div className={css.YouTubePreviewContent}>
          <Text
            className={css.YouTubeTitle}
            size="T300"
            as="a"
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            <b>{title ?? link.url}</b>
          </Text>

          {channel && (
            <Text
              className={css.YouTubeChannel}
              size="T200"
              priority="300"
              truncate
              as="a"
              href={channelUrl ?? link.url}
              target="_blank"
              rel="noreferrer"
            >
              {channel}
            </Text>
          )}

          <div className={css.YouTubeMediaFrame}>
            {playing ? (
              // eslint-disable-next-line jsx-a11y/iframe-has-title
              <iframe
                className={css.YouTubeIframe}
                src={getYouTubeEmbedUrl(link.id, link.start)}
                title={title ?? 'YouTube video player'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  className={classNames(css.YouTubeThumbnail, blurred && contentCss.Blur)}
                  src={getYouTubeThumbnailUrl(link.id)}
                  alt=""
                  loading="lazy"
                />
                {blurred ? (
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
                ) : (
                  <button
                    className={css.YouTubePlayButton}
                    type="button"
                    aria-label="Play video"
                    onClick={() => setPlaying(true)}
                  >
                    <Icon size="600" src={Icons.Play} filled />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Box>
    );
  }
);
