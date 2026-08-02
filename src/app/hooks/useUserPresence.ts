import { useEffect, useMemo, useState } from 'react';
import { User, UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export enum Presence {
  Online = 'online',
  Unavailable = 'unavailable',
  Offline = 'offline',
}

export type UserPresence = {
  presence: Presence;
  status?: string;
  active: boolean;
  lastActiveTs?: number;
  /**
   * Whether the server has actually reported this user's presence at least
   * once. `presence`/`lastActiveTs` still hold usable (default) values even
   * when this is false, but they're just the SDK's untouched defaults, not
   * real data — e.g. every `User` starts as `presence: 'offline'` whether or
   * not that's true. A user who's been offline for the entirety of this
   * client's session never triggers a presence event, so this is the only
   * reliable way to tell "known offline" apart from "unknown".
   */
  known: boolean;
};

const getUserPresence = (user: User): UserPresence => ({
  presence: user.presence as Presence,
  status: user.presenceStatusMsg,
  active: user.currentlyActive,
  lastActiveTs: user.getLastActiveTs(),
  known: !!user.events.presence,
});

export const useUserPresence = (userId: string): UserPresence | undefined => {
  const mx = useMatrixClient();
  const user = mx.getUser(userId);

  const [presence, setPresence] = useState(() => (user ? getUserPresence(user) : undefined));

  useEffect(() => {
    const updatePresence: UserEventHandlerMap[UserEvent.Presence] = (event, u) => {
      if (u.userId === user?.userId) {
        setPresence(getUserPresence(user));
      }
    };
    user?.on(UserEvent.Presence, updatePresence);
    user?.on(UserEvent.CurrentlyActive, updatePresence);
    user?.on(UserEvent.LastPresenceTs, updatePresence);
    return () => {
      user?.removeListener(UserEvent.Presence, updatePresence);
      user?.removeListener(UserEvent.CurrentlyActive, updatePresence);
      user?.removeListener(UserEvent.LastPresenceTs, updatePresence);
    };
  }, [user]);

  // `/sync` only pushes a presence update when a user's state *changes*
  // while we're connected — someone who's simply been offline the whole
  // session never triggers one, so `known` above would stay false forever.
  // Ask the server directly at least once so we get a real initial value
  // instead of just waiting on a push that may never come.
  useEffect(() => {
    if (!userId || user?.events.presence) return undefined;
    let cancelled = false;
    mx.getPresence(userId)
      .then((status) => {
        if (cancelled) return;
        setPresence({
          presence: status.presence as Presence,
          status: status.status_msg,
          active: status.currently_active ?? false,
          lastActiveTs: status.last_active_ago ? Date.now() - status.last_active_ago : undefined,
          known: true,
        });
      })
      .catch(() => {
        // Presence may be disabled on the homeserver, or federation to a
        // remote user's server may be unreachable — either way, there's no
        // real data to show, so leave `known` false rather than guess.
      });
    return () => {
      cancelled = true;
    };
  }, [mx, userId, user]);

  return presence;
};

export const usePresenceLabel = (): Record<Presence, string> =>
  useMemo(
    () => ({
      [Presence.Online]: 'Online',
      [Presence.Unavailable]: 'Idle/Busy',
      [Presence.Offline]: 'Offline',
    }),
    []
  );
