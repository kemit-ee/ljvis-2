// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('follows window width on resize', () => {
    window.innerWidth = 1200;
    const { result } = renderHook(() => useMediaQuery(1000));
    expect(result.current).toBe(true);

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(false);
  });
});
