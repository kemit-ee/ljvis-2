// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationTemplateMappingDetailPage } from './NotificationTemplateMappingDetailPage';
import {
  listNotificationTemplateMappings,
  resolveDesktopRecipientUsers,
  saveNotificationTemplateMapping,
} from '../../api';
import { ApiError } from '../../../../shared/api/client';
import type { NotificationTemplateMapping } from '../../types';

let perms: string[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, d?: string | { defaultValue?: string }) =>
      typeof d === 'string' ? d : (d?.defaultValue ?? key),
  }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));
vi.mock('../../../users/api', () => ({ listUsers: vi.fn().mockResolvedValue({ content: [], total: 0 }) }));
vi.mock('../../api', () => ({
  listNotificationTemplateMappings: vi.fn(),
  resolveDesktopRecipientUsers: vi.fn(),
  saveNotificationTemplateMapping: vi.fn(),
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

const postkast: NotificationTemplateMapping = {
  notificationType: 'carrier_violation',
  originalTemplateId: 'tpl',
  channel: 'postkast',
  defaultLanguage: 'et',
  active: true,
  defaultRecipientEmail: 'a@b.ee',
  desktopRecipientPersonalCodes: null,
};
const desktop: NotificationTemplateMapping = {
  notificationType: 'driving_ban',
  originalTemplateId: null,
  channel: 'desktop',
  defaultLanguage: 'en',
  active: false,
  defaultRecipientEmail: null,
  desktopRecipientPersonalCodes: ['111', '222'],
};
const auto: NotificationTemplateMapping = { ...postkast, notificationType: 'ncr_violation', originalTemplateId: null, defaultRecipientEmail: null };

beforeEach(() => {
  perms = ['notification_template_mapping.list', 'notification_template_mapping.edit'];
  vi.mocked(listNotificationTemplateMappings).mockResolvedValue([postkast, desktop, auto]);
  vi.mocked(resolveDesktopRecipientUsers).mockResolvedValue([
    { id: '1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111' },
  ]);
  vi.mocked(saveNotificationTemplateMapping).mockResolvedValue({ id: 1, notificationType: 'x' });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (type: string) =>
  render(
    <MemoryRouter initialEntries={[`/m/${type}`]}>
      <Routes>
        <Route path="/m/:notificationType" element={<NotificationTemplateMappingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotificationTemplateMappingDetailPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage('carrier_violation');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('laadimine ja puuduv kaardistus', async () => {
    renderPage('unknown');
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it('postkast-kanal: andmed, käivitajad ja malli muutujad', async () => {
    renderPage('carrier_violation');
    expect(await screen.findByText('a@b.ee')).toBeTruthy();
    expect(screen.getByText('tpl')).toBeTruthy();
    expect(screen.getByTestId('template-variables')).toBeTruthy();
    expect(screen.getByText('{{formNumber}}')).toBeTruthy();
  });

  it('automaatselt käivituv liik', async () => {
    renderPage('ncr_violation');
    expect(await screen.findByText('notificationTemplateMapping.triggeredAutomatically')).toBeTruthy();
    expect(screen.queryByTestId('template-variables')).toBeNull();
  });

  it('desktop-kanal: saajate nimed, passiivne olek', async () => {
    renderPage('driving_ban');
    expect(await screen.findByText('Mari Maasikas, 222')).toBeTruthy();
    expect(screen.getByText('notificationTemplateMapping.statusInactive')).toBeTruthy();
  });

  it('muutmisõiguseta pole muutmisnuppu', async () => {
    perms = ['notification_template_mapping.list'];
    renderPage('carrier_violation');
    await screen.findByText('a@b.ee');
    expect(screen.queryByText('notificationTemplateMapping.edit')).toBeNull();
  });

  it('muudab ja salvestab postkast-kaardistuse', async () => {
    renderPage('carrier_violation');
    fireEvent.click(await screen.findByText('notificationTemplateMapping.edit'));
    fireEvent.change(document.getElementById('originalTemplateId')!, { target: { value: 'new-tpl' } });
    fireEvent.change(document.getElementById('defaultRecipientEmail')!, { target: { value: 'x@y.ee' } });
    fireEvent.click(document.getElementById('active')!);
    fireEvent.click(screen.getByText('notificationTemplateMapping.save'));
    await waitFor(() => expect(saveNotificationTemplateMapping).toHaveBeenCalled());
    expect(vi.mocked(saveNotificationTemplateMapping).mock.calls[0][0]).toMatchObject({
      notificationType: 'carrier_violation',
      originalTemplateId: 'new-tpl',
      defaultRecipientEmail: 'x@y.ee',
      active: false,
    });
    expect(await screen.findByText('notificationTemplateMapping.editedNote')).toBeTruthy();
  });

  it('valideerimisvead blokeerivad salvestamise', async () => {
    renderPage('carrier_violation');
    fireEvent.click(await screen.findByText('notificationTemplateMapping.edit'));
    fireEvent.change(document.getElementById('originalTemplateId')!, { target: { value: 'bad id!' } });
    fireEvent.change(document.getElementById('defaultRecipientEmail')!, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByText('notificationTemplateMapping.save'));
    expect(await screen.findByText('notificationTemplateMapping.validation.templateIdInvalid')).toBeTruthy();
    expect(screen.getByText('notificationTemplateMapping.validation.emailInvalid')).toBeTruthy();
    expect(saveNotificationTemplateMapping).not.toHaveBeenCalled();
  });

  it('serveri valideerimisviga kuvatakse väljal, muu viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveNotificationTemplateMapping).mockRejectedValueOnce(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'originalTemplateId', code: 'templateIdInvalid' }),
    );
    renderPage('carrier_violation');
    fireEvent.click(await screen.findByText('notificationTemplateMapping.edit'));
    fireEvent.click(screen.getByText('notificationTemplateMapping.save'));
    await waitFor(() => expect(saveNotificationTemplateMapping).toHaveBeenCalledTimes(1));
    vi.mocked(saveNotificationTemplateMapping).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByText('notificationTemplateMapping.save'));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it('tühistamine sulgeb muutmisvormi', async () => {
    renderPage('carrier_violation');
    fireEvent.click(await screen.findByText('notificationTemplateMapping.edit'));
    fireEvent.click(screen.getByText('notificationTemplateMapping.cancel'));
    expect(await screen.findByText('notificationTemplateMapping.edit')).toBeTruthy();
  });

  it('desktop-kanali muutmisvorm kasutab saajate välja ja keelevalikut', async () => {
    renderPage('driving_ban');
    fireEvent.click(await screen.findByText('notificationTemplateMapping.edit'));
    expect(await screen.findByText('Mari Maasikas (111)')).toBeTruthy();
    fireEvent.click(screen.getAllByText('notificationTemplateMapping.removeRecipient')[0]);
    fireEvent.click(screen.getByText('notificationTemplateMapping.save'));
    await waitFor(() => expect(saveNotificationTemplateMapping).toHaveBeenCalled());
    expect(vi.mocked(saveNotificationTemplateMapping).mock.calls[0][0].desktopRecipientPersonalCodes).toEqual(['222']);
  });

  it('API viga mappingu laadimisel', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listNotificationTemplateMappings).mockRejectedValue(new Error('x'));
    renderPage('carrier_violation');
    expect(await screen.findByText('common.error')).toBeTruthy();
    err.mockRestore();
  });
});
