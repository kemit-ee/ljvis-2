import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTaraCallbackPath } from './taraCallbackPath';

const mockFetch = (impl: () => unknown) => vi.stubGlobal('fetch', vi.fn(impl));

describe('getTaraCallbackPath', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the configured alias path', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ taraCallbackPath: '/auth/tara-callback' }) }));
    expect(await getTaraCallbackPath()).toBe('/auth/tara-callback');
  });

  it.each([
    ['unknown path', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ taraCallbackPath: '/evil' }) })],
    ['missing key', () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })],
    ['http error', () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })],
    ['non-JSON body', () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('x')) })],
    ['network error', () => Promise.reject(new Error('x'))],
  ])('falls back to /auth/callback on %s', async (_n, impl) => {
    mockFetch(impl);
    expect(await getTaraCallbackPath()).toBe('/auth/callback');
  });
});
