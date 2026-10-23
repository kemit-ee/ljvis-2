import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import { listClassifierValues } from './api';

afterEach(() => vi.restoreAllMocks());

describe('listClassifierValues', () => {
  it('ametnik kasutab üldist otspunkti', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await listClassifierValues(false);
    expect(get).toHaveBeenCalledWith('/v1/classifier-values');
  });

  it('kodanik kasutab kodaniku otspunkti', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await listClassifierValues(true);
    expect(get).toHaveBeenCalledWith('/v1/citizen/classifier-values');
  });
});
