import { beforeEach, describe, expect, it, vi } from 'vitest';

const failure = vi.hoisted(() => ({ value: null as null | { status: number; path: string; at: number } }));
vi.mock('./client', () => ({ getLastLoadFailure: () => failure.value }));

import { recentFormLoadStatus } from './formLoadStatus';

describe('recentFormLoadStatus', () => {
  beforeEach(() => {
    failure.value = null;
  });

  it('returns the status for a recent control-forms failure', () => {
    failure.value = { status: 403, path: '/control-forms/1', at: 1000 };
    expect(recentFormLoadStatus(2000)).toBe(403);
  });

  it('returns null for old or non-form failures', () => {
    failure.value = { status: 403, path: '/control-forms/1', at: 0 };
    expect(recentFormLoadStatus(100_000)).toBeNull();
    failure.value = { status: 403, path: '/other', at: 1000 };
    expect(recentFormLoadStatus(2000)).toBeNull();
  });
});
