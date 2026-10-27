// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrInfringementsSection } from './AdrInfringementsSection';
import type { ClassifierEntry } from '../../../classifiers/types';
import type { AdrCheckpointEntry } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediSelectOverride(),
}));

const items = [
  { code: 'RL10', name: '10. Veodokumendid', description: 'Märkus', classifierValueKey: 1, parentKey: null },
  { code: 'RL2', name: '2. Muu', description: undefined, classifierValueKey: 2, parentKey: null },
  { code: 'RL10_P17', name: 'VSI 856 – midagi', description: 'VSI', classifierValueKey: 11, parentKey: 1 },
  { code: 'RL10_P18', name: 'Nimi ilma koodita', description: undefined, classifierValueKey: 12, parentKey: 1 },
] as unknown as ClassifierEntry[];

const entry = (over: Partial<AdrCheckpointEntry> = {}): AdrCheckpointEntry => ({
  checkpointCode: 'RL10',
  inspectionStatus: '',
  infringementDetected: false,
  records: [],
  ...over,
});

const setup = (entries: Record<string, AdrCheckpointEntry> = {}, props: Record<string, unknown> = {}) => {
  const handlers = {
    setCheckpoint: vi.fn(),
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    removeRecord: vi.fn(),
  };
  const getCheckpoint = (code: string) => entries[code] ?? { ...entry(), checkpointCode: code };
  render(<AdrInfringementsSection items={items} getCheckpoint={getCheckpoint} {...handlers} {...props} />);
  return handlers;
};

describe('AdrInfringementsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reports a missing classifier', () => {
    render(<AdrInfringementsSection items={[]} getCheckpoint={() => entry()} setCheckpoint={vi.fn()} addRecord={vi.fn()} updateRecord={vi.fn()} removeRecord={vi.fn()} />);
    expect(screen.getByText('forms.adr.infringements.classifierMissing')).toBeTruthy();
  });

  it('renders checkpoints in numeric order with description in the heading', () => {
    setup();
    const headings = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(['2. Muu', '10. Veodokumendid (Märkus)']);
  });

  it('sets the inspection status and clears details when it is not C', () => {
    const { setCheckpoint } = setup();
    fireEvent.click(document.getElementById('adr-cp-RL10-status-C')!);
    expect(setCheckpoint).toHaveBeenCalledWith('RL10', { inspectionStatus: 'C' });
    fireEvent.click(document.getElementById('adr-cp-RL10-status-NC')!);
    expect(setCheckpoint).toHaveBeenCalledWith('RL10', { inspectionStatus: 'NC', infringementDetected: false, records: [] });
  });

  it('collects the reason for not checked or not applicable', () => {
    const { setCheckpoint } = setup({ RL10: entry({ inspectionStatus: 'NC', notCheckedReason: 'põhjus' }), RL2: entry({ checkpointCode: 'RL2', inspectionStatus: 'NA' }) });
    fireEvent.change(document.getElementById('adr-cp-RL10-reason')!, { target: { value: 'uus' } });
    expect(setCheckpoint).toHaveBeenCalledWith('RL10', { notCheckedReason: 'uus' });
    expect((document.getElementById('adr-cp-RL2-reason') as HTMLInputElement).value).toBe('');
  });

  it('creates a first record when an infringement is detected', () => {
    const { setCheckpoint } = setup({ RL10: entry({ inspectionStatus: 'C' }) });
    fireEvent.click(document.getElementById('adr-cp-RL10-detected-yes')!);
    expect(setCheckpoint).toHaveBeenCalledWith('RL10', {
      infringementDetected: true,
      records: [expect.objectContaining({ riskCategory: '', responsibleParticipants: [] })],
    });
  });

  it('keeps existing records when detected is chosen again, and clears them on "no"', () => {
    const rec = { riskCategory: 'I', adrReference: 'x', responsibleParticipants: [], reg2016403Code: null, reg2016403Severity: null, notes: '' };
    const { setCheckpoint } = setup({ RL10: entry({ inspectionStatus: 'C', infringementDetected: false, records: [rec as never] }) });
    fireEvent.click(document.getElementById('adr-cp-RL10-detected-yes')!);
    expect(setCheckpoint).toHaveBeenCalledWith('RL10', { infringementDetected: true, records: [rec] });
    cleanup();
    const second = setup({ RL10: entry({ inspectionStatus: 'C', infringementDetected: true, records: [rec as never] }) });
    fireEvent.click(document.getElementById('adr-cp-RL10-detected-no')!);
    expect(second.setCheckpoint).toHaveBeenCalledWith('RL10', { infringementDetected: false, records: [] });
  });

  it('lists, updates, removes and adds records', () => {
    const rec = { riskCategory: '', adrReference: '', responsibleParticipants: ['C'], reg2016403Code: null, reg2016403Severity: null, notes: '' };
    const { updateRecord, removeRecord, addRecord } = setup({
      RL10: entry({ inspectionStatus: 'C', infringementDetected: true, records: [rec as never, rec as never] }),
    });
    fireEvent.change(document.getElementById('adr-record-RL10-1-notes')!, { target: { value: 'n' } });
    expect(updateRecord).toHaveBeenCalledWith('RL10', 1, { notes: 'n' });
    fireEvent.change(document.getElementById('adr-record-RL10-0-reg')!, { target: { value: 'VSI 856' } });
    expect(updateRecord).toHaveBeenCalledWith('RL10', 0, expect.objectContaining({ reg2016403Code: 'VSI 856' }));
    fireEvent.click(screen.getAllByText('forms.adr.infringements.removeRecord')[0]);
    expect(removeRecord).toHaveBeenCalledWith('RL10', 0);
    fireEvent.click(screen.getByText('forms.adr.infringements.addRecord'));
    expect(addRecord).toHaveBeenCalledWith('RL10');
  });

  it('is read-only when disabled', () => {
    const { setCheckpoint, addRecord } = setup(
      { RL10: entry({ inspectionStatus: 'C', infringementDetected: true, records: [] }), RL2: entry({ checkpointCode: 'RL2', inspectionStatus: 'NC' }) },
      { disabled: true },
    );
    fireEvent.click(document.getElementById('adr-cp-RL10-status-NC')!);
    fireEvent.click(document.getElementById('adr-cp-RL10-detected-no')!);
    fireEvent.change(document.getElementById('adr-cp-RL2-reason')!, { target: { value: 'x' } });
    expect(setCheckpoint).not.toHaveBeenCalled();
    expect(addRecord).not.toHaveBeenCalled();
    expect(screen.queryByText('forms.adr.infringements.addRecord')).toBeNull();
  });
});
