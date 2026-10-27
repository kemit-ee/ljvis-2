// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DefectSelectionModal } from './DefectSelectionModal';
import type { ClassifierEntry } from '../../../classifiers/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const defects = [
  { code: 'D1', name: 'Defekt üks', description: 'VO, OV' },
  { code: 'D2', name: 'Defekt kaks', description: 'OV,EOV' },
  { code: 'D3', name: 'Defekt kolm', description: undefined },
] as ClassifierEntry[];

const renderModal = (over: Partial<Parameters<typeof DefectSelectionModal>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    partCode: 'CAA_1',
    partName: 'Rool',
    defects,
    existingDefects: [],
    onConfirm: vi.fn(),
    ...over,
  };
  render(<DefectSelectionModal {...props} />);
  return props;
};

describe('DefectSelectionModal', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('asks for at least one selection before confirming', () => {
    const props = renderModal();
    fireEvent.click(screen.getByText('forms.technical_check.defectModal.select'));
    expect(screen.getByText('forms.technical_check.defectModal.selectAtLeastOne')).toBeTruthy();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('confirms the chosen severities, replacing and clearing selections', () => {
    const props = renderModal({ existingDefects: [{ partCode: 'CAA_1', defectCode: 'D2', severity: 'EOV' }] });
    fireEvent.click(document.getElementById('defect-D1-VO')!);
    fireEvent.click(document.getElementById('defect-D1-OV')!);
    fireEvent.click(document.getElementById('defect-D2-EOV')!);
    fireEvent.click(document.getElementById('defect-D2-OV')!);
    fireEvent.click(screen.getByText('forms.technical_check.defectModal.select'));
    expect(props.onConfirm).toHaveBeenCalledWith([
      { defectCode: 'D1', severity: 'OV' },
      { defectCode: 'D2', severity: 'OV' },
    ]);
  });

  it('removes a selection by clicking it again', () => {
    const props = renderModal();
    fireEvent.click(document.getElementById('defect-D1-VO')!);
    fireEvent.click(document.getElementById('defect-D2-OV')!);
    fireEvent.click(document.getElementById('defect-D2-OV')!);
    fireEvent.click(screen.getByText('forms.technical_check.defectModal.select'));
    expect(props.onConfirm).toHaveBeenCalledWith([{ defectCode: 'D1', severity: 'VO' }]);
  });

  it('uses the id prefix and shows a message when there are no defects', () => {
    renderModal({ defects: [], idPrefix: 'trl' });
    expect(screen.getByText('forms.technical_check.defectModal.noDefects')).toBeTruthy();
  });

  it('prefixes ids and closes through cancel', () => {
    const props = renderModal({ idPrefix: 'trl' });
    expect(document.querySelector('[name="trl-defect-D1"]')).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('renders nothing visible when closed', () => {
    renderModal({ open: false });
    expect(screen.queryByText('Defekt üks')).toBeNull();
  });
});
