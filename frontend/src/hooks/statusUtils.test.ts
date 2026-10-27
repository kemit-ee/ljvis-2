import { describe, it, expect } from 'vitest';
import { hasStatus } from './statusUtils';

describe('hasStatus', () => {
  it('matches objects with the given status', () => {
    expect(hasStatus({ status: 404 }, 404)).toBe(true);
    expect(hasStatus({ status: 500 }, 404)).toBe(false);
  });

  it('rejects non-objects and objects without status', () => {
    expect(hasStatus(null, 404)).toBe(false);
    expect(hasStatus('x', 404)).toBe(false);
    expect(hasStatus({}, 404)).toBe(false);
  });
});
