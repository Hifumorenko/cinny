import React from 'react';
import { MsgType, Room } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { config } from 'folds';
import {
  AudioContent,
  DownloadFile,
  FileContent,
  GifAttachment,
  ImageContent,
  MAudio,
  MBadEncrypted,
  MEmote,
  MFile,
  MImage,
  MLocation,
  MNotice,
  MText,
  MVideo,
  ReadPdfFile,
  ReadTextFile,
  RenderBody,
  ThumbnailContent,
  UnsupportedContent,
  VideoContent,
} from './message';
import {
  PixivPreviewCard,
  InstagramPreviewCard,
  TikTokPreviewCard,
  TweetPreviewCard,
  UrlPreviewCard,
  UrlPreviewHolder,
  YouTubePreviewCard,
} from './url-preview';
import { Image, MediaControl, Video } from './media';
import { ImageViewer } from './image-viewer';
import { PdfViewer } from './Pdf-viewer';
import { TextViewer } from './text-viewer';
import { testMatrixTo } from '../plugins/matrix-to';
import { parseTwitterStatusUrl, testTwitterStatusUrl } from '../plugins/fixupx';
import { parsePixivArtworkUrl, testPixivArtworkUrl } from '../plugins/phixiv';
import { parseYouTubeUrl, testYouTubeUrl } from '../plugins/youtube';
import { parseInstagramPostUrl, testInstagramPostUrl } from '../plugins/instagram';
import { parseTikTokUrl, testTikTokUrl } from '../plugins/tiktok';
import { MAX_GIF_EMBEDS, testGifUrl } from '../plugins/gif';
import { getSpoiledUrls } from '../utils/dom';
import { getMemberAvatarMxc, trimReplyFromBody } from '../utils/room';
import { mxcUrlToHttp } from '../utils/matrix';
import { sanitizeForRegex, URL_REG } from '../utils/regex';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useMediaAuthentication } from '../hooks/useMediaAuthentication';
import { IImageContent } from '../../types/matrix/common';

