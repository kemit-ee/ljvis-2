import { describe, expect, it } from 'vitest';
import { findOtherRoadName } from './roadOtherLookup';

const roads = [
  { code: '1194', name: 'Posti tee', isValid: true },
  { code: '1392', name: 'Jõhvi kalmistu tee', isValid: false },
];

describe('findOtherRoadName', () => {
  it('returns the active road name for an exact road-number match', () => {
    expect(findOtherRoadName(roads, '1194')).toBe('Posti tee');
  });

  it('ignores inactive and unknown road numbers', () => {
    expect(findOtherRoadName(roads, '1392')).toBeUndefined();
    expect(findOtherRoadName(roads, '99999')).toBeUndefined();
  });
});
