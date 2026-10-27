// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutboundReportModal } from './OutboundReportModal';
import { fetchOutboundRecipients } from './api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./api', () => ({ fetchOutboundRecipients: vi.fn() }));

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OutboundReportModal', () => {
  it('kuvab saajad nime, koodi, e-posti ja tulemusega', async () => {
    vi.mocked(fetchOutboundRecipients).mockResolvedValue([
      { id: '1', logId: 'L', personName: 'Mari', personCode: '123', personEmail: 'm@x.ee', sendingReport: 'ok' },
      { id: '2', logId: 'L', personName: 'Jüri', sendingReport: 'bounce' },
      { id: '3', logId: 'L', personCode: '999', sendingReport: 'ok' },
      { id: '4', logId: 'L', sendingReport: 'ok' },
    ]);
    render(<OutboundReportModal logId="L" onClose={vi.fn()} />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    expect(await screen.findByText('Mari (123)')).toBeTruthy();
    expect(screen.getByText('Jüri')).toBeTruthy();
    expect(screen.getByText('999')).toBeTruthy();
    expect(screen.getByText('bounce')).toBeTruthy();
    expect(screen.getAllByText('notifications.log.sent').length).toBe(3);
    expect(screen.getByText('m@x.ee')).toBeTruthy();
  });

  it('tühi nimekiri ja viga näitavad tühja teadet', async () => {
    vi.mocked(fetchOutboundRecipients).mockResolvedValue(null as never);
    render(<OutboundReportModal logId="L" onClose={vi.fn()} />);
    expect(await screen.findByText('notifications.empty')).toBeTruthy();
    cleanup();
    vi.mocked(fetchOutboundRecipients).mockRejectedValue(new Error('x'));
    render(<OutboundReportModal logId="L" onClose={vi.fn()} />);
    expect(await screen.findByText('notifications.empty')).toBeTruthy();
  });

  it('suletud modaal ei lae midagi; sulgemisnupp kutsub onClose', async () => {
    render(<OutboundReportModal logId={null} onClose={vi.fn()} />);
    expect(fetchOutboundRecipients).not.toHaveBeenCalled();
    cleanup();
    vi.mocked(fetchOutboundRecipients).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<OutboundReportModal logId="L" onClose={onClose} />);
    fireEvent.click(await screen.findByText('common.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
