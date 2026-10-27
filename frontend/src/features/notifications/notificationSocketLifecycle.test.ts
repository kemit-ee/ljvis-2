// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Täiendab notificationSocket.test.ts-i: jsdom-keskkond (document, visibilitychange), ping, vigased sõnumid.
async function loadModule() {
  vi.resetModules();
  return import('./notificationSocket');
}

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static throwOnConstruct = false;
  static throwOnSend = false;
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    if (FakeWebSocket.throwOnConstruct) throw new Error('ctor');
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    if (FakeWebSocket.throwOnSend) throw new Error('send');
    this.sent.push(data);
  }

  close() {
    this.closed = true;
  }
}

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  FakeWebSocket.throwOnConstruct = false;
  FakeWebSocket.throwOnSend = false;
  vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setVisibility('visible');
});

describe('notificationSocket (elutsükkel)', () => {
  it('http-lehel kasutab ws: protokolli', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    expect(FakeWebSocket.instances[0].url.startsWith('ws://')).toBe(true);
    un();
  });

  it('saadab perioodiliselt ping-i ja koristab taimeri sulgemisel', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    const ws = FakeWebSocket.instances[0];
    ws.onopen?.();
    vi.advanceTimersByTime(30_000);
    expect(ws.sent).toContain(JSON.stringify({ type: 'ping' }));
    un();
    ws.sent.length = 0;
    vi.advanceTimersByTime(60_000);
    expect(ws.sent).toHaveLength(0);
  });

  it('send-i viga ei kuku (hello ja ping)', async () => {
    FakeWebSocket.throwOnSend = true;
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    const ws = FakeWebSocket.instances[0];
    expect(() => ws.onopen?.()).not.toThrow();
    expect(() => vi.advanceTimersByTime(30_000)).not.toThrow();
    un();
  });

  it('vigane JSON ja tundmatu tüüp ignoreeritakse; onerror ei tee midagi', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const listener = vi.fn();
    const un = subscribeToNotificationUpdates(listener);
    const ws = FakeWebSocket.instances[0];
    ws.onmessage?.({ data: 'ei-ole-json' });
    ws.onmessage?.({ data: JSON.stringify({ type: 'other' }) });
    ws.onerror?.();
    expect(listener).not.toHaveBeenCalled();
    un();
  });

  it('kuulaja viga ei takista teisi kuulajaid', async () => {
    const { subscribeToNotificationUpdates, notifyListeners } = await loadModule();
    const ok = vi.fn();
    const u1 = subscribeToNotificationUpdates(() => {
      throw new Error('x');
    });
    const u2 = subscribeToNotificationUpdates(ok);
    notifyListeners();
    expect(ok).toHaveBeenCalled();
    u1();
    u2();
  });

  it('WebSocket konstruktori viga planeerib reconnecti', async () => {
    FakeWebSocket.throwOnConstruct = true;
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    expect(FakeWebSocket.instances).toHaveLength(0);
    FakeWebSocket.throwOnConstruct = false;
    vi.advanceTimersByTime(2_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    un();
  });

  it('nähtavaks muutumine taastab loobunud ühenduse', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    FakeWebSocket.instances[0].onopen?.();
    FakeWebSocket.instances[0].onmessage?.({ data: JSON.stringify({ type: 'unauthorized' }) });
    expect(FakeWebSocket.instances).toHaveLength(1);

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances).toHaveLength(1);

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances).toHaveLength(2);
    un();
  });

  it('nähtavaks muutumine ei ava teist ühendust kui esimene töötab', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances).toHaveLength(1);
    un();
    // pärast viimast lahkujat on kuulaja eemaldatud
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('suletud ühenduse korral nähtavaks muutumine avab uue', async () => {
    const { subscribeToNotificationUpdates } = await loadModule();
    const un = subscribeToNotificationUpdates(() => {});
    FakeWebSocket.instances[0].onclose?.();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeWebSocket.instances).toHaveLength(2);
    un();
  });
});
