// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrOtherInfringementsSection } from './AdrOtherInfringementsSection';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { AdrOtherInfringementEntry } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediSelectOverride(),
}));

const items = [
  { code: 'RL10', name: '10. Veodokumendid', classifierValueKey: 1, parentKey: null },
  { code: 'RL10_P17', name: 'VSI 856 – midagi', description: 'VSI', classifierValueKey: 11, parentKey: 1 },
  { code: 'RL11_P2', name: 'VSI 856 – duplikaat', description: 'VSI', classifierValueKey: 12, parentKey: 1 },
  { code: 'RL0011_P3', name: 'Ilma koodita', description: undefined, classifierValueKey: 13, parentKey: 1 },
] as unknown as ClassifierEntry[];

const rec = { riskCategory: '', adrReference: '', responsibleParticipants: ['C'], reg2016403Code: null, reg2016403Severity: null, notes: '' };
const other = (over: Partial<AdrOtherInfringementEntry> = {}): AdrOtherInfringementEntry => ({
  title: 'Oma',
  inspectionStatus: '',
  infringementDetected: false,
  records: [],
  ...over,
} as AdrOtherInfringementEntry);

const setup = (entries: AdrOtherInfringementEntry[], disabled = false) => {
  const h = {
    addOtherInfringement: vi.fn(),
    updateOtherInfringement: vi.fn(),
    removeOtherInfringement: vi.fn(),
    addOtherRecord: vi.fn(),
    updateOtherRecord: vi.fn(),
    removeOtherRecord: vi.fn(),
  };
  render(<AdrOtherInfringementsSection items={items} entries={entries} disabled={disabled} {...h} />);
  return h;
};

describe('AdrOtherInfringementsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the empty message and adds an entry', () => {
    const { addOtherInfringement } = setup([]);
    expect(screen.getByText('forms.adr.otherInfringements.empty')).toBeTruthy();
    fireEvent.click(screen.getByText('forms.adr.otherInfringements.addRow'));
    expect(addOtherInfringement).toHaveBeenCalled();
  });

  it('edits the title, status and removes the entry', () => {
    const h = setup([other()]);
    fireEvent.change(document.getElementById('adr-other-0-title')!, { target: { value: 'Uus' } });
    expect(h.updateOtherInfringement).toHaveBeenCalledWith(0, { title: 'Uus' });
    fireEvent.click(document.getElementById('adr-other-0-status-C')!);
    expect(h.updateOtherInfringement).toHaveBeenCalledWith(0, { inspectionStatus: 'C' });
    fireEvent.click(document.getElementById('adr-other-0-status-NA')!);
    expect(h.updateOtherInfringement).toHaveBeenCalledWith(0, { inspectionStatus: 'NA', infringementDetected: false, records: [] });
    fireEvent.click(screen.getByText('forms.adr.otherInfringements.remove'));
    expect(h.removeOtherInfringement).toHaveBeenCalledWith(0);
  });

  it('edits the not-checked reason', () => {
    const h = setup([other({ inspectionStatus: 'NC', notCheckedReason: 'a' })]);
    fireEvent.change(document.getElementById('adr-other-0-reason')!, { target: { value: 'b' } });
    expect(h.updateOtherInfringement).toHaveBeenCalledWith(0, { notCheckedReason: 'b' });
  });

  it('adds a first record when an infringement is detected and handles later toggles', () => {
    const h = setup([other({ inspectionStatus: 'C' })]);
    fireEvent.click(document.getElementById('adr-other-0-detected-yes')!);
    expect(h.updateOtherInfringement).toHaveBeenCalledWith(0, { infringementDetected: true });
    expect(h.addOtherRecord).toHaveBeenCalledWith(0);
    cleanup();
    const keep = setup([other({ inspectionStatus: 'C', records: [rec as never] })]);
    fireEvent.click(document.getElementById('adr-other-0-detected-yes')!);
    expect(keep.updateOtherInfringement).toHaveBeenCalledWith(0, { infringementDetected: true, records: [rec] });
    cleanup();
    const no = setup([other({ inspectionStatus: 'C', infringementDetected: true, records: [rec as never] })]);
    fireEvent.click(document.getElementById('adr-other-0-detected-no')!);
    expect(no.updateOtherInfringement).toHaveBeenCalledWith(0, { infringementDetected: false, records: [] });
  });

  it('manages records with a de-duplicated code list', () => {
    const h = setup([other({ inspectionStatus: 'C', infringementDetected: true, records: [rec as never] })]);
    const options = Array.from((document.getElementById('adr-record-other-0-0-reg') as HTMLSelectElement).options).map((o) => o.value);
    expect(options.filter((v) => v === 'VSI 856')).toHaveLength(1);
    expect(options).toContain('NONE');
    fireEvent.change(document.getElementById('adr-record-other-0-0-notes')!, { target: { value: 'n' } });
    expect(h.updateOtherRecord).toHaveBeenCalledWith(0, 0, { notes: 'n' });
    fireEvent.click(screen.getByText('forms.adr.infringements.removeRecord'));
    expect(h.removeOtherRecord).toHaveBeenCalledWith(0, 0);
    fireEvent.click(screen.getByText('forms.adr.infringements.addRecord'));
    expect(h.addOtherRecord).toHaveBeenCalledWith(0);
  });

  it('is read-only when disabled', () => {
    const h = setup([other({ inspectionStatus: 'NC' }), other({ inspectionStatus: 'C', infringementDetected: true, records: [rec as never] })], true);
    fireEvent.change(document.getElementById('adr-other-0-title')!, { target: { value: 'x' } });
    fireEvent.change(document.getElementById('adr-other-0-reason')!, { target: { value: 'x' } });
    fireEvent.click(document.getElementById('adr-other-0-status-C')!);
    fireEvent.click(document.getElementById('adr-other-1-detected-no')!);
    expect(h.updateOtherInfringement).not.toHaveBeenCalled();
    expect(screen.queryByText('forms.adr.otherInfringements.addRow')).toBeNull();
    expect(screen.queryByText('forms.adr.otherInfringements.remove')).toBeNull();
  });
});
