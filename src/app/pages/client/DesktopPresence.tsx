import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { SetPresence } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { isDesktopApp } from '../../utils/systemNotifications';
import {
  createDesktopPresenceController,
  DesktopPresenceSnapshot,
} from '../../utils/desktopPresence';

export function DesktopPresence() {
  const mx = useMatrixClient();
  useEffect(() => {
    if (!isDesktopApp()) return undefined;
    const controller = createDesktopPresenceController(
      {
        setSyncPresence: (presence) => mx.setSyncPresence(presence as SetPresence | undefined),
        getPresence: () => mx.getPresence(mx.getSafeUserId()),
        setPresence: (options) => mx.setPresence(options),
      },
      console.error
    );
    // Subscribe before taking a snapshot; revision numbers reject a stale
    // response if a newer window event arrives while invoke() is pending.
    const listener = listen<DesktopPresenceSnapshot>('desktop-presence-changed', ({ payload }) => {
      controller.update(payload);
    });
    listener
      .then(() => invoke<DesktopPresenceSnapshot>('get_desktop_presence'))
      .then((snapshot) => controller.update(snapshot))
      .catch(console.error);
    return () => {
      controller.dispose();
      listener.then((unlisten) => unlisten()).catch(console.error);
    };
  }, [mx]);
  return null;
}
