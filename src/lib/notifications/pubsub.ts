type Listener = (payload: unknown) => void;

declare global {
  // eslint-disable-next-line no-var
  var __formaNotifPubSub: Map<string, Set<Listener>> | undefined;
}

function store(): Map<string, Set<Listener>> {
  if (!globalThis.__formaNotifPubSub) {
    globalThis.__formaNotifPubSub = new Map();
  }
  return globalThis.__formaNotifPubSub;
}

export function publishToUser(userId: string, payload: unknown) {
  const listeners = store().get(userId);
  if (!listeners) return;
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      // ignore
    }
  }
}

export function subscribeUser(userId: string, listener: Listener) {
  const s = store();
  const set = s.get(userId) ?? new Set<Listener>();
  set.add(listener);
  s.set(userId, set);
  return () => {
    const cur = s.get(userId);
    if (!cur) return;
    cur.delete(listener);
    if (cur.size === 0) s.delete(userId);
  };
}

