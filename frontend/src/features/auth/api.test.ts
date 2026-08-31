import { describe, it, expect, vi, beforeEach } from 'vitest';
import { switchRepresentation } from './api';

describe('switchRepresentation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('always sends a registryCode key, even when the caller omits it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await switchRepresentation('citizen-self');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    // POST/auth/representation/switch.yml declares `registryCode` in its
    // allowlist — Rust Ruuter's `contains_key` check rejects the request
    // with a 500 "Field missing: registryCode" if the key is absent from
    // the JSON body at all, even for role=citizen-self/officer where it's
    // only semantically required for role=company. AuthCallback.tsx used to
    // call the switch endpoint via a raw `fetch` that omitted this key
    // entirely — this test guards against that regression, here or in any
    // future caller that bypasses this helper.
    expect(body).toHaveProperty('registryCode');
    expect(body.registryCode).toBe('');
  });

  it('passes registryCode through unchanged when the caller provides one', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await switchRepresentation('company', '16125011');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.role).toBe('company');
    expect(body.registryCode).toBe('16125011');
  });
});
