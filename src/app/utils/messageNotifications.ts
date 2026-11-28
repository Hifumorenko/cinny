import { EventType, MatrixClient, MatrixEvent, MsgType } from 'matrix-js-sdk';

export function shouldNotifyMessage(mx: MatrixClient, event: MatrixEvent): boolean {
  const details = mx.getPushDetailsForEvent(event, true);
  if (details?.actions?.notify) return true;

  // Preserve every explicit rule, including suppression rules. Default push
  // rules can leave stickers unmatched because they only cover room messages.
  if (details?.rule || event.getType() !== EventType.Sticker) return false;

  // Evaluate only a temporary copy. Preserve the sender, room, mentions, and
  // relations, including clear content when the sticker arrived encrypted.
  const message = new MatrixEvent({
    ...event.event,
    type: EventType.RoomMessage,
    content: { ...event.getContent(), msgtype: MsgType.Image },
  });
  return mx.getPushActionsForEvent(message, true)?.notify === true;
}
