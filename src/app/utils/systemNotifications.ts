import { invoke, isTauri } from '@tauri-apps/api/core';

const MAX_AVATAR_BYTES = 256 * 1024;

/** Normalize authenticated Matrix thumbnails before handing bytes to the OS. */
export async function loadNotificationAvatar(url: string): Promise<number[] | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  let bitmap: ImageBitmap | undefined;
  try {
    // Cinny's service worker adds Matrix media authentication when required.
    const response = await fetch(url, {
      signal: controller.signal,
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
    });
    if (!response.ok || !response.body) return undefined;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (size <= MAX_AVATAR_BYTES) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_AVATAR_BYTES) {
          reader.cancel().catch(() => undefined);
          return undefined;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    bitmap = await createImageBitmap(new Blob(chunks), {
      resizeWidth: 96,
      resizeHeight: 96,
      resizeQuality: 'high',
    });
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, 96, 96);
    const png = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (!png || png.size > MAX_AVATAR_BYTES) return undefined;
    return Array.from(new Uint8Array(await png.arrayBuffer()));
  } catch {
    // Avatars are optional; a missing or slow image must not prevent the toast.
    return undefined;
  } finally {
    controller.abort();
    clearTimeout(timeout);
    bitmap?.close();
  }
}

export type DesktopNotificationTarget =
  | { kind: 'test' }
  | { kind: 'invites' }
  | { kind: 'room'; roomId: string; eventId: string };

/** Explicit diagnostic toasts remain available from notification settings. */
export const canShowSystemNotification = (target: DesktopNotificationTarget): boolean =>
  target.kind === 'test' || document.visibilityState === 'hidden' || !document.hasFocus();

export const isDesktopApp = (): boolean =>
  isTauri() ||
  (window.location.protocol === 'http:' &&
    window.location.hostname === 'localhost' &&
    window.location.port === '44548');

export const getSystemNotificationPermission = async (): Promise<PermissionState> => {
  if (isDesktopApp()) {
    const granted = await invoke<boolean | null>('plugin:notification|is_permission_granted');
    if (granted === null) return 'prompt';
    return granted ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'denied';
  return window.Notification.permission === 'default' ? 'prompt' : window.Notification.permission;
};

export const requestSystemNotificationPermission = async (): Promise<void> => {
  if (isDesktopApp()) {
    await invoke('plugin:notification|request_permission');
  } else if ('Notification' in window) {
    await window.Notification.requestPermission();
  }
  window.dispatchEvent(new Event('notification-permission-change'));
};

/** Native desktop notifications have no browser Notification instance to close. */
export const showSystemNotification = async (
  title: string,
  options: NotificationOptions,
  onClick: () => void,
  target: DesktopNotificationTarget,
  shouldShow?: () => boolean,
  onSuppressed?: () => void
): Promise<Notification | undefined> => {
  const suppressed = () => {
    onSuppressed?.();
    return undefined;
  };
  if (!canShowSystemNotification(target) || (shouldShow && !shouldShow())) return suppressed();
  if (isDesktopApp()) {
    const avatarPng = options.icon ? await loadNotificationAvatar(options.icon) : undefined;
    if (!canShowSystemNotification(target) || (shouldShow && !shouldShow())) return suppressed();
    const shown = await invoke<boolean>('show_desktop_notification', {
      title,
      body: options.body ?? '',
      target,
      ...(avatarPng ? { avatarPng } : {}),
    });
    if (shown === false) return suppressed();
    return undefined;
  }

  const notification = new window.Notification(title, options);
  notification.onclick = () => {
    window.focus();
    onClick();
    notification.close();
  };
  return notification;
};
