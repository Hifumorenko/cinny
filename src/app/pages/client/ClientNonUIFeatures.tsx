import { useAtomValue, useStore } from 'jotai';
import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatrixEvent, MatrixEventEvent, Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { listen } from '@tauri-apps/api/event';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import LogoSVG from '../../../../public/res/svg/cinny.svg';
import LogoUnreadSVG from '../../../../public/res/svg/cinny-unread.svg';
import LogoHighlightSVG from '../../../../public/res/svg/cinny-highlight.svg';
import NotificationSound from '../../../../public/sound/notification.ogg';
import InviteSound from '../../../../public/sound/invite.ogg';
import { setFavicon } from '../../utils/dom';
import { NotificationCooldown } from '../../utils/notificationCooldown';
import { countNewInvitations } from '../../utils/invitationNotifications';
import {
  DesktopNotificationTarget,
  isDesktopApp,
  showSystemNotification,
} from '../../utils/systemNotifications';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useNotificationPermission } from '../../hooks/usePermission';
import { useAlive } from '../../hooks/useAlive';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getInboxInvitesPath, getInboxNotificationsPath } from '../pathUtils';
import { getMemberDisplayName, getNotificationType, isNotificationEvent } from '../../utils/room';
import { NotificationType } from '../../../types/matrix/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import {
  useInboxInvitesSelected,
  useInboxNotificationsSelected,
} from '../../hooks/router/useInbox';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { DesktopPresence } from './DesktopPresence';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function PageZoomFeature() {
  const [pageZoom] = useSetting(settingsAtom, 'pageZoom');

  if (pageZoom === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.setProperty('font-size', `calc(1em * ${pageZoom / 100})`);
  }

  return null;
}

function FaviconUpdater() {
  const roomToUnread = useAtomValue(roomToUnreadAtom);

  useEffect(() => {
    let notification = false;
    let highlight = false;
    roomToUnread.forEach((unread) => {
      if (unread.total > 0) {
        notification = true;
      }
      if (unread.highlight > 0) {
        highlight = true;
      }
    });

    if (notification) {
      setFavicon(highlight ? LogoHighlightSVG : LogoUnreadSVG);
    } else {
      setFavicon(LogoSVG);
    }
  }, [roomToUnread]);

  return null;
}

function InviteNotifications() {
  const store = useStore();
  const alive = useAlive();
  const audioRef = useRef<HTMLAudioElement>(null);
  const cooldownRef = useRef(new NotificationCooldown());
  const invites = useAtomValue(allInvitesAtom);
  const previousInvites = usePreviousValue(invites, invites);
  const mx = useMatrixClient();

  const navigate = useNavigate();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');
  const permission = useNotificationPermission();
  const invitesSelected = useInboxInvitesSelected();

  const notify = useCallback(
    (count: number) => {
      showSystemNotification(
        'Invitation',
        {
          icon: LogoSVG,
          badge: LogoSVG,
          body: `You have ${count} new invitation request.`,
          silent: true,
        },
        () => {
          if (!window.closed) navigate(getInboxInvitesPath());
        },
        { kind: 'invites' },
        () =>
          alive() &&
          store.get(settingsAtom).showNotifications &&
          cooldownRef.current.latestEvent('invites') !== undefined
      ).catch(console.error);
    },
    [alive, navigate, store]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (invites.length === 0) cooldownRef.current.reset('invites');
    if (invitesSelected && document.visibilityState !== 'hidden' && document.hasFocus()) {
      cooldownRef.current.reset('invites');
      return;
    }
    const newInvites = countNewInvitations(previousInvites, invites);
    if (newInvites > 0 && mx.getSyncState() === 'SYNCING') {
      const showPopup = showNotifications && permission === 'granted';
      if (!showPopup && !notificationSound) return;
      if (!cooldownRef.current.take('invites', JSON.stringify(invites))) return;
      if (showPopup) {
        notify(newInvites);
      }

      if (notificationSound) {
        playSound();
      }
    }
  }, [
    mx,
    invites,
    previousInvites,
    showNotifications,
    notificationSound,
    permission,
    invitesSelected,
    notify,
    playSound,
  ]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={InviteSound} type="audio/ogg" />
    </audio>
  );
}

