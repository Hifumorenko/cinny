import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
  showSystemNotification,
  loadNotificationAvatar,
} from '../src/app/utils/systemNotifications.ts';

function desktop(invoke) {
  const events = [];
  globalThis.isTauri = true;
  globalThis.fetch = async () => new Response(null, { status: 404 });
  globalThis.window = {
    isTauri: true,
    __TAURI_INTERNALS__: { invoke },
    dispatchEvent: (event) => events.push(event.type),
  };
  return events;
}

test('desktop permissions use native IPC instead of browser permissions', async () => {
  desktop(async () => true);
  assert.equal(await getSystemNotificationPermission(), 'granted');
  desktop(async () => false);
  assert.equal(await getSystemNotificationPermission(), 'denied');
  desktop(async () => null);
  assert.equal(await getSystemNotificationPermission(), 'prompt');
});

test('native notifications do not construct or close browser notification objects', async () => {
  const calls = [];
  desktop(async (...args) => calls.push(args));
  const notification = await showSystemNotification(
    'Room',
    { body: 'New message', icon: 'https://example.test/private-avatar' },
    () => assert.fail('native clicks are delivered through the desktop event listener'),
    { kind: 'room', roomId: '!room:example.test', eventId: '$message' }
  );
  assert.equal(notification, undefined);
  assert.deepEqual(calls, [
    [
      'show_desktop_notification',
      {
        title: 'Room',
        body: 'New message',
        target: { kind: 'room', roomId: '!room:example.test', eventId: '$message' },
      },
      undefined,
    ],
  ]);
});

test('native delivery failures are observable by the caller', async () => {
  desktop(async () => {
    throw new Error('unavailable');
  });
  await assert.rejects(
    showSystemNotification('Room', {}, () => {}, { kind: 'invites' }),
    /unavailable/
  );
});

test('sender avatars are normalized and passed as PNG bytes, not private media URLs', async () => {
  const calls = [];
  desktop(async (...args) => calls.push(args));
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
  );
  let closed = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://example.test/_matrix/client/v1/media/thumbnail/avatar');
    assert.equal(options.referrerPolicy, 'no-referrer');
    return new Response(png);
  };
  globalThis.createImageBitmap = async (_blob, options) => {
    assert.equal(options.resizeWidth, 96);
    assert.equal(options.resizeHeight, 96);
    return {
      close: () => {
        closed = true;
      },
    };
  };
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (callback, type) => {
        assert.equal(type, 'image/png');
        callback(new Blob([png], { type }));
      },
    }),
  };
  await showSystemNotification(
    'Room',
    {
      body: 'New message',
      icon: 'https://example.test/_matrix/client/v1/media/thumbnail/avatar',
    },
    () => {},
    { kind: 'room', roomId: '!room:example.test', eventId: '$message' }
  );
  assert.deepEqual(calls[0][1].avatarPng, Array.from(png));
  assert.equal(closed, true);
  assert.equal(JSON.stringify(calls).includes('https://'), false);
});

test('oversized avatars are discarded before image decoding', async () => {
  globalThis.fetch = async () => new Response(new Uint8Array(256 * 1024 + 1));
  globalThis.createImageBitmap = () => assert.fail('oversized data must not be decoded');
  assert.equal(await loadNotificationAvatar('https://example.test/avatar'), undefined);
});

test('an invalid image still delivers a text-only toast', async () => {
  const calls = [];
  desktop(async (...args) => calls.push(args));
  globalThis.fetch = async () => new Response('not an image');
  globalThis.createImageBitmap = async () => {
    throw new Error('invalid image');
  };
  await showSystemNotification('Room', { icon: 'https://example.test/avatar' }, () => {}, {
    kind: 'test',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].avatarPng, undefined);
});

test('reading a message or disabling alerts during avatar loading cancels its pending toast', async () => {
  const calls = [];
  desktop(async (...args) => calls.push(args));
  let relevant = true;
  globalThis.fetch = async () => {
    relevant = false;
    return new Response(null, { status: 404 });
  };
  await showSystemNotification(
    'Room',
    { icon: 'https://example.test/avatar' },
    () => {},
    { kind: 'test' },
    () => relevant
  );
  assert.equal(calls.length, 0);
});

test('an already canceled notification does not start an avatar request', async () => {
  desktop(() => assert.fail('canceled notifications must not be sent'));
  globalThis.fetch = () => assert.fail('canceled notifications must not fetch avatars');
  assert.equal(
    await showSystemNotification(
      'Room',
      { icon: 'https://example.test/avatar' },
      () => {},
      { kind: 'test' },
      () => false
    ),
    undefined
  );
});

test(
  'slow avatar requests are aborted and fall back to a text notification',
  { timeout: 5000 },
  async () => {
    const calls = [];
    desktop(async (...args) => calls.push(args));
    globalThis.fetch = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    await showSystemNotification('Room', { icon: 'https://example.test/avatar' }, () => {}, {
      kind: 'test',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].avatarPng, undefined);
  }
);

test('a diagnostic toast uses native delivery without a room or invitation target', async () => {
  const calls = [];
  desktop(async (...args) => calls.push(args));
  await showSystemNotification('Cinny', { body: 'Test' }, () => {}, { kind: 'test' });
  assert.deepEqual(calls[0].slice(0, 2), [
    'show_desktop_notification',
    { title: 'Cinny', body: 'Test', target: { kind: 'test' } },
  ]);
});

test('requesting permission refreshes all mounted notification settings', async () => {
  const calls = [];
  const events = desktop(async (...args) => calls.push(args));
  await requestSystemNotificationPermission();
  assert.equal(calls[0][0], 'plugin:notification|request_permission');
  assert.deepEqual(events, ['notification-permission-change']);
});

test('the localhost release webview also uses native notifications without the Tauri marker', async () => {
  desktop(async () => true);
  window.isTauri = false;
  globalThis.isTauri = false;
  window.location = { protocol: 'http:', hostname: 'localhost', port: '44548' };
  assert.equal(await getSystemNotificationPermission(), 'granted');
});

test('browser notifications retain click navigation, focus, and dismissal', async () => {
  let focused = false;
  let navigated = false;
  let closed = false;
  class BrowserNotification {
    static permission = 'granted';
    close() {
      closed = true;
    }
  }
  globalThis.window = {
    location: { protocol: 'https:', hostname: 'example.test', port: '' },
    Notification: BrowserNotification,
    focus: () => {
      focused = true;
    },
  };
  globalThis.isTauri = false;
  assert.equal(await getSystemNotificationPermission(), 'granted');
  const notification = await showSystemNotification(
    'Room',
    {},
    () => {
      navigated = true;
    },
    { kind: 'invites' }
  );
  notification.onclick();
  assert.equal(focused, true);
  assert.equal(navigated, true);
  assert.equal(closed, true);
});
