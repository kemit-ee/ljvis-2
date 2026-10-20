// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestCarrierNotification } from './RequestCarrierNotification';
import { requestCarrierNotification } from '../../api';

let permissions: string[] = [];
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => permissions.includes(p) }),
}));
vi.mock('../../api', () => ({ requestCarrierNotification: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('RequestCarrierNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions = ['sp_driver_form.write'];
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(['saved', 'draft', undefined])('is hidden for status %s', (status) => {
    const { container } = render(
      <RequestCarrierNotification formType="sp_driver" id={5} status={status} />,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('is hidden without the form write permission', () => {
    permissions = ['sp_driver_form.read'];
    const { container } = render(
      <RequestCarrierNotification formType="sp_driver" id={5} status="published" />,
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('requests the notification on a published form and reports it as sent', async () => {
    vi.mocked(requestCarrierNotification).mockResolvedValue({ requested: 'true', sent: 'true' });
    const { container, findByText } = render(
      <RequestCarrierNotification formType="sp_driver" id={5} status="published" />,
    );
    fireEvent.click(container.querySelector('button')!);
    expect(await findByText('forms.carrierNotification.sent')).toBeTruthy();
    expect(requestCarrierNotification).toHaveBeenCalledWith('sp_driver', 5);
  });

  it('says the notification goes out on publication for a confirmed form', async () => {
    vi.mocked(requestCarrierNotification).mockResolvedValue({ requested: 'true', sent: 'false' });
    const { container, findByText } = render(
      <RequestCarrierNotification formType="sp_driver" id={5} status="confirmed" />,
    );
    fireEvent.click(container.querySelector('button')!);
    expect(await findByText('forms.carrierNotification.queued')).toBeTruthy();
    await waitFor(() => expect(requestCarrierNotification).toHaveBeenCalledTimes(1));
  });

  it('warns when a published form could not be notified', async () => {
    vi.mocked(requestCarrierNotification).mockResolvedValue({ requested: 'true', sent: 'false' });
    const { container, findByText } = render(
      <RequestCarrierNotification formType="sp_driver" id={5} status="published" />,
    );
    fireEvent.click(container.querySelector('button')!);
    expect(await findByText('forms.carrierNotification.notSent')).toBeTruthy();
  });
});
