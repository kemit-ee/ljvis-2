import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import { listRiskScores } from './api';

afterEach(() => vi.restoreAllMocks());

const params = { page: '1', pageSize: '20', search: '', sorting: 'name asc' };

describe('listRiskScores', () => {
  it('ilma filtriteta saadab ainult lehekülje parameetrid', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listRiskScores(params);
    expect(get).toHaveBeenCalledWith('/v1/admin/risk-scores/list', {
      page: '1',
      pageSize: '20',
      sorting: 'name asc',
    });
  });

  it('lisab täidetud filtrid', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listRiskScores(params, { companyName: 'AS', regCode: '123', riskBand: 'Punane' });
    expect(get).toHaveBeenCalledWith('/v1/admin/risk-scores/list', {
      page: '1',
      pageSize: '20',
      sorting: 'name asc',
      q: 'AS',
      regCode: '123',
      riskBand: 'Punane',
    });
  });
});
