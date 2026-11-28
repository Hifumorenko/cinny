import { useEffect, useState } from 'react';
import { getSystemNotificationPermission } from '../utils/systemNotifications';

export function useNotificationPermission(): PermissionState {
  const [permission, setPermission] = useState<PermissionState>('prompt');

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      getSystemNotificationPermission()
        .then((state) => {
          if (!disposed) setPermission(state);
        })
        .catch(() => {
          if (!disposed) setPermission('denied');
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('notification-permission-change', refresh);
    return () => {
      disposed = true;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('notification-permission-change', refresh);
    };
  }, []);

  return permission;
}

export const getNotificationState = (): PermissionState => {
  if ('Notification' in window) {
    if (window.Notification.permission === 'default') {
      return 'prompt';
    }

    return window.Notification.permission;
  }

  return 'denied';
};

export function usePermissionState(name: PermissionName, initialValue: PermissionState = 'prompt') {
  const [permissionState, setPermissionState] = useState<PermissionState>(initialValue);

  useEffect(() => {
    let permissionStatus: PermissionStatus;

    function handlePermissionChange(this: PermissionStatus) {
      setPermissionState(this.state);
    }

    navigator.permissions
      .query({ name })
      .then((permStatus: PermissionStatus) => {
        permissionStatus = permStatus;
        handlePermissionChange.apply(permStatus);
        permStatus.addEventListener('change', handlePermissionChange);
      })
      .catch(() => {
        // Silence error since FF doesn't support microphone permission
      });

    return () => {
      permissionStatus?.removeEventListener('change', handlePermissionChange);
    };
  }, [name]);

  return permissionState;
}
