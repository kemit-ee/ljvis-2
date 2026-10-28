// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefectsResultsTable } from './DefectsResultsTable';
import type { ClassifierEntry } from '../../../classifiers/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const part = { code: 'CAA_4', name: 'Rool', classifierValueKey: 4 } as ClassifierEntry;
const defect = { code: 'CAA_4_1', name: 'Mäng', classifierValueKey: 41 } as ClassifierEntry;

describe('DefectsResultsTable', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the empty state', () => {
    render(<DefectsResultsTable parts={[part]} defectsByPartKey={new Map()} partsDefects={[]} onRemove={vi.fn()} />);
    expect(screen.getByText('forms.technical_check.resultsTable.empty')).toBeTruthy();
  });

  it('lists defects with resolved names and removes a row', () => {
    const onRemove = vi.fn();
    render(
      <DefectsResultsTable
        parts={[part]}
        defectsByPartKey={new Map([[4, [defect]]])}
        partsDefects={[
          { partCode: 'CAA_4', defectCode: 'CAA_4_1', severity: 'OV' },
          { partCode: 'CAA_4', defectCode: 'MISSING', severity: 'VO' },
          { partCode: 'GONE', defectCode: 'X', severity: 'EOV' },
        ]}
        onRemove={onRemove}
      />,
    );
    expect(screen.getAllByText('4 — Rool').length).toBe(2);
    expect(screen.getByText('Mäng')).toBeTruthy();
    expect(screen.getByText('MISSING')).toBeTruthy();
    expect(screen.getByText('GONE')).toBeTruthy();
    fireEvent.click(screen.getAllByText('common.delete')[0]);
    expect(onRemove).toHaveBeenCalledWith('CAA_4', 'CAA_4_1');
  });

  it('disables delete buttons', () => {
    render(
      <DefectsResultsTable
        parts={[part]}
        defectsByPartKey={new Map()}
        partsDefects={[{ partCode: 'CAA_4', defectCode: 'A', severity: 'OV' }]}
        onRemove={vi.fn()}
        disabled
      />,
    );
    expect((screen.getByText('common.delete').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
