import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NotificationCooldown,
  NOTIFICATION_COOLDOWN_MS,
} from '../src/app/utils/notificationCooldown.ts';
import { countNewInvitations } from '../src/app/utils/invitationNotifications.ts';

test('a suppressed toast releases its cooldown even after another message in the burst', () => {
  const cooldown = new NotificationCooldown();
  assert.equal(cooldown.take('room', 'first', 0), true);
  const token = cooldown.tokenFor('room');
  assert.equal(cooldown.take('room', 'second', 1), false);
  cooldown.release('room', token);
  assert.equal(cooldown.take('room', 'third', 2), true);
});

test('a late suppression cannot release a newer alert cooldown', () => {
  const cooldown = new NotificationCooldown();
  cooldown.take('room', 'first', 0);
  const token = cooldown.tokenFor('room');
  cooldown.take('room', 'second', NOTIFICATION_COOLDOWN_MS);
  cooldown.release('room', token);
  assert.equal(cooldown.take('room', 'third', NOTIFICATION_COOLDOWN_MS + 1), false);
});

test('a cancellation from before a reset cannot release a repeated invitation alert', () => {
  const cooldown = new NotificationCooldown();
  const inviteIds = '["!room:example.test"]';
  cooldown.take('invites', inviteIds, 0);
  const previous = cooldown.tokenFor('invites');
  cooldown.reset('invites');
  cooldown.take('invites', inviteIds, 1);
  const current = cooldown.tokenFor('invites');
  assert.notEqual(previous, current);
  cooldown.release('invites', previous);
  assert.equal(cooldown.take('invites', 'another-invite', 2), false);
  cooldown.release('invites', current);
  assert.equal(cooldown.take('invites', 'later-invite', 3), true);
});

test('a new invitation is detected even when another disappears in the same update', () => {
  assert.equal(countNewInvitations(['old-room'], ['new-room']), 1);
  assert.equal(countNewInvitations(['old-room', 'kept-room'], ['new-room']), 1);
});

test('existing invitations at startup and removals do not produce a new alert', () => {
  const initialInvites = ['first-room', 'second-room'];
  assert.equal(countNewInvitations(initialInvites, initialInvites), 0);
  assert.equal(countNewInvitations(initialInvites, ['second-room']), 0);
  assert.equal(countNewInvitations(initialInvites, []), 0);
});

test('a burst produces one alert and does not postpone the next eligible reminder', () => {
  const cooldown = new NotificationCooldown();
  assert.equal(cooldown.take('room', 'first', 0), true);
  assert.equal(cooldown.take('room', 'second', 1000), false);
  assert.equal(cooldown.take('room', 'third', NOTIFICATION_COOLDOWN_MS - 1), false);
  assert.equal(cooldown.take('room', 'fourth', NOTIFICATION_COOLDOWN_MS), true);
  assert.equal(cooldown.take('room', 'fifth', NOTIFICATION_COOLDOWN_MS + 1), false);
});

test('replaying the same event never triggers a reminder, even after five minutes', () => {
  const cooldown = new NotificationCooldown();
  assert.equal(cooldown.take('room', 'first', 0), true);
  assert.equal(cooldown.take('room', 'first', NOTIFICATION_COOLDOWN_MS * 2), false);
});

test('different conversations have independent cooldowns', () => {
  const cooldown = new NotificationCooldown();
  assert.equal(cooldown.take('first-room', 'first', 0), true);
  assert.equal(cooldown.take('second-room', 'second', 1), true);
  assert.equal(cooldown.take('first-room', 'third', 2), false);
});

test('reading a conversation makes its next message eligible immediately', () => {
  const cooldown = new NotificationCooldown();
  cooldown.take('read-room', 'first', 0);
  cooldown.take('unread-room', 'second', 0);
  cooldown.reset('read-room');
  assert.equal(cooldown.latestEvent('read-room'), undefined);
  assert.equal(cooldown.take('read-room', 'third', 1), true);
  assert.equal(cooldown.take('unread-room', 'fourth', 1), false);
});

test('read receipts must cover the latest suppressed message before resetting', () => {
  const cooldown = new NotificationCooldown();
  cooldown.take('room', 'first', 0);
  cooldown.take('room', 'second', 1);
  assert.equal(cooldown.latestEvent('room'), 'second');
});
