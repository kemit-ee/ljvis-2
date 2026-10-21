// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExpandedWhenSelected } from './useExpandedWhenSelected';

describe('useExpandedWhenSelected', () => {
  it('valikuta järgib kasutaja avamist/sulgemist', () => {
    const { result } = renderHook(() => useExpandedWhenSelected(false));
    expect(result.current.expanded).toBe(false);
    act(() => result.current.onToggle(true));
    expect(result.current.expanded).toBe(true);
    act(() => result.current.onToggle(false));
    expect(result.current.expanded).toBe(false);
  });

  it('valitud rikkumisega plokk on avatud ega sulgu', () => {
    const { result, rerender } = renderHook(
      ({ selected }) => useExpandedWhenSelected(selected),
      { initialProps: { selected: true } },
    );
    expect(result.current.expanded).toBe(true);
    act(() => result.current.onToggle(false));
    expect(result.current.expanded).toBe(true);
    rerender({ selected: false });
    expect(result.current.expanded).toBe(false);
  });

  it('arvestab vaikimisi avatud olekut', () => {
    const { result } = renderHook(() => useExpandedWhenSelected(false, true));
    expect(result.current.expanded).toBe(true);
  });
});
