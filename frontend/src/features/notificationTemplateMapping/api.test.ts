import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  listNotificationTemplateMappings,
  resolveDesktopRecipientUsers,
  saveNotificationTemplateMapping,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('notificationTemplateMapping api', () => {
  it('list', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await listNotificationTemplateMappings();
    expect(get).toHaveBeenCalledWith('/v1/notification-template-mapping/list');
  });

  it('save teisendab väljad snake_case-iks', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ id: 1, notificationType: 'T' });
    await saveNotificationTemplateMapping({
      notificationType: 'T',
      originalTemplateId: 'tpl',
      channel: 'postkast',
      defaultLanguage: 'et',
      active: true,
      defaultRecipientEmail: 'a@b.ee',
      desktopRecipientPersonalCodes: ['1'],
    });
    expect(post).toHaveBeenCalledWith('/v1/notification-template-mapping/save', {
      notification_type: 'T',
      original_template_id: 'tpl',
      channel: 'postkast',
      default_language: 'et',
      active: true,
      default_recipient_email: 'a@b.ee',
      desktop_recipient_personal_codes: ['1'],
    });
  });

  it('resolve tühja nimekirjaga ei tee päringut', async () => {
    const get = vi.spyOn(client, 'get');
    expect(await resolveDesktopRecipientUsers([])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('resolve liidab isikukoodid komadega', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await resolveDesktopRecipientUsers(['1', '2']);
    expect(get).toHaveBeenCalledWith('/v1/notification-template-mapping/resolve-users', {
      personalCodes: '1,2',
    });
  });
});
