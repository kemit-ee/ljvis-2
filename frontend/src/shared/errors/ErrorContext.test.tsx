// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ApiError, get } from '../api/client';
import { ErrorProvider, useErrorContext } from './ErrorContext';
import { ToastContainer } from './ToastContainer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key,
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => <ErrorProvider>{children}</ErrorProvider>;

async function triggerApiError(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status, json: () => Promise.resolve({ response: body }) }),
  );
  await act(async () => {
    await get('/x').catch(() => {});
  });
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ErrorProvider', () => {
  it('shows a message, dedupes and auto-dismisses', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    act(() => result.current.showMessage('a'));
    act(() => result.current.showMessage('a'));
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('keeps at most 5 toasts', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    act(() => {
      for (let i = 0; i < 7; i++) result.current.showMessage(`m${i}`, 'info');
    });
    expect(result.current.toasts).toHaveLength(5);
    expect(result.current.toasts[0].message).toBe('m2');
  });

  it.each([
    [403, undefined, 'common.errors.forbidden', 'warning'],
    [404, undefined, 'common.errors.notFound', 'info'],
    [500, undefined, 'common.errors.serverError', 'error'],
    [400, undefined, 'common.errors.requestFailed', 'error'],
    [409, { code: 'form_modified' }, 'common.errors.formModified', 'warning'],
  ])('maps API %s to a toast', async (status, body, message, type) => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    await triggerApiError(status, body);
    expect(result.current.toasts).toMatchObject([{ message, type }]);
  });

  it('does not toast 401/422', async () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    await triggerApiError(422, {});
    expect(result.current.toasts).toHaveLength(0);
  });

  it('keeps form_modified toast sticky', async () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    await triggerApiError(409, { code: 'form_modified' });
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('409 without form_modified is a generic failure', async () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });
    await triggerApiError(409, 'x');
    expect(result.current.toasts[0].message).toBe('common.errors.requestFailed');
    expect(new ApiError('x', 1).status).toBe(1);
  });
});

describe('ToastContainer', () => {
  function Shower({ scope, variant }: { scope?: string; variant?: 'inline' }) {
    const { showMessage } = useErrorContext();
    return (
      <>
        <button onClick={() => showMessage('global msg')}>g</button>
        <button onClick={() => showMessage('scoped msg', 'warning', 's1')}>s</button>
        <ToastContainer scope={scope} variant={variant} />
      </>
    );
  }

  it('renders only toasts for its scope and dismisses on click', () => {
    render(<Shower />, { wrapper });
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(screen.getByText('g'));
    fireEvent.click(screen.getByText('s'));
    expect(screen.getByText('global msg')).toBeTruthy();
    expect(screen.queryByText('scoped msg')).toBeNull();
    fireEvent.click(screen.getByLabelText('common.close'));
    expect(screen.queryByText('global msg')).toBeNull();
  });

  it('renders scoped inline toasts', () => {
    render(<Shower scope="s1" variant="inline" />, { wrapper });
    fireEvent.click(screen.getByText('s'));
    expect(screen.getByText('scoped msg')).toBeTruthy();
  });
});
