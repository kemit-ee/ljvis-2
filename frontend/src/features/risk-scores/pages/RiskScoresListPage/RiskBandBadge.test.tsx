// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RiskBandBadge } from './RiskBandBadge';
import type { RiskBandCode } from '../../types';

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

describe('RiskBandBadge', () => {
  it.each(['Hall', 'Roheline', 'Kollane', 'Punane'] as RiskBandCode[])('kuvab %s sildi', (band) => {
    render(<RiskBandBadge band={band} />);
    expect(screen.getByText(`riskScores.band${band}`)).toBeTruthy();
  });

  it('tundmatu tase kuvatakse halli sildina', () => {
    render(<RiskBandBadge band={'X' as RiskBandCode} />);
    expect(screen.getByText('riskScores.bandHall')).toBeTruthy();
  });
});
