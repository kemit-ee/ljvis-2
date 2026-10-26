// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopRecipientsField } from './DesktopRecipientsField';
import { listUsers } from '../../../users/api';
import { resolveDesktopRecipientUsers } from '../../api';

let perms: string[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../../users/api', () => ({ listUsers: vi.fn() }));
vi.mock('../../api', () => ({ resolveDesktopRecipientUsers: vi.fn() }));

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
  perms = ['user.list.admin'];
  vi.mocked(resolveDesktopRecipientUsers).mockResolvedValue([
    { id: '1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111' },
  ]);
  vi.mocked(listUsers).mockResolvedValue({
    content: [
      { id: '2', firstName: 'Jüri', lastName: 'Tamm', personalCode: '222' },
      { id: '1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111' },
    ],
    total: 2,
  } as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Harness({ initial }: { initial: string[] }) {
  const [codes, setCodes] = useState(initial);
  return (
    <>
      <DesktopRecipientsField personalCodes={codes} onChange={setCodes} />
      <span data-testid="codes">{codes.join(',')}</span>
    </>
  );
}

describe('DesktopRecipientsField', () => {
  it('tühi nimekiri', () => {
    render(<Harness initial={[]} />);
    expect(screen.getByText('notificationTemplateMapping.desktopRecipientsEmpty')).toBeTruthy();
    expect(resolveDesktopRecipientUsers).not.toHaveBeenCalled();
  });

  it('lahendab olemasolevate saajate nimed ja eemaldab saaja', async () => {
    render(<Harness initial={['111']} />);
    expect(await screen.findByText('Mari Maasikas (111)')).toBeTruthy();
    fireEvent.click(screen.getByText('notificationTemplateMapping.removeRecipient'));
    expect(screen.getByTestId('codes').textContent).toBe('');
  });

  it('otsib (debounce), filtreerib valitud ja lisab saaja', async () => {
    render(<Harness initial={['111']} />);
    await screen.findByText('Mari Maasikas (111)');
    fireEvent.change(screen.getByPlaceholderText('notificationTemplateMapping.desktopRecipientsSearchPlaceholder'), {
      target: { value: 'Jür' },
    });
    expect(await screen.findByText('Jüri Tamm (222)')).toBeTruthy();
    expect(listUsers).toHaveBeenCalledWith('admin', { search: 'Jür', page: '1', pageSize: '10' });
    fireEvent.click(screen.getByText('notificationTemplateMapping.addRecipient'));
    expect(screen.getByTestId('codes').textContent).toBe('111,222');
  });

  it('lühike otsing tühjendab tulemused; kohaliku ulatusega kasutaja', async () => {
    perms = [];
    render(<Harness initial={[]} />);
    const input = screen.getByPlaceholderText('notificationTemplateMapping.desktopRecipientsSearchPlaceholder');
    fireEvent.change(input, { target: { value: 'abc' } });
    await waitFor(() => expect(listUsers).toHaveBeenCalledWith('local', expect.anything()));
    expect(await screen.findByText('Jüri Tamm (222)')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'ab' } });
    await waitFor(() => expect(screen.queryByText('Jüri Tamm (222)')).toBeNull());
  });
});
