import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteFormFile, listFormFiles } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('form attachment API contract', () => {
  it('maps Resql metadata into display fields and string identifiers', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: [{
        id: 42, file_name: 'kontroll.pdf', form_number: 'sp-2026-1',
        s3_key: 'sp-driver-form/kontroll.pdf', created_at: '2026-09-14',
      }] }),
    }));
    expect(await listFormFiles('drive-rest-form/driver', 'sp-2026-1')).toEqual([{
      id: '42', fileName: 'kontroll.pdf', formNumber: 'sp-2026-1',
      s3Key: 'sp-driver-form/kontroll.pdf', createdAt: '2026-09-14',
      createdBy: undefined, status: undefined,
    }]);
  });

  it('sends deletion identifiers as strings for the Ruuter allowlist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ response: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await deleteFormFile('drive-rest-form/driver', '42');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id: '42' });
  });
});
