// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationTemplateMappingListPage } from './NotificationTemplateMappingListPage';
import { listNotificationTemplateMappings, resolveDesktopRecipientUsers } from '../../api';

let perms: string[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../api', () => ({
  listNotificationTemplateMappings: vi.fn(),
  resolveDesktopRecipientUsers: vi.fn(),
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

beforeEach(() => {
  perms = ['notification_template_mapping.list'];
  vi.mocked(listNotificationTemplateMappings).mockResolvedValue([
    {
      notificationType: 'carrier_violation',
      originalTemplateId: 'tpl',
      channel: 'postkast',
      defaultLanguage: 'et',
      active: true,
      defaultRecipientEmail: 'a@b.ee',
      desktopRecipientPersonalCodes: null,
    },
    {
      notificationType: 'driving_ban',
      originalTemplateId: null,
      channel: 'desktop',
      defaultLanguage: 'et',
      active: false,
      defaultRecipientEmail: null,
      desktopRecipientPersonalCodes: ['111', '222'],
    },
    {
      notificationType: 'weight_violation',
      originalTemplateId: null,
      channel: 'desktop',
      defaultLanguage: 'et',
      active: true,
      defaultRecipientEmail: null,
      desktopRecipientPersonalCodes: null,
    },
    {
      notificationType: 'labor_kabotage',
      originalTemplateId: null,
      channel: 'postkast',
      defaultLanguage: 'et',
      active: true,
      defaultRecipientEmail: null,
      desktopRecipientPersonalCodes: null,
    },
  ]);
  vi.mocked(resolveDesktopRecipientUsers).mockResolvedValue([
    { id: '1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111' },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/list']}>
      <Routes>
        <Route path="/list" element={<NotificationTemplateMappingListPage />} />
        <Route path="/notification-template-mapping/:type" element={<div>detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotificationTemplateMappingListPage', () => {
  it('ilma õiguseta keelatud ega lae andmeid', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    expect(listNotificationTemplateMappings).not.toHaveBeenCalled();
  });

  it('kuvab kaardistused, lahendab desktop-saajate nimed', async () => {
    renderPage();
    expect(await screen.findByText('a@b.ee')).toBeTruthy();
    expect(await screen.findByText('Mari Maasikas, 222')).toBeTruthy();
    expect(screen.getAllByText('notificationTemplateMapping.statusActive').length).toBe(3);
    expect(screen.getByText('notificationTemplateMapping.statusInactive')).toBeTruthy();
    expect(screen.getByText('tpl')).toBeTruthy();
  });

  it('"vaata detaile" viib detailvaatesse', async () => {
    renderPage();
    const links = await screen.findAllByText('notificationTemplateMapping.viewDetails');
    fireEvent.click(links[0]);
    expect(await screen.findByText('detail-page')).toBeTruthy();
  });

  it('API viga ei kuku', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listNotificationTemplateMappings).mockRejectedValue(new Error('x'));
    renderPage();
    await vi.waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('kui saajaid pole, ei lahendata kasutajaid', async () => {
    vi.mocked(listNotificationTemplateMappings).mockResolvedValue([]);
    renderPage();
    await screen.findByText('notificationTemplateMapping.title');
    expect(resolveDesktopRecipientUsers).not.toHaveBeenCalled();
  });
});
