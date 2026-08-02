/* eslint-disable */
// TEMPORARY visual harness for TweetPreviewCard. Delete along with dev-tweet.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';
import './index.css';
import { darkTheme } from './colors.css';
import { TweetPreviewCard } from './app/components/url-preview/TweetPreviewCard';

document.body.classList.add(configClass, varsClass, darkTheme);
document.body.style.background = 'var(--surface-container)';
document.body.style.padding = '24px';

const PHOTO = (n: number) => ({
  type: 'photo',
  url: `https://pbs.twimg.com/media/BhxWutnCEAAtEQ6.jpg?name=orig&n=${n}`,
  width: 1920,
  height: 1080,
});

const tweet = (id: string, mediaCount: number, extra: any = {}) => ({
  code: 200,
  message: 'OK',
  tweet: {
    id,
    url: `https://x.com/TheEllenShow/status/${id}`,
    text: 'If only Bradley\'s arm was longer. Best photo ever. #oscars',
    author: {
      name: 'The Ellen Show',
      screen_name: 'TheEllenShow',
      avatar_url:
        'https://pbs.twimg.com/profile_images/1909090851592273920/UutmZxGI_200x200.jpg',
      url: 'https://x.com/TheEllenShow',
    },
    created_at: 'Mon Mar 03 03:06:13 +0000 2014',
    created_timestamp: 1393815973,
    replies: 159092,
    retweets: 2524001,
    likes: 1868750,
    views: 48200000,
    color: '#1d9bf0',
    media: {
      all: Array.from({ length: mediaCount }, (_, i) => PHOTO(i)),
    },
    ...extra,
  },
});

const FIXTURES: Record<string, any> = {
  '1': tweet('1', 1),
  '2': tweet('2', 2),
  '3': tweet('3', 3),
  '4': tweet('4', 4),
  '5': tweet('5', 0, {
    text: 'A status with no media at all, just text, to check the bare embed.',
    poll: {
      choices: [
        { label: 'Yes', count: 812, percentage: 62 },
        { label: 'No', count: 498, percentage: 38 },
      ],
      total_votes: 1310,
      time_left_en: '2 hours left',
    },
  }),
  '6': tweet('6', 1, {
    quote: {
      id: '99',
      url: 'https://x.com/jack/status/20',
      text: 'just setting up my twttr',
      author: {
        name: 'jack',
        screen_name: 'jack',
        avatar_url:
          'https://pbs.twimg.com/profile_images/1661201415899951109/y5AlKUdD_200x200.jpg',
        url: 'https://x.com/jack',
      },
      created_at: '',
      created_timestamp: 1142974214,
    },
  }),
};

window.fetch = ((input: RequestInfo | URL) => {
  const id = String(input).split('/').pop() ?? '';
  return Promise.resolve(
    new Response(JSON.stringify(FIXTURES[id]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}) as typeof fetch;

const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: 'var(--surface-on-container)', margin: '24px 0 0', fontSize: 12 }}>
    {children}
  </p>
);

createRoot(document.getElementById('root')!).render(
  <>
    <Label>1 photo</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/1" />
    <Label>2 photos</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/2" />
    <Label>3 photos</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/3" />
    <Label>4 photos</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/4" />
    <Label>no media + poll</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/5" />
    <Label>quote tweet</Label>
    <TweetPreviewCard url="https://x.com/TheEllenShow/status/6" />
  </>
);
