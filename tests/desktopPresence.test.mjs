import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { createDesktopPresenceController } from '../src/app/utils/desktopPresence.ts';

function setup(overrides = {}) {
  const sync = [];
  const sent = [];
  const errors = [];
  const controller = createDesktopPresenceController(
    {
      setSyncPresence: async (presence) => {
        sync.push(presence);
      },
      getPresence: async () => ({ status_msg: 'Working' }),
      setPresence: async (options) => {
        sent.push(options);
      },
      ...overrides,
    },
    (error) => errors.push(error)
  );
  return { controller, sync, sent, errors };
}

test('away and online update sync and immediate presence without clearing status text', async () => {
  const { controller, sync, sent } = setup();
  controller.update({ revision: 1, presence: 'unavailable' });
  await setImmediate();
  controller.update({ revision: 2, presence: 'online' });
  await setImmediate();
  assert.deepEqual(sync, ['unavailable', 'online']);
  assert.deepEqual(sent, [
    { presence: 'unavailable', status_msg: 'Working' },
    { presence: 'online', status_msg: 'Working' },
  ]);
});

test('a stale initial snapshot cannot override a newer tray event', async () => {
  const { controller, sync } = setup();
  controller.update({ revision: 2, presence: 'unavailable' });
  controller.update({ revision: 1, presence: 'online' });
  controller.update({ revision: 2, presence: 'unavailable' });
  await setImmediate();
  assert.deepEqual(sync, ['unavailable']);
});

test('restoring during an in-flight update leaves online as the final state', async () => {
  let complete;
  const sent = [];
  const { controller } = setup({
    setPresence: async (options) => {
      sent.push(options.presence);
      if (sent.length === 1)
        await new Promise((resolve) => {
          complete = resolve;
        });
    },
  });
  controller.update({ revision: 1, presence: 'unavailable' });
  await setImmediate();
  controller.update({ revision: 2, presence: 'online' });
  complete();
  await setImmediate();
  assert.deepEqual(sent, ['unavailable', 'online']);
});

test('an offline immediate update still sets sync presence and allows later updates', async () => {
  const { controller, sync, errors } = setup({
    getPresence: async () => {
      throw new Error('offline');
    },
  });
  controller.update({ revision: 1, presence: 'unavailable' });
  await setImmediate();
  controller.update({ revision: 2, presence: 'online' });
  await setImmediate();
  assert.deepEqual(sync, ['unavailable', 'online']);
  assert.equal(errors.length, 2);
});

test('unmounting stops pending HTTP updates and ignores late events', async () => {
  let complete;
  const { controller, sync, sent } = setup({
    getPresence: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  controller.update({ revision: 1, presence: 'unavailable' });
  controller.dispose();
  complete({});
  controller.update({ revision: 2, presence: 'online' });
  await setImmediate();
  assert.deepEqual(sync, ['unavailable', undefined]);
  assert.deepEqual(sent, []);
});
