/* eslint-disable */
// TEMPORARY visual harness for PixivPreviewCard. Delete along with dev-pixiv.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MatrixClient } from 'matrix-js-sdk';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';
import './index.css';
import { darkTheme } from './colors.css';
import { MatrixClientProvider } from './app/hooks/useMatrixClient';
import { PixivPreviewCard } from './app/components/url-preview/PixivPreviewCard';

document.body.classList.add(configClass, varsClass, darkTheme);
document.body.style.background = 'var(--surface-container)';
document.body.style.padding = '24px';

// The one real, verified-working phixiv image proxy url every fixture below
// points at — a real artwork id (77850413) that's actually reachable, so the
// harness proves images load end-to-end and not just that markup renders.
const REAL_IMAGE_URL =
  'https://www.phixiv.net/i/img-master/img/2019/11/18/07/18/40/77850413_p0_master1200.jpg';

// Fake mxc registry: the real homeserver would have already downloaded the
// image and be serving it back from here on out; this stands in for that,
// mapping a fake mxc:// URI to whatever http(s) url it "downloaded".
const MXC_REGISTRY: Record<string, string> = {};
const registerMxc = (key: string, httpUrl: string): string => {
  const mxcUrl = `mxc://dev/${key}`;
  MXC_REGISTRY[mxcUrl] = httpUrl;
  return mxcUrl;
};

// Shape mirrors what the homeserver's /preview_url returns after scraping a
// phixiv.net artwork page's OpenGraph tags — `og:image` comes back as an
// mxc:// URI, not the original phixiv url, same as any other Matrix media.
const preview = (fixtureKey: string, overrides: Partial<Record<string, string | number>> = {}) => ({
  'og:title': 'SA by (@SWAV / 初画集発売中)',
  'og:description':
    '・ twitter/_SWAV_\n・ https://www.weibo.com/u/6637646526?is_all=1\n#original 10000+ bookmarks, #ReSURGUM',
  'og:image': registerMxc(fixtureKey, REAL_IMAGE_URL),
  'og:image:width': 1420,
  'og:image:height': 2000,
  'og:type': 'article',
  'og:url': 'https://www.pixiv.net/en/artworks/77850413',
  ...overrides,
});

const FIXTURES: Record<string, any> = {
  '1': preview('portrait'),
  '2': preview('landscape', { 'og:image:width': 2000, 'og:image:height': 1125 }),
  '3': preview('nodesc', { 'og:description': undefined }),
};

const fakeMx = {
  getUrlPreview: (url: string) => {
    const id = url.split('/').pop() ?? '';
    const data = FIXTURES[id];
    return data ? Promise.resolve(data) : Promise.reject(new Error('Not found'));
  },
  mxcUrlToHttp: (mxcUrl: string) => MXC_REGISTRY[mxcUrl] ?? null,
} as unknown as MatrixClient;

const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'var(--surface-on-container)', margin: '24px 0 0', fontSize: 12 }}>
    {children}
  </p>
);

createRoot(document.getElementById('root')!).render(
  <MatrixClientProvider value={fakeMx}>
    <Label>portrait artwork</Label>
    <PixivPreviewCard url="https://www.pixiv.net/en/artworks/1" ts={Date.now()} />
    <Label>landscape artwork</Label>
    <PixivPreviewCard url="https://www.pixiv.net/en/artworks/2" ts={Date.now()} />
    <Label>no description</Label>
    <PixivPreviewCard url="https://www.pixiv.net/en/artworks/3" ts={Date.now()} />
    <Label>spoilered</Label>
    <PixivPreviewCard url="https://www.pixiv.net/en/artworks/1" ts={Date.now()} spoiler />
    <Label>404 / unavailable</Label>
    <PixivPreviewCard url="https://www.pixiv.net/en/artworks/999" ts={Date.now()} />
  </MatrixClientProvider>
);
