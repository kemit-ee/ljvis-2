// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationBellButton } from './NotificationBellButton';

let count = 0;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: { count?: number }) => (o ? `${key}:${o.count}` : key) }),
}));
vi.mock('./useNotifications', () => ({
  useNotificationCount: () => ({ unreadCount: count, refetch: vi.fn() }),
}));

// TEDI vajab matchMedia'd, mida jsdom ei paku.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

afterEach(cleanup);

const renderBell = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<NotificationBellButton />} />
        <Route path="/notifications" element={<div>notifications-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotificationBellButton', () => {
  it('ilma lugemata teavitusteta pole märki', () => {
    count = 0;
    renderBell();
    expect(screen.getByLabelText('notifications.bellAriaLabelEmpty')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('näitab lugemata arvu ja 99+ üle 99', () => {
    count = 5;
    renderBell();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByLabelText('notifications.bellAriaLabel:5')).toBeTruthy();
    cleanup();
    count = 150;
    renderBell();
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('klõps avab teavituste lehe', () => {
    count = 1;
    renderBell();
    fireEvent.click(screen.getByLabelText('notifications.bellAriaLabel:1'));
    expect(screen.getByText('notifications-page')).toBeTruthy();
  });
});
