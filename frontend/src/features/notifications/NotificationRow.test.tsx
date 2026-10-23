// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationRow } from './NotificationRow';
import type { InAppNotification } from './types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

const notif = (over: Partial<InAppNotification> = {}): InAppNotification => ({
  id: 'n1',
  type: 'T',
  requiredPermission: 'p',
  relatedEntityType: 'ncr',
  relatedEntityId: '5',
  titleEt: 'Pealkiri',
  bodyEt: 'Sisu',
  createdAt: '2026-01-02T03:04:05',
  isUnread: true,
  ...over,
});

function setup(n: InAppNotification) {
  const onMarkRead = vi.fn();
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NotificationRow notif={n} onMarkRead={onMarkRead} />} />
        <Route path="*" element={<div>navigated</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return onMarkRead;
}

describe('NotificationRow', () => {
  it('lugemata teavitus: märgib loetuks ja navigeerib', () => {
    const onMarkRead = setup(notif());
    expect(screen.getByText('Pealkiri')).toBeTruthy();
    expect(screen.getByText('Sisu')).toBeTruthy();
    expect(screen.getByText('notifications.unread')).toBeTruthy();
    fireEvent.click(screen.getByText('notifications.openEntity'));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
    expect(screen.getByText('navigated')).toBeTruthy();
  });

  it('"loetud" nupp märgib loetuks', () => {
    const onMarkRead = setup(notif());
    fireEvent.click(screen.getByText('notifications.read'));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('loetud teavitus: ei kutsu markRead, ilma sisuta ja ilma olemita', () => {
    const onMarkRead = setup(notif({ isUnread: false, bodyEt: null }));
    expect(screen.queryByText('notifications.read')).toBeNull();
    fireEvent.click(screen.getByText('notifications.openEntity'));
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it('tundmatu või puuduv olem: avamisnuppu pole', () => {
    setup(notif({ relatedEntityType: 'unknown' }));
    expect(screen.queryByText('notifications.openEntity')).toBeNull();
    cleanup();
    setup(notif({ relatedEntityType: null }));
    expect(screen.queryByText('notifications.openEntity')).toBeNull();
  });

  it.each([
    ['drive_rest_driver_form', '/control-forms/sp-driver/5'],
    ['drive_rest_teammate_form', '/control-forms/sp-teammate/5'],
    ['compound_form', '/control-forms/compound/5'],
    ['tram_form', '/control-forms/tram-control-card/5'],
    ['tram_control_card', '/control-forms/tram-control-card/5'],
    ['vehicle_technical', '/control-forms/vehicle-technical/5'],
    ['trailer_technical', '/control-forms/trailer-technical/5'],
    ['foreign_violation_form', '/control-forms/foreign-violation/5'],
    ['labour_inspection', '/control-forms/labour-inspection/5'],
    ['good_repute', '/control-forms/good-repute/5'],
    ['adr_form', '/control-forms/adr/5'],
    ['transport_interruption', '/control-forms/transport-interruption/5'],
    ['ncr', '/erru/ncr/5'],
    ['rsi', '/erru/rsi/5'],
    ['ctud', '/erru/ctud/5'],
    ['cgr', '/erru/cgr/5'],
    ['nu', '/erru/nu/5'],
  ])('olem %s viib marsruudile %s', (type, url) => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<NotificationRow notif={notif({ relatedEntityType: type })} onMarkRead={vi.fn()} />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('notifications.openEntity'));
    expect(screen.getByTestId('loc').textContent).toBe(url);
  });
});

import { useLocation } from 'react-router-dom';
function LocationProbe() {
  return <span data-testid="loc">{useLocation().pathname}</span>;
}
