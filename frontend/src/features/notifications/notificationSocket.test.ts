import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// notificationSocket hoiab olekut mooduli tasemel → iga test impordib värskelt.
async function loadModule() {
  vi.resetModules();
  return import('./notificationSocket');
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.onclose?.();
  }

  // testi-abid
  open() {
    this.onopen?.();
  }

  emit(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  vi.stubGlobal('window', {
    location: { protocol: 'https:', host: 'dev.example.ee' },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('notificationSocket', () => {
  it('avab ühe ühenduse mitme subscriber jaoks ja sama-origin /api teele', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un1 = subscribeToNotificationUpdates(() => {});
    const un2 = subscribeToNotificationUpdates(() => {});

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe(
      'wss://dev.example.ee/api/notifications/connect',
    );
    un1();
    un2();
  });

  it('teavitab kõiki kuulajaid notification_update peale', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const a = vi.fn();
    const b = vi.fn();
    subscribeToNotificationUpdates(a);
    subscribeToNotificationUpdates(b);

    FakeWebSocket.instances[0].open();
    FakeWebSocket.instances[0].emit({ type: 'notification_update' });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('reconnect kasvava viivitusega ja loobub pärast 10 katset', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    subscribeToNotificationUpdates(() => {});

    // Iga uus ühendus kohe suletakse → järgmine planeeritakse backoffiga.
    for (let i = 0; i < 15; i++) {
      const inst = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
      inst.onclose?.();
      // suurim backoff + jitter < 40s
      vi.advanceTimersByTime(40_000);
    }

    // 1 esialgne + kuni 10 reconnect-katset, mitte lõputult.
    expect(FakeWebSocket.instances.length).toBeLessThanOrEqual(11);
    expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
  });

  it('onopen nullib backoffi ja saadab hello', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    subscribeToNotificationUpdates(() => {});

    const first = FakeWebSocket.instances[0];
    first.open();
    expect(first.sent).toContain(JSON.stringify({ type: 'hello' }));

    first.onclose?.();
    vi.advanceTimersByTime(40_000);
    const second = FakeWebSocket.instances[1];
    second.open();
    second.onclose?.();
    // backoff algab taas 1s juurest → reconnect toimub <2s jooksul
    vi.advanceTimersByTime(1_900);
    expect(FakeWebSocket.instances.length).toBe(3);
  });

  it('viimane lahkuja sulgeb ühenduse', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un1 = subscribeToNotificationUpdates(() => {});
    const un2 = subscribeToNotificationUpdates(() => {});
    FakeWebSocket.instances[0].open();

    un1();
    expect(FakeWebSocket.instances[0].closed).toBe(false);
    un2();
    expect(FakeWebSocket.instances[0].closed).toBe(true);
  });

  it('unauthorized peatab reconnecti', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    subscribeToNotificationUpdates(() => {});
    FakeWebSocket.instances[0].open();
    FakeWebSocket.instances[0].emit({ type: 'unauthorized' });

    vi.advanceTimersByTime(60_000);
    // ei tekita uut ühendust
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
