// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskScoresListPage } from './RiskScoresListPage';
import { listRiskScores } from '../../api';

let perms: string[] = ['risk_report.list'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../api', () => ({ listRiskScores: vi.fn() }));

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
  perms = ['risk_report.list'];
  vi.mocked(listRiskScores).mockResolvedValue({
    content: [
      { companyName: 'AS Test', companyRegCode: '123', riskScore: 12.345, riskBandCode: 'Punane', totalControls: 4 },
      { companyName: null, companyRegCode: '456', riskScore: null, riskBandCode: 'Hall', totalControls: 0 },
    ],
    total: 2,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RiskScoresListPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    render(<RiskScoresListPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('kuvab ridu, puuduvad väärtused asendatakse kriipsuga', async () => {
    render(<RiskScoresListPage />);
    expect(await screen.findByText('AS Test')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('–')).toBeTruthy();
    expect(screen.getByText('riskScores.bandPunane')).toBeTruthy();
  });

  it('filtrid rakenduvad "Otsi" nupuga ja tühistuvad "Tühjenda" nupuga', async () => {
    render(<RiskScoresListPage />);
    await screen.findByText('AS Test');
    fireEvent.change(screen.getByLabelText('riskScores.filterCompany'), { target: { value: 'AS' } });
    fireEvent.change(screen.getByLabelText('riskScores.filterRegCode'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('riskScores.search'));
    await waitFor(() =>
      expect(
        vi.mocked(listRiskScores).mock.calls.some(([, f]) => f?.companyName === 'AS' && f?.regCode === '12'),
      ).toBe(true),
    );
    fireEvent.click(screen.getByText('riskScores.clear'));
    await waitFor(() => {
      const last = vi.mocked(listRiskScores).mock.calls.at(-1)!;
      expect(last[1]).toEqual({});
    });
  });
});
