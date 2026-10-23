// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualJobsCard } from './ManualJobsCard';
import { runManualJob } from './api';

const showMessage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../shared/errors/ErrorContext', () => ({
  useErrorContext: () => ({ showMessage }),
}));
vi.mock('./api', () => ({ runManualJob: vi.fn() }));

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

beforeEach(() => showMessage.mockClear());
afterEach(cleanup);

const runButton = (job: string) => document.getElementById(`manual-job-run-${job}`) as HTMLButtonElement;

describe('ManualJobsCard', () => {
  it('käivitab töö ja näitab infoteadet', async () => {
    vi.mocked(runManualJob).mockResolvedValue({ job: 'j', total: 3, succeeded: 3, failures: 0, result: {} });
    render(<ManualJobsCard />);
    fireEvent.click(runButton('risk-score-recalc-sync'));
    await waitFor(() => expect(showMessage).toHaveBeenCalled());
    expect(runManualJob).toHaveBeenCalledWith('risk-score-recalc-sync');
    expect(showMessage.mock.calls[0][1]).toBe('info');
  });

  it('rikete korral hoiatus', async () => {
    vi.mocked(runManualJob).mockResolvedValue({ job: 'j', total: 3, succeeded: 2, failures: 1, result: {} });
    render(<ManualJobsCard />);
    fireEvent.click(runButton('etoimik-decision-sync'));
    await waitFor(() => expect(showMessage).toHaveBeenCalled());
    expect(showMessage.mock.calls[0][1]).toBe('warning');
  });

  it('API viga ei näita sõnumit ja nupp vabaneb', async () => {
    vi.mocked(runManualJob).mockRejectedValue(new Error('x'));
    render(<ManualJobsCard />);
    fireEvent.click(runButton('etoimik-decision-sync'));
    await waitFor(() => expect(runButton('etoimik-decision-sync').disabled).toBe(false));
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('töö jooksmise ajal on nupud keelatud', async () => {
    vi.mocked(runManualJob).mockReturnValue(new Promise(() => {}));
    render(<ManualJobsCard />);
    fireEvent.click(runButton('etoimik-decision-sync'));
    await waitFor(() => expect(runButton('risk-score-recalc-sync').disabled).toBe(true));
    expect(screen.getByText('xroadLogs.manualJobs.running')).toBeTruthy();
  });
});