type RenderMessageContentProps = {
  displayName: string;
  msgType: string;
  ts: number;
  edited?: boolean;
  getContent: <T>() => T;
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  outlineAttachment?: boolean;
  /** Who sent it, shown in a media viewer opened from this message. */
  room?: Room;
  senderId?: string;
};
export function RenderMessageContent({
  displayName,
  msgType,
  ts,
  edited,
  getContent,
  mediaAutoLoad,
  urlPreview,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
  outlineAttachment,
  room,
  senderId,
}: RenderMessageContentProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const senderAvatarMxc = room && senderId ? getMemberAvatarMxc(room, senderId) : undefined;
  const senderAvatarUrl = senderAvatarMxc
    ? mxcUrlToHttp(mx, senderAvatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;
  // The gif link whose raw text is hidden from the message body, because its
  // own embed already shows it below. Only the first is hidden — any further
  // gif links, up to the embed cap, still show as plain text alongside their
  // own embeds. Past the cap none of them get an embed, so none get hidden
  // either.
  const { body: rawBody } = getContent<{ body?: unknown }>();
  const trimmedBody = urlPreview && typeof rawBody === 'string' ? trimReplyFromBody(rawBody) : '';
  const bodyGifUrls = [...new Set(trimmedBody.match(URL_REG) ?? [])].filter(testGifUrl);
  const hiddenGifUrl =
    bodyGifUrls.length > 0 && bodyGifUrls.length <= MAX_GIF_EMBEDS ? bodyGifUrls[0] : undefined;

  const hideGifUrlFromBody = (renderBodyProps: {
    body: string;
    customBody?: string;
  }): { body: string; customBody?: string } | undefined => {
    if (!hiddenGifUrl) return renderBodyProps;

    const escapedUrl = sanitizeForRegex(hiddenGifUrl);
    // Prefers eating a wrapping `||spoiler||` pair along with the link, so a
    // spoiled link does not leave the delimiters behind as visible clutter.
    const body = renderBodyProps.body
      .replace(new RegExp(`\\|{2}${escapedUrl}\\|{2}|${escapedUrl}`), '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    // Also drops the anchor a rich client would have wrapped the link in.
    const customBody = renderBodyProps.customBody
      ?.replace(new RegExp(`<a\\b[^>]*href="${escapedUrl}"[^>]*>[\\s\\S]*?</a>`, 'i'), '')
      .replace(new RegExp(escapedUrl), '');

    // Nothing left to show once the hidden link was the message's only content.
    if (body === '') return undefined;
    return { body, customBody };
  };

  const renderUrlsPreview = (urls: string[]) => {
    const filteredUrls = urls.filter((url) => !testMatrixTo(url));
    if (filteredUrls.length === 0) return undefined;

    // Status links and video links get their own block level embed, so they are
    // kept out of the horizontally scrolling holder the homeserver backed
    // previews live in.
    const statusUrls = filteredUrls.filter(testTwitterStatusUrl);
    const youtubeUrls = filteredUrls.filter(testYouTubeUrl);
    const pixivUrls = filteredUrls.filter(testPixivArtworkUrl);
    const instagramUrls = filteredUrls.filter(testInstagramPostUrl);
    const tikTokUrls = filteredUrls.filter(testTikTokUrl);
    // A message stuffed with gif links falls back to a normal preview for all
    // of them instead of embedding any, so the timeline is not flooded.
    const gifUrls = filteredUrls.filter(testGifUrl);
    const embedGifUrls = gifUrls.length <= MAX_GIF_EMBEDS ? gifUrls : [];
    const otherUrls = filteredUrls.filter(
      (url) =>
        !testTwitterStatusUrl(url) &&
        !testYouTubeUrl(url) &&
        !testPixivArtworkUrl(url) &&
        !testInstagramPostUrl(url) &&
        !testTikTokUrl(url) &&
        !embedGifUrls.includes(url)
    );

    // An embed stays covered when the sender spoiled the link it came from.
    // Matched on status/video id, because the url regex swallows the trailing
    // spoiler delimiters and so does not match the link text inside the span
    // verbatim.
    const { formatted_body: formattedBody } = getContent<{ formatted_body?: string }>();
    const spoiledUrls = getSpoiledUrls(
      typeof formattedBody === 'string' ? formattedBody : undefined
    );
    const spoiledStatusIds = new Set(
      Array.from(spoiledUrls, (spoiledUrl) => parseTwitterStatusUrl(spoiledUrl)?.id).filter(
        (id) => id !== undefined
      )
    );
    const spoiledYouTubeIds = new Set(
      Array.from(spoiledUrls, (spoiledUrl) => parseYouTubeUrl(spoiledUrl)?.id).filter(
        (id) => id !== undefined
      )
    );
    const spoiledPixivIds = new Set(
      Array.from(spoiledUrls, (spoiledUrl) => parsePixivArtworkUrl(spoiledUrl)?.id).filter(
        (id) => id !== undefined
      )
    );
    const spoiledInstagramIds = new Set(
      Array.from(spoiledUrls, (spoiledUrl) => parseInstagramPostUrl(spoiledUrl)?.id).filter(
        (id) => id !== undefined
      )
    );
    const spoiledTikTokIds = new Set(
      Array.from(spoiledUrls, (spoiledUrl) => parseTikTokUrl(spoiledUrl)?.id).filter(
        (id) => id !== undefined
      )
    );

    return (
      <>
        {statusUrls.map((url) => (
          <TweetPreviewCard
            key={url}
            url={url}
            spoiler={spoiledStatusIds.has(parseTwitterStatusUrl(url)?.id ?? '')}
          />
        ))}
        {youtubeUrls.map((url) => (
          <YouTubePreviewCard
            key={url}
            url={url}
            spoiler={spoiledYouTubeIds.has(parseYouTubeUrl(url)?.id ?? '')}
          />
        ))}
        {pixivUrls.map((url) => (
          <PixivPreviewCard
            key={url}
            url={url}
            ts={ts}
            spoiler={spoiledPixivIds.has(parsePixivArtworkUrl(url)?.id ?? '')}
          />
        ))}
        {instagramUrls.map((url) => (
          <InstagramPreviewCard
            key={url}
            url={url}
            ts={ts}
            spoiler={spoiledInstagramIds.has(parseInstagramPostUrl(url)?.id ?? '')}
          />
        ))}
        {tikTokUrls.map((url) => (
          <TikTokPreviewCard
            key={url}
            url={url}
            ts={ts}
            spoiler={spoiledTikTokIds.has(parseTikTokUrl(url)?.id ?? '')}
          />
        ))}
        {/* A gif has no id to canonicalize onto, so its own url is matched verbatim. */}
        {embedGifUrls.map((url) => (
          <GifAttachment
            key={url}
            url={url}
            spoiler={spoiledUrls.has(url)}
            senderId={senderId}
            senderName={displayName}
            avatarUrl={senderAvatarUrl}
            timestamp={ts}
          />
        ))}
        {otherUrls.length > 0 && (
          <UrlPreviewHolder>
            {otherUrls.map((url) => (
              <UrlPreviewCard key={url} url={url} ts={ts} />
            ))}
          </UrlPreviewHolder>
        )}
      </>
    );
  };
  const renderCaption = () => {
    const content: IImageContent = getContent();
    if (content.filename && content.filename !== content.body) {
      return (
        <MText
          style={{ marginTop: config.space.S200 }}
          edited={edited}
          content={content}
          renderBody={(props) => (
            <RenderBody
              {...props}
              highlightRegex={highlightRegex}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
            />
          )}
          renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
        />
      );
    }
    return null;
  };

  const renderFile = () => (
    <>
      <MFile
        content={getContent()}
        renderFileContent={({ body, mimeType, info, encInfo, url }) => (
          <FileContent
            body={body}
            mimeType={mimeType}
            renderAsPdfFile={() => (
              <ReadPdfFile
                body={body}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                renderViewer={(p) => <PdfViewer {...p} />}
              />
            )}
            renderAsTextFile={() => (
              <ReadTextFile
                body={body}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                renderViewer={(p) => <TextViewer {...p} />}
              />
            )}
          >
            <DownloadFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} info={info} />
          </FileContent>
        )}
        outlined={outlineAttachment}
      />
      {renderCaption()}
    </>
  );

  if (msgType === MsgType.Text) {
    return (
      <MText
        edited={edited}
        content={getContent()}
        renderBody={(props) => {
          const shownBody = hideGifUrlFromBody(props);
          if (!shownBody) return null;
          return (
            <RenderBody
              {...shownBody}
              highlightRegex={highlightRegex}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
            />
          );
        }}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Emote) {
    return (
      <MEmote
        displayName={displayName}
        edited={edited}
        content={getContent()}
        renderBody={(props) => {
          const shownBody = hideGifUrlFromBody(props);
          if (!shownBody) return null;
          return (
            <RenderBody
              {...shownBody}
              highlightRegex={highlightRegex}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
            />
          );
        }}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Notice) {
    return (
      <MNotice
        edited={edited}
        content={getContent()}
        renderBody={(props) => {
          const shownBody = hideGifUrlFromBody(props);
          if (!shownBody) return null;
          return (
            <RenderBody
              {...shownBody}
              highlightRegex={highlightRegex}
              htmlReactParserOptions={htmlReactParserOptions}
              linkifyOpts={linkifyOpts}
            />
          );
        }}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Image) {
    return (
      <>
        <MImage
          content={getContent()}
          renderImageContent={(props) => (
            <ImageContent
              {...props}
              autoPlay={mediaAutoLoad}
              renderImage={(p) => <Image {...p} loading="lazy" />}
              renderViewer={(p) => (
                <ImageViewer
                  {...p}
                  senderId={senderId}
                  senderName={displayName}
                  avatarUrl={senderAvatarUrl}
                  timestamp={ts}
                />
              )}
            />
          )}
          outlined={outlineAttachment}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <>
        <MVideo
          content={getContent()}
          renderAsFile={renderFile}
          renderVideoContent={({ body, info, ...props }) => (
            <VideoContent
              body={body}
              info={info}
              {...props}
              renderThumbnail={
                mediaAutoLoad
                  ? () => (
                      <ThumbnailContent
                        info={info}
                        renderImage={(src) => (
                          <Image alt={body} title={body} src={src} loading="lazy" />
                        )}
                      />
                    )
                  : undefined
              }
              renderVideo={(p) => <Video {...p} />}
            />
          )}
          outlined={outlineAttachment}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <>
        <MAudio
          content={getContent()}
          renderAsFile={renderFile}
          renderAudioContent={(props) => (
            <AudioContent {...props} renderMediaControl={(p) => <MediaControl {...p} />} />
          )}
          outlined={outlineAttachment}
        />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.File) {
    return renderFile();
  }

  if (msgType === MsgType.Location) {
    return <MLocation content={getContent()} />;
  }

  if (msgType === 'm.bad.encrypted') {
    return <MBadEncrypted />;
  }

  return <UnsupportedContent />;
}
