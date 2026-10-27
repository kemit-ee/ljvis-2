// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  value: {
    user: null as null | { canUseAdministrativeProcedure?: boolean },
    hasPermission: (() => false) as (p: string) => boolean,
  },
}));

vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => auth.value }));

import { useCanUseAdministrativeProcedure } from './useCanUseAdministrativeProcedure';
import { useIsAdmin } from './useIsAdmin';

describe('useCanUseAdministrativeProcedure', () => {
  it('is true only when the flag is true', () => {
    auth.value.user = null;
    expect(renderHook(() => useCanUseAdministrativeProcedure()).result.current).toBe(false);
    auth.value.user = { canUseAdministrativeProcedure: true };
    expect(renderHook(() => useCanUseAdministrativeProcedure()).result.current).toBe(true);
  });
});

describe('useIsAdmin', () => {
  it('requires all three admin permissions', () => {
    auth.value.hasPermission = () => false;
    expect(renderHook(() => useIsAdmin()).result.current).toBe(false);
    auth.value.hasPermission = () => true;
    expect(renderHook(() => useIsAdmin()).result.current).toBe(true);
  });
});
