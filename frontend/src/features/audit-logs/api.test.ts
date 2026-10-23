import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import { exportLogs, getLog, listLogs } from './api';

afterEach(() => vi.restoreAllMocks());

describe('audit-logs api', () => {
  it('listLogs', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listLogs({ page: '1' });
    expect(get).toHaveBeenCalledWith('/v1/logs', { page: '1' });
  });

  it('exportLogs', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await exportLogs({ search: 'x' });
    expect(get).toHaveBeenCalledWith('/v1/logs/export', { search: 'x' });
  });

  it('getLog saadab id q-parameetrina', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await getLog('abc');
    expect(get).toHaveBeenCalledWith('/v1/logs/log', { q: 'abc' });
  });
});
