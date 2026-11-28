export type DesktopPresence = 'online' | 'unavailable';
export type DesktopPresenceSnapshot = { revision: number; presence: DesktopPresence };

type PresenceClient = {
  setSyncPresence: (presence?: DesktopPresence) => Promise<void>;
  getPresence: () => Promise<{ status_msg?: string | null }>;
  setPresence: (options: { presence: DesktopPresence; status_msg?: string }) => Promise<void>;
};

/** Serialize HTTP updates and coalesce rapid window transitions to the latest state. */
export function createDesktopPresenceController(
  client: PresenceClient,
  onError: (error: unknown) => void
) {
  let active = true;
  let revision = -1;
  let desired: DesktopPresence = 'online';
  let running = false;
  let pending = false;

  const flush = async () => {
    if (running) return;
    running = true;
    try {
      while (active && pending) {
        pending = false;
        const presence = desired;
        try {
          // Preserve a status message set from another client. The PUT endpoint
          // otherwise clears it when status_msg is omitted.
          // eslint-disable-next-line no-await-in-loop
          const current = await client.getPresence();
          if (!active) break;
          if (presence !== desired) {
            pending = true;
          } else {
            // eslint-disable-next-line no-await-in-loop
            await client.setPresence({ presence, status_msg: current.status_msg ?? '' });
          }
        } catch (error) {
          if (active) onError(error);
          // Sync keeps advertising the desired state even if this immediate
          // request fails (for example while offline).
        }
      }
    } finally {
      running = false;
    }
  };

  return {
    update(snapshot: DesktopPresenceSnapshot) {
      if (!active || snapshot.revision <= revision) return;
      revision = snapshot.revision;
      desired = snapshot.presence;
      client.setSyncPresence(desired).catch(onError);
      pending = true;
      flush().catch(onError);
    },
    dispose() {
      active = false;
      client.setSyncPresence(undefined).catch(onError);
    },
  };
}