function MessageNotifications() {
  const store = useStore();
  const alive = useAlive();
  const audioRef = useRef<HTMLAudioElement>(null);
  const notifRef = useRef<Map<string, Notification>>(new Map());
  const cooldownRef = useRef(new NotificationCooldown());
  const liveEncryptedRef = useRef(new WeakMap<MatrixEvent, Room>());
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [showNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [notificationSound] = useSetting(settingsAtom, 'isNotificationSounds');
  const permission = useNotificationPermission();

  const navigate = useNavigate();
  const notificationSelected = useInboxNotificationsSelected();
  const selectedRoomId = useSelectedRoom();
  const activeViewRef = useRef({ selectedRoomId, notificationSelected });
  activeViewRef.current = { selectedRoomId, notificationSelected };

  const notify = useCallback(
    ({
      roomName,
      senderAvatar,
      username,
      roomId,
      eventId,
    }: {
      roomName: string;
      senderAvatar?: string;
      username: string;
      roomId: string;
      eventId: string;
    }) => {
      showSystemNotification(
        roomName,
        {
          icon: senderAvatar,
          badge: senderAvatar,
          body: `New message from ${username}`,
          silent: true,
        },
        () => {
          if (!window.closed) navigate(getInboxNotificationsPath());
          notifRef.current.delete(roomId);
        },
        { kind: 'room', roomId, eventId },
        () => {
          if (!alive() || !store.get(settingsAtom).showNotifications) return false;
          const userId = mx.getUserId();
          const room = mx.getRoom(roomId);
          if (!userId || !room || room.getMyMembership() !== 'join') return false;
          if (room.hasUserReadEvent(userId, eventId)) return false;
          const view = activeViewRef.current;
          return !(
            document.visibilityState !== 'hidden' &&
            document.hasFocus() &&
            (view.selectedRoomId === roomId || view.notificationSelected)
          );
        }
      )
        .then((notification) => {
          notifRef.current.get(roomId)?.close();
          if (notification) notifRef.current.set(roomId, notification);
        })
        .catch(console.error);
    },
    [alive, mx, navigate, store]
  );

  const playSound = useCallback(() => {
    const audioElement = audioRef.current;
    audioElement?.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const notifications = notifRef.current;
    const handleReceipt: RoomEventHandlerMap[RoomEvent.Receipt] = (_event, room) => {
      const userId = mx.getUserId();
      const eventId = cooldownRef.current.latestEvent(room.roomId);
      if (!userId || !eventId || !room.hasUserReadEvent(userId, eventId)) return;
      cooldownRef.current.reset(room.roomId);
      notifications.get(room.roomId)?.close();
      notifications.delete(room.roomId);
    };
    mx.on(RoomEvent.Receipt, handleReceipt);
    return () => {
      mx.removeListener(RoomEvent.Receipt, handleReceipt);
      notifications.forEach((notification) => notification.close());
      notifications.clear();
    };
  }, [mx]);

  useEffect(() => {
    const notifyEvent = (mEvent: MatrixEvent, room: Room) => {
      if (mx.getSyncState() !== 'SYNCING') return;
      if (
        document.visibilityState !== 'hidden' &&
        document.hasFocus() &&
        (selectedRoomId === room?.roomId || notificationSelected)
      )
        return;
      if (
        room.getMyMembership() !== 'join' ||
        room.isSpaceRoom() ||
        !isNotificationEvent(mEvent) ||
        getNotificationType(mx, room.roomId) === NotificationType.Mute
      ) {
        return;
      }

      const sender = mEvent.getSender();
      const eventId = mEvent.getId();
      const userId = mx.getUserId();
      if (!sender || !eventId || !userId || sender === userId) return;
      if (room.hasUserReadEvent(userId, eventId)) return;
      if (!mx.getPushActionsForEvent(mEvent, true)?.notify) return;

      const showPopup = showNotifications && permission === 'granted';
      if (!showPopup && !notificationSound) return;
      if (!cooldownRef.current.take(room.roomId, eventId)) return;

      if (showPopup) {
        const avatarMxc =
          room.getMember(sender)?.getMxcAvatarUrl() ?? mx.getUser(sender)?.avatarUrl;
        notify({
          roomName: room.name ?? 'Unknown',
          senderAvatar: avatarMxc
            ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined
            : undefined,
          username: getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender,
          roomId: room.roomId,
          eventId,
        });
      }

      if (notificationSound) {
        playSound();
      }
    };

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      room,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (!room || !data.liveEvent || toStartOfTimeline || removed) return;
      if (mx.getSyncState() !== 'SYNCING') return;
      if (mEvent.getType() === 'm.room.encrypted') {
        liveEncryptedRef.current.set(mEvent, room);
        return;
      }
      notifyEvent(mEvent, room);
    };
    const handleDecrypted = (mEvent: MatrixEvent, error?: Error) => {
      const room = liveEncryptedRef.current.get(mEvent);
      if (!room || error) return;
      liveEncryptedRef.current.delete(mEvent);
      notifyEvent(mEvent, room);
    };
    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    mx.on(MatrixEventEvent.Decrypted, handleDecrypted);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      mx.removeListener(MatrixEventEvent.Decrypted, handleDecrypted);
    };
  }, [
    mx,
    notificationSound,
    notificationSelected,
    showNotifications,
    permission,
    playSound,
    notify,
    selectedRoomId,
    useAuthentication,
  ]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} style={{ display: 'none' }}>
      <source src={NotificationSound} type="audio/ogg" />
    </audio>
  );
}

type ClientNonUIFeaturesProps = {
  children: ReactNode;
};

function DesktopNotificationClicks() {
  const navigate = useNavigate();
  const { navigateRoom } = useRoomNavigate();
  const navigationRef = useRef({ navigate, navigateRoom });
  navigationRef.current = { navigate, navigateRoom };
  useEffect(() => {
    if (!isDesktopApp()) return undefined;
    let disposed = false;
    const listener = listen<DesktopNotificationTarget>(
      'desktop-notification-clicked',
      ({ payload }) => {
        if (disposed) return;
        if (payload.kind === 'invites') navigationRef.current.navigate(getInboxInvitesPath());
        if (payload.kind === 'room')
          navigationRef.current.navigateRoom(payload.roomId, payload.eventId);
      }
    );
    listener.catch(console.error);
    return () => {
      disposed = true;
      listener.then((unlisten) => unlisten()).catch(console.error);
    };
  }, []);
  return null;
}

export function ClientNonUIFeatures({ children }: ClientNonUIFeaturesProps) {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
      <FaviconUpdater />
      <DesktopNotificationClicks />
      <DesktopPresence />
      <InviteNotifications />
      <MessageNotifications />
      {children}
    </>
  );
}
