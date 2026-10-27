// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrInfringementRecordCard, REG_CODE_NONE } from './AdrInfringementRecordCard';
import type { AdrInfringementRecord } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediSelectOverride(),
}));

const regOptions = [
  { value: 'VSI 856', label: 'VSI 856 – midagi', severity: 'VSI' },
  { value: REG_CODE_NONE, label: 'Puudub', severity: null },
];

const record = (over: Partial<AdrInfringementRecord> = {}): AdrInfringementRecord => ({
  riskCategory: '',
  adrReference: '',
  responsibleParticipants: [],
  reg2016403Code: null,
  reg2016403Severity: null,
  notes: '',
  ...over,
});

const setup = (rec = record(), disabled = false) => {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  render(
    <AdrInfringementRecordCard index={1} idPrefix="CP" record={rec} regCodeOptions={regOptions} onChange={onChange} onRemove={onRemove} disabled={disabled} />,
  );
  return { onChange, onRemove };
};

describe('AdrInfringementRecordCard', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('edits the risk category, reference, participants and notes', () => {
    const { onChange } = setup(record({ responsibleParticipants: ['L'] }));
    fireEvent.click(document.getElementById('adr-record-CP-1-risk-II')!);
    expect(onChange).toHaveBeenCalledWith({ riskCategory: 'II' });
    fireEvent.change(document.getElementById('adr-record-CP-1-adr')!, { target: { value: '1.2.3' } });
    expect(onChange).toHaveBeenCalledWith({ adrReference: '1.2.3' });
    fireEvent.click(document.getElementById('adr-record-CP-1-participant-C')!);
    expect(onChange).toHaveBeenCalledWith({ responsibleParticipants: ['L', 'C'] });
    fireEvent.change(document.getElementById('adr-record-CP-1-notes')!, { target: { value: 'märge' } });
    expect(onChange).toHaveBeenCalledWith({ notes: 'märge' });
  });

  it('keeps the regulation code select disabled until the carrier is responsible', () => {
    setup();
    expect((document.getElementById('adr-record-CP-1-reg') as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText('forms.adr.infringements.regCodeDisabledHint')).toBeTruthy();
  });

  it('chooses a regulation code with its severity, the none option and clears it', () => {
    const { onChange } = setup(record({ responsibleParticipants: ['C'], reg2016403Code: 'VSI 856', reg2016403Severity: 'VSI' as never }));
    expect(screen.getByText('forms.adr.infringements.regSeverityAuto')).toBeTruthy();
    const reg = document.getElementById('adr-record-CP-1-reg')!;
    fireEvent.change(reg, { target: { value: REG_CODE_NONE } });
    expect(onChange).toHaveBeenCalledWith({ reg2016403Code: REG_CODE_NONE, reg2016403Severity: null });
    fireEvent.change(reg, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ reg2016403Code: null, reg2016403Severity: null });
    fireEvent.click(screen.getByTestId('clear-adr-record-CP-1-reg'));
  });

  it('applies the severity of the picked code', () => {
    const { onChange } = setup(record({ responsibleParticipants: ['C'] }));
    fireEvent.change(document.getElementById('adr-record-CP-1-reg')!, { target: { value: 'VSI 856' } });
    expect(onChange).toHaveBeenCalledWith({ reg2016403Code: 'VSI 856', reg2016403Severity: 'VSI' });
  });

  it('removes the record', () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getByText('forms.adr.infringements.removeRecord'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('is read-only when disabled', () => {
    const { onChange } = setup(record({ responsibleParticipants: ['C'] }), true);
    fireEvent.click(document.getElementById('adr-record-CP-1-risk-I')!);
    fireEvent.click(document.getElementById('adr-record-CP-1-participant-L')!);
    fireEvent.change(document.getElementById('adr-record-CP-1-adr')!, { target: { value: 'x' } });
    fireEvent.change(document.getElementById('adr-record-CP-1-notes')!, { target: { value: 'x' } });
    fireEvent.change(document.getElementById('adr-record-CP-1-reg')!, { target: { value: 'VSI 856' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('forms.adr.infringements.removeRecord')).toBeNull();
  });
});
