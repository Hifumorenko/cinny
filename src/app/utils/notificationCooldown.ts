export const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

/** A reminder is only triggered by a new event, never by a timer. */
export class NotificationCooldown {
  private rooms = new Map<string, { notifiedAt: number; eventId: string }>();

  take(roomId: string, eventId: string, now = performance.now()): boolean {
    const previous = this.rooms.get(roomId);
    if (previous?.eventId === eventId) return false;

    if (previous && now - previous.notifiedAt < NOTIFICATION_COOLDOWN_MS) {
      previous.eventId = eventId;
      return false;
    }

    this.rooms.set(roomId, { notifiedAt: now, eventId });
    return true;
  }

  latestEvent(roomId: string): string | undefined {
    return this.rooms.get(roomId)?.eventId;
  }

  reset(roomId: string): void {
    this.rooms.delete(roomId);
  }
}
