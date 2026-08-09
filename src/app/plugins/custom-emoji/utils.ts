import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { ImagePack } from './ImagePack';
import { EmoteRoomsContent, ImageUsage } from './types';
import { StateEvent } from '../../../types/matrix/room';
import { getAccountData, getStateEvent, getStateEvents } from '../../utils/room';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { PackMetaReader } from './PackMetaReader';
import { PackAddress } from './PackAddress';

export function packAddressEqual(a1?: PackAddress, a2?: PackAddress): boolean {
  if (!a1 && !a2) return true;
  if (!a1 || !a2) return false;
  return a1.roomId === a2.roomId && a1.stateKey === a2.stateKey;
}

export function imageUsageEqual(u1: ImageUsage[], u2: ImageUsage[]) {
  return u1.length === u2.length && u1.every((u) => u2.includes(u));
}

export function packMetaEqual(a: PackMetaReader, b: PackMetaReader): boolean {
  return (
    a.name === b.name &&
    a.avatar === b.avatar &&
    a.attribution === b.attribution &&
    imageUsageEqual(a.usage, b.usage)
  );
}

export function makeImagePacks(packEvents: MatrixEvent[]): ImagePack[] {
  return packEvents.reduce<ImagePack[]>((imagePacks, packEvent) => {
    const packId = packEvent.getId();
    if (!packId) return imagePacks;
    imagePacks.push(ImagePack.fromMatrixEvent(packId, packEvent));
    return imagePacks;
  }, []);
}

export function getRoomImagePack(room: Room, stateKey: string): ImagePack | undefined {
  const packEvent = getStateEvent(room, StateEvent.PoniesRoomEmotes, stateKey);
  if (!packEvent) return undefined;
  const packId = packEvent.getId();
  if (!packId) return undefined;
  return ImagePack.fromMatrixEvent(packId, packEvent);
}

// Sync doesn't guarantee state event order, so packs would otherwise come
// back in a different order on every login. `origin_server_ts` is fixed at
// creation time, so sorting by it gives a stable oldest-to-newest order.
function sortPackEventsByCreation(packEvents: MatrixEvent[]): MatrixEvent[] {
  return [...packEvents].sort((a, b) => a.getTs() - b.getTs());
}

export function getRoomImagePacks(room: Room): ImagePack[] {
  const packEvents = sortPackEventsByCreation(getStateEvents(room, StateEvent.PoniesRoomEmotes));
  return makeImagePacks(packEvents);
}

export function getGlobalImagePacks(mx: MatrixClient): ImagePack[] {
  const emoteRoomsContent = getAccountData(mx, AccountDataEvent.PoniesEmoteRooms)?.getContent() as
    | EmoteRoomsContent
    | undefined;
  if (typeof emoteRoomsContent !== 'object') return [];

  const { rooms: roomIdToPackInfo } = emoteRoomsContent;
  if (typeof roomIdToPackInfo !== 'object') return [];

  const roomIds = Object.keys(roomIdToPackInfo);

  const packs = roomIds.flatMap((roomId) => {
    if (typeof roomIdToPackInfo[roomId] !== 'object') return [];
    const room = mx.getRoom(roomId);
    if (!room) return [];
    const packStateKeyToUnknown = roomIdToPackInfo[roomId];
    const packEvents = sortPackEventsByCreation(getStateEvents(room, StateEvent.PoniesRoomEmotes));
    const globalPackEvents = packEvents.filter((mE) => {
      const stateKey = mE.getStateKey();
      if (typeof stateKey === 'string') return !!packStateKeyToUnknown[stateKey];
      return false;
    });
    return makeImagePacks(globalPackEvents);
  });

  // Manually-ordered packs (see `order` in types.ts) sort first, lowest
  // order first; everything else keeps the creation-time order the flatMap
  // above already produced (Array#sort is stable, so ties fall through
  // unchanged).
  const orderOf = (pack: ImagePack): number => {
    const { address } = pack;
    if (!address) return Number.MAX_SAFE_INTEGER;
    const order = roomIdToPackInfo[address.roomId]?.[address.stateKey]?.order;
    return typeof order === 'number' ? order : Number.MAX_SAFE_INTEGER;
  };
  packs.sort((a, b) => orderOf(a) - orderOf(b));

  return packs;
}

export function getUserImagePack(mx: MatrixClient): ImagePack | undefined {
  const packEvent = getAccountData(mx, AccountDataEvent.PoniesUserEmotes);
  const userId = mx.getUserId();
  if (!packEvent || !userId) {
    return undefined;
  }

  const userImagePack = ImagePack.fromMatrixEvent(userId, packEvent);
  return userImagePack;
}
