// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { get } from './client';

describe('API response normalisation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a JSON object returned as a Ruuter response string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            response: JSON.stringify({
              id: '95210016',
              partsDefects: [{ partCode: 'CAA_1', defectCode: '1.1.1' }],
            }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(get('/v1/control-forms/vehicle-technical')).resolves.toEqual({
      id: '95210016',
      partsDefects: [{ partCode: 'CAA_1', defectCode: '1.1.1' }],
    });
  });

  it('keeps legitimate plain-string responses unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ response: 'allow' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(get<string>('/v1/access')).resolves.toBe('allow');
  });
});
