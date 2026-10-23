import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import { fetchXroadLogList, runManualJob } from './api';

afterEach(() => vi.restoreAllMocks());

describe('xroad-logs api', () => {
  it('fetchXroadLogList ilma filtriteta', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await fetchXroadLogList({ page: '1', pageSize: '10', search: '', sorting: '' });
    expect(get).toHaveBeenCalledWith('/v1/xroad/etoimik/logs/list', { page: '1', pageSize: '10' });
  });

  it('fetchXroadLogList lisab kõik filtrid', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await fetchXroadLogList(
      { page: '1', pageSize: '10', search: '', sorting: '' },
      {
        dateFrom: '2026-01-01',
        dateTo: '2026-02-01',
        includeFound: 'true',
        includeNotFound: 'false',
        includeError: 'true',
        allServices: 'false',
      },
    );
    expect(get).toHaveBeenCalledWith('/v1/xroad/etoimik/logs/list', {
      page: '1',
      pageSize: '10',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      includeFound: 'true',
      includeNotFound: 'false',
      includeError: 'true',
      allServices: 'false',
    });
  });

  it('runManualJob', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({});
    await runManualJob('job1');
    expect(post).toHaveBeenCalledWith('/v1/admin/manual-jobs/run', { job: 'job1' });
  });
});
