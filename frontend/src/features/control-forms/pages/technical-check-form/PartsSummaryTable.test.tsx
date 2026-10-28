// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartsSummaryTable } from './PartsSummaryTable';
import type { ClassifierEntry } from '../../../classifiers/types';

const media = vi.hoisted(() => ({ desktop: true }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => media.desktop }));

const parts = [
  { code: 'CAA_1', name: 'Rool', classifierValueKey: 1 },
  { code: 'CAA_2', name: 'Piduri', classifierValueKey: 2 },
  { code: 'CAA_3', name: 'Tuled', classifierValueKey: 3 },
  { code: 'NONUM', name: 'Muu', classifierValueKey: 4 },
] as ClassifierEntry[];

const defectsByPartKey = new Map<number, ClassifierEntry[]>([[2, [{ code: 'D1', name: 'Defekt üks' } as ClassifierEntry]]]);

const baseProps = () => ({
  parts,
  partsSummary: [
    { partCode: 'CAA_1', checked: true, hasDefect: false },
    { partCode: 'CAA_2', checked: true, hasDefect: true },
  ],
  onCheckedChange: vi.fn(),
  onDefectToggle: vi.fn(),
});

describe('PartsSummaryTable', () => {
  beforeEach(() => {
    media.desktop = true;
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([true, false])('toggles checked and defect flags (desktop=%s)', (desktop) => {
    media.desktop = desktop;
    const props = baseProps();
    render(<PartsSummaryTable {...props} idPrefix="veh" />);
    // CAA_3 puudub kokkuvõttest → vaikimisi kontrollimata
    fireEvent.click(document.getElementById('veh-part-status-CAA_3-checked')!);
    expect(props.onCheckedChange).toHaveBeenCalledWith('CAA_3', true);
    fireEvent.click(document.getElementById('veh-part-status-CAA_1-not-checked')!);
    expect(props.onCheckedChange).toHaveBeenCalledWith('CAA_1', false);
    fireEvent.click(document.getElementById('veh-part-defect-CAA_3')!);
    expect(props.onDefectToggle).toHaveBeenCalledWith('CAA_3', true);
    fireEvent.click(document.getElementById('veh-part-defect-CAA_2')!);
    expect(props.onDefectToggle).toHaveBeenCalledWith('CAA_2', false);
  });

  it('shows inline defects with remove and edit actions', () => {
    const props = baseProps();
    const onRemoveDefect = vi.fn();
    render(
      <PartsSummaryTable
        {...props}
        partsDefects={[
          { partCode: 'CAA_2', defectCode: 'D1', severity: 'EOV' },
          { partCode: 'CAA_2', defectCode: 'D2', severity: 'OV' },
          { partCode: 'CAA_2', defectCode: 'D3', severity: 'VO' },
        ]}
        defectsByPartKey={defectsByPartKey}
        onRemoveDefect={onRemoveDefect}
      />,
    );
    expect(screen.getByText('Defekt üks')).toBeTruthy();
    expect(screen.getByText('D2')).toBeTruthy();
    fireEvent.click(screen.getAllByText('common.delete')[0]);
    expect(onRemoveDefect).toHaveBeenCalledWith('CAA_2', 'D1');
    fireEvent.click(screen.getByText('forms.technical_check.parts.editDefects'));
    expect(props.onDefectToggle).toHaveBeenCalledWith('CAA_2', true);
  });

  it('shows only the edit action when the part has a defect flag but no recorded defects', () => {
    const props = baseProps();
    render(<PartsSummaryTable {...props} partsDefects={[]} defectsByPartKey={defectsByPartKey} />);
    expect(screen.getByText('forms.technical_check.parts.editDefects')).toBeTruthy();
    expect(screen.queryByText('common.delete')).toBeNull();
  });

  it('hides the defect block without defect data and when disabled', () => {
    const props = baseProps();
    const { rerender } = render(<PartsSummaryTable {...props} />);
    expect(screen.queryByText('forms.technical_check.parts.editDefects')).toBeNull();
    rerender(
      <PartsSummaryTable
        {...props}
        disabled
        partsDefects={[{ partCode: 'CAA_2', defectCode: 'D1', severity: 'OV' }]}
        defectsByPartKey={defectsByPartKey}
        onRemoveDefect={vi.fn()}
      />,
    );
    expect(screen.queryByText('forms.technical_check.parts.editDefects')).toBeNull();
    expect(screen.queryByText('common.delete')).toBeNull();
    fireEvent.click(document.getElementById('part-status-CAA_1-not-checked')!);
    fireEvent.click(document.getElementById('part-defect-CAA_1')!);
    expect(props.onCheckedChange).not.toHaveBeenCalled();
    expect(props.onDefectToggle).not.toHaveBeenCalled();
  });
});
