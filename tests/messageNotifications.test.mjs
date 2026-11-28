import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient, MatrixEvent } from 'matrix-js-sdk';
import { shouldNotifyMessage } from '../src/app/utils/messageNotifications.ts';
import { NotificationCooldown } from '../src/app/utils/notificationCooldown.ts';

const self = '@me:example.test';
const roomId = '!room:example.test';
const messageRule = {
  rule_id: '.m.rule.message',
  default: true,
  enabled: true,
  conditions: [{ kind: 'event_match', key: 'type', pattern: 'm.room.message' }],
  actions: ['notify'],
};

function client(rules = {}) {
  const mx = createClient({ baseUrl: 'https://example.test', userId: self });
  mx.pushRules = {
    global: { override: [], content: [], room: [], sender: [], underride: [messageRule], ...rules },
  };
  return mx;
}

function event(
  type = 'm.sticker',
  content = { body: 'Sticker', url: 'mxc://example.test/sticker' }
) {
  return new MatrixEvent({
    type,
    content,
    sender: '@other:example.test',
    room_id: roomId,
    event_id: '$sticker',
  });
}

test('a standalone sticker gets the default message notification without mutating the event', () => {
  const mx = client();
  const sticker = event();
  assert.equal(mx.getPushActionsForEvent(sticker, true)?.notify, undefined);
  const before = structuredClone(sticker.event);
  assert.equal(shouldNotifyMessage(mx, sticker), true);
  assert.deepEqual(sticker.event, before);
  assert.equal(sticker.getType(), 'm.sticker');
  assert.equal(sticker.getContent().msgtype, undefined);
});

test('messages with text, images, files, audio, video, and custom content all remain eligible', () => {
  const mx = client();
  for (const msgtype of [
    'm.text',
    'm.image',
    'm.file',
    'm.audio',
    'm.video',
    'm.emote',
    'custom.message',
  ]) {
    assert.equal(shouldNotifyMessage(mx, event('m.room.message', { msgtype })), true, msgtype);
  }
  assert.equal(
    shouldNotifyMessage(mx, event('m.sticker', { url: 'mxc://example.test/sticker' })),
    true
  );
});

test('decrypted stickers use their clear content and retain their original encrypted event', async () => {
  const mx = client();
  const sticker = event('m.room.encrypted', { ciphertext: 'encrypted' });
  await sticker.attemptDecryption({
    decryptEvent: async () => ({
      clearEvent: {
        type: 'm.sticker',
        content: { body: 'Sticker', url: 'mxc://example.test/sticker' },
      },
    }),
  });
  assert.equal(sticker.getType(), 'm.sticker');
  assert.equal(shouldNotifyMessage(mx, sticker), true);
  assert.equal(sticker.event.type, 'm.room.encrypted');
  assert.deepEqual(sticker.event.content, { ciphertext: 'encrypted' });
});

test('the sticker fallback does not enable unrelated event types', () => {
  const mx = client();
  for (const type of ['m.reaction', 'm.room.member', 'm.room.topic', 'm.room.redaction']) {
    assert.equal(shouldNotifyMessage(mx, event(type, {})), false, type);
  }
});

test('explicit sticker suppression and room mute rules are respected', () => {
  for (const conditions of [
    [{ kind: 'event_match', key: 'type', pattern: 'm.sticker' }],
    [{ kind: 'event_match', key: 'room_id', pattern: roomId }],
  ]) {
    const mx = client({
      override: [{ rule_id: 'suppressed', enabled: true, conditions, actions: [] }],
    });
    assert.equal(shouldNotifyMessage(mx, event()), false);
  }
});

test('mentions-only rooms do not receive ordinary sticker notifications', () => {
  const mx = client({ room: [{ rule_id: roomId, enabled: true, actions: [] }] });
  assert.equal(shouldNotifyMessage(mx, event()), false);
});

test('keyword matches on stickers still notify in a mentions-only room', () => {
  const mx = client({
    content: [{ rule_id: 'keyword', enabled: true, pattern: 'hello', actions: ['notify'] }],
    room: [{ rule_id: roomId, enabled: true, actions: [] }],
  });
  assert.equal(shouldNotifyMessage(mx, event('m.sticker', { body: 'hello' })), true);
  assert.equal(shouldNotifyMessage(mx, event('m.sticker', { body: 'other' })), false);
});

test('disabled default message notifications do not get bypassed by stickers', () => {
  const mx = client({ underride: [{ ...messageRule, enabled: false }] });
  assert.equal(shouldNotifyMessage(mx, event()), false);
});

test('stickers share the existing five-minute conversation cooldown', () => {
  const mx = client();
  const cooldown = new NotificationCooldown();
  assert.equal(shouldNotifyMessage(mx, event()) && cooldown.take(roomId, '$first', 0), true);
  assert.equal(shouldNotifyMessage(mx, event()) && cooldown.take(roomId, '$second', 1), false);
});
