import { IImageInfo } from '../../../types/matrix/common';

// https://github.com/Sorunome/matrix-doc/blob/soru/emotes/proposals/2545-emotes.md

/**
 * im.ponies.emote_rooms content
 */
// `order` is a client-side extension (still spec-valid, the value is only
// documented as an extensible object): the user's manual position for this
// pack within their global "Favorite Packs" list, lowest first. Packs with
// no `order` (never manually reordered) sort after ordered ones, by
// creation time.
export type PackStateKeyToObject = Record<string, { order?: number }>;
export type RoomIdToStateKey = Record<string, PackStateKeyToObject>;
export type EmoteRoomsContent = {
  rooms?: RoomIdToStateKey;
};

/**
 * Pack
 */
export enum ImageUsage {
  Emoticon = 'emoticon',
  Sticker = 'sticker',
}

export type PackImage = {
  url: string;
  body?: string;
  usage?: ImageUsage[];
  info?: IImageInfo;
};

export type PackImages = Record<string, PackImage>;

export type PackMeta = {
  display_name?: string;
  avatar_url?: string;
  attribution?: string;
  usage?: ImageUsage[];
};

export type PackContent = {
  pack?: PackMeta;
  images?: PackImages;
};
