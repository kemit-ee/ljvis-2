// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubForm } from './useSubForm';

const hasPermission = vi.fn();
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission }),
}));

describe('useSubForm', () => {
  beforeEach(() => {
    hasPermission.mockReset();
  });

  it('algseis on tühi', () => {
    const { result } = renderHook(() => useSubForm({ permPrefix: 'x' }));
    expect(result.current.form).toBeNull();
    expect(result.current.loaded).toBe(false);
    expect(result.current.editActive).toBe(false);
    expect(result.current.draft).toBeNull();
  });

  it('salvestatud vorm aktiveerib muutmise, kui kasutajal on kirjutusõigus', () => {
    hasPermission.mockImplementation((p: string) => p === 'x.write' || p === 'x.read');
    const { result } = renderHook(() => useSubForm<{ status?: string }>({ permPrefix: 'x' }));
    act(() => result.current.setForm({ status: 'saved' }));
    expect(result.current.editActive).toBe(true);
  });

  it('salvestatud vorm aktiveerib muutmise, kui lugemisõigust pole', () => {
    hasPermission.mockReturnValue(false);
    const { result } = renderHook(() => useSubForm<{ status?: string }>({ permPrefix: 'x' }));
    act(() => result.current.setForm({ status: 'saved' }));
    expect(result.current.editActive).toBe(true);
  });

  it('ainult lugemisõigusega ja kinnitatud vorm ei ole muudetav', () => {
    hasPermission.mockImplementation((p: string) => p === 'x.read');
    const { result } = renderHook(() => useSubForm<{ status?: string }>({ permPrefix: 'x' }));
    act(() => result.current.setForm({ status: 'saved' }));
    expect(result.current.editActive).toBe(false);
    act(() => result.current.setForm({ status: 'confirmed' }));
    expect(result.current.editActive).toBe(false);
  });

  it('setDraftValue ja resetDraft hoiavad ref-i ja oleku kooskõlas', () => {
    const { result } = renderHook(() => useSubForm<{ status?: string }>({ permPrefix: 'x' }));
    act(() => result.current.setDraftValue({ status: 'saved' }));
    expect(result.current.draft).toEqual({ status: 'saved' });
    expect(result.current.draftRef.current).toEqual({ status: 'saved' });
    act(() => result.current.resetDraft());
    expect(result.current.draft).toBeNull();
    expect(result.current.draftRef.current).toBeNull();
  });
});
