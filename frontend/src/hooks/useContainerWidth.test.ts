// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContainerWidth } from './useContainerWidth';

let observed: Element[] = [];
let disconnected = false;

beforeEach(() => {
  observed = [];
  disconnected = false;
  class RO {
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      disconnected = true;
    }
  }
  vi.stubGlobal('ResizeObserver', RO);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function mount(withSidenav: boolean) {
  const footer = document.createElement('div');
  footer.setAttribute('data-name', 'footer');
  Object.defineProperty(footer, 'clientWidth', { value: 1000 });
  document.body.appendChild(footer);
  if (withSidenav) {
    const nav = document.createElement('div');
    nav.setAttribute('data-name', 'sidenav');
    Object.defineProperty(nav, 'clientWidth', { value: 200 });
    document.body.appendChild(nav);
  }
}

describe('useContainerWidth', () => {
  it('is undefined without a footer', () => {
    const { result } = renderHook(() => useContainerWidth(true, []));
    expect(result.current).toBeUndefined();
  });

  it('is undefined on mobile without sidenav', () => {
    mount(false);
    const { result } = renderHook(() => useContainerWidth(false, []));
    expect(result.current).toBeUndefined();
  });

  it('subtracts sidenav width and padding, observes both and disconnects', () => {
    mount(true);
    const { result, unmount } = renderHook(() => useContainerWidth(true, []));
    expect(result.current).toBe(1000 - 200 - 64);
    expect(observed).toHaveLength(2);
    unmount();
    expect(disconnected).toBe(true);
  });

  it('works on desktop without sidenav', () => {
    mount(false);
    const { result } = renderHook(() => useContainerWidth(true, []));
    expect(result.current).toBe(936);
  });
});
