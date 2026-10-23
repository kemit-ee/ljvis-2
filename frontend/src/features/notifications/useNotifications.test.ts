// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationCount, useNotifications } from './useNotifications';
import * as api from './api';

let socketListener: (() => void) | undefined;
const unsubscribe = vi.fn();
const notifyListeners = vi.fn();

vi.mock('./api', () => ({
  fetchUnreadCount: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('./notificationSocket', () => ({
  subscribeToNotificationUpdates: (fn: () => void) => {
    socketListener = fn;
    return unsubscribe;
  },
  notifyListeners: () => notifyListeners(),
}));

beforeEach(() => {
  vi.mocked(api.fetchUnreadCount).mockResolvedValue({ unreadCount: 2 });
  vi.mocked(api.fetchNotifications).mockResolvedValue([
    { id: '1', isUnread: true } as never,
    { id: '2', isUnread: false } as never,
  ]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useNotificationCount', () => {
  it('laeb arvu, uuendab WS-teatel ja perioodiliselt, koristab lõpus', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useNotificationCount());
    await act(async () => {});
    expect(result.current.unreadCount).toBe(2);

    vi.mocked(api.fetchUnreadCount).mockResolvedValue({ unreadCount: 3 });
    await act(async () => socketListener?.());
    expect(result.current.unreadCount).toBe(3);

    vi.mocked(api.fetchUnreadCount).mockResolvedValue({} as never);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current.unreadCount).toBe(0);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('viga ei kuku', async () => {
    vi.mocked(api.fetchUnreadCount).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useNotificationCount());
    await act(async () => {});
    expect(result.current.unreadCount).toBe(0);
  });
});

describe('useNotifications', () => {
  it('laeb teavitused', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });

  it('tühjad vastused ja WS-teade', async () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue(undefined as never);
    vi.mocked(api.fetchUnreadCount).mockResolvedValue({} as never);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    await act(async () => socketListener?.());
  });

  it('viga lõpetab laadimise', async () => {
    vi.mocked(api.fetchNotifications).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
  });

  it('markRead ja markAllRead värskendavad ja teavitavad kuulajaid', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.markRead('1'));
    expect(api.markNotificationRead).toHaveBeenCalledWith('1');
    expect(notifyListeners).toHaveBeenCalledTimes(1);
    await act(() => result.current.markAllRead());
    expect(api.markAllNotificationsRead).toHaveBeenCalled();
    expect(notifyListeners).toHaveBeenCalledTimes(2);
  });
});
