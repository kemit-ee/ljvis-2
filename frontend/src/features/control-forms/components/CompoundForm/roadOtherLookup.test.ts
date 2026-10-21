import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from '../../../../shared/api/client';
import { findOtherRoadName, normalizeRoadNumber } from './roadOtherLookup';

vi.mock('../../../../shared/api/client', () => ({ get: vi.fn() }));

describe('normalizeRoadNumber', () => {
  it('keeps only digits, at most five', () => {
    expect(normalizeRoadNumber(' 11-94a ')).toBe('1194');
    expect(normalizeRoadNumber('1234567')).toBe('12345');
  });
});

describe('findOtherRoadName', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('asks the road lookup endpoint and returns the matching road name', async () => {
    vi.mocked(get).mockResolvedValue([{ code: '1194', name: 'Posti tee' }]);
    await expect(findOtherRoadName('1194')).resolves.toBe('Posti tee');
    expect(get).toHaveBeenCalledWith('/v1/roads/other', { number: '1194' });
  });

  it('returns undefined when the road number has no valid match', async () => {
    vi.mocked(get).mockResolvedValue([]);
    await expect(findOtherRoadName('99999')).resolves.toBeUndefined();
  });

  it('does not call the endpoint for an invalid road number', async () => {
    await expect(findOtherRoadName('')).resolves.toBeUndefined();
    await expect(findOtherRoadName('12a')).resolves.toBeUndefined();
    await expect(findOtherRoadName('123456')).resolves.toBeUndefined();
    expect(get).not.toHaveBeenCalled();
  });
});
