// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechnicalCheckFormFields } from './TechnicalCheckFormFields';
import type { ClassifierEntry } from '../../../classifiers/types';

const perms = vi.hoisted(() => ({ list: new Set<string>() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: unknown) => (typeof o === 'string' ? key : key) }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => perms.list.has(p) }),
}));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../components/AdministrativeProcedureCard/AdministrativeProcedureCard', () => ({
  AdministrativeProcedureCard: (p: { formType: string; formKey: string }) => (
    <div data-testid="admin-card">{p.formType}:{p.formKey}</div>
  ),
}));
vi.mock('../../components/shared/FileUploadBlock', () => ({
  FileUploadBlock: (p: { formPath: string; formNumber: string }) => (
    <div data-testid="files">{p.formPath}:{p.formNumber}</div>
  ),
}));
vi.mock('../../components/shared/MaskedDateField', () => ({
  MaskedDateField: (p: { selected?: Date }) => <div data-testid="date">{p.selected ? 'set' : 'empty'}</div>,
}));

const parts = [
  { code: 'CAA_1', name: 'Rool', classifierValueKey: 1 },
  { code: 'CAA_2', name: 'Piduri', classifierValueKey: 2 },
] as ClassifierEntry[];
const defectsByPartKey = new Map<number, ClassifierEntry[]>([
  [1, [{ code: 'D1', name: 'Defekt üks', description: 'VO,OV,EOV' } as ClassifierEntry]],
]);
const euViolations = [
  { code: 'MSI203', name: 'Üks', description: 'MSI' },
  { code: 'VSI847', name: 'Kaks', description: 'VSI' },
  { code: 'SI926', name: 'Kolm', description: 'SI' },
] as ClassifierEntry[];

const baseValues = () => ({
  status: 'saved',
  subFormNumber: '',
  partsSummary: [{ partCode: 'CAA_1', checked: true, hasDefect: false }],
  partsDefects: [] as { partCode: string; defectCode: string; severity: string }[],
  resultType: 'ok',
  otherMeasure: false,
  resultTransportInterruption: false,
  transportInterruptionAutovs5131: false,
  proceedingType: '',
  proceedingReferenceNumber: '',
  notes: '',
  violations: [] as string[],
  extraordinaryInspectionDate: '',
  enforcementDecision: '',
  proceedingClosureBasis: '',
  trailerRegNr: '',
  id: '5',
});

const setup = (values: Record<string, unknown> = {}, props: Record<string, unknown> = {}, errors: Record<string, unknown> = {}) => {
  const formik = {
    values: { ...baseValues(), ...values },
    errors,
    setFieldValue: vi.fn(),
    setFieldTouched: vi.fn(),
  };
  const handlers = {
    applyPartDefects: vi.fn(),
    setPartChecked: vi.fn(),
    removeDefect: vi.fn(),
    setResultType: vi.fn(),
    toggleViolation: vi.fn(),
  };
  const allProps = {
    variant: 'vehicle',
    formik,
    parts,
    defectsByPartKey,
    euViolations,
    ...handlers,
    canEdit: true,
    isDesktop: true,
    ...props,
  } as unknown as Parameters<typeof TechnicalCheckFormFields>[0];
  const utils = render(<TechnicalCheckFormFields {...allProps} />);
  return { formik, ...handlers, ...utils };
};

const click = (id: string) => fireEvent.click(document.getElementById(id)!);

describe('TechnicalCheckFormFields', () => {
  beforeEach(() => {
    perms.list = new Set();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the vehicle form with the admin card and no file block', () => {
    setup();
    expect(screen.getByTestId('admin-card').textContent).toBe('vehicle-technical:5');
    expect(screen.queryByTestId('files')).toBeNull();
    expect(screen.queryByTestId('date')).toBeNull();
  });

  it('passes parts and defects through the table callbacks', () => {
    const { setPartChecked, applyPartDefects } = setup();
    click('vehicle-part-status-CAA_2-checked');
    expect(setPartChecked).toHaveBeenCalledWith('CAA_2', true);
    // vea lisamine avab dialoogi; kinnitus rakendab valiku
    click('vehicle-part-defect-CAA_2');
    fireEvent.click(screen.getByText('common.cancel'));
    click('vehicle-part-defect-CAA_1');
    click('defect-D1-OV');
    fireEvent.click(screen.getByText('forms.technical_check.defectModal.select'));
    expect(applyPartDefects).toHaveBeenCalledWith('CAA_1', [{ defectCode: 'D1', severity: 'OV' }]);
  });

  it('clears the defects of a part when the defect box is turned off', () => {
    const { applyPartDefects } = setup({
      partsSummary: [{ partCode: 'CAA_1', checked: true, hasDefect: true }],
      partsDefects: [{ partCode: 'CAA_1', defectCode: 'D1', severity: 'OV' }],
    });
    click('vehicle-part-defect-CAA_1');
    expect(applyPartDefects).toHaveBeenCalledWith('CAA_1', []);
  });

  it('removes a recorded defect', () => {
    const { removeDefect } = setup({
      partsSummary: [{ partCode: 'CAA_1', checked: true, hasDefect: true }],
      partsDefects: [{ partCode: 'CAA_1', defectCode: 'D1', severity: 'EOV' }],
    });
    fireEvent.click(screen.getAllByText('common.delete')[0]);
    expect(removeDefect).toHaveBeenCalledWith('CAA_1', 'D1');
  });

  it('shows the trailer registration number from the compound form or the form itself', () => {
    const { unmount } = setup({ trailerRegNr: 'FORM1' }, { variant: 'trailer', trailerIndex: 1, compoundTrailers: [{ regNr: 'A' }, { regNr: 'COMP2' }] });
    expect((document.getElementById('trailer-1-trailerRegNr') as HTMLInputElement).value).toBe('COMP2');
    unmount();
    setup({ trailerRegNr: 'FORM1' }, { variant: 'trailer' });
    expect((document.getElementById('trailer-trailerRegNr') as HTMLInputElement).value).toBe('FORM1');
  });

  it('shows the check error and closes it', () => {
    const onClose = vi.fn();
    setup({}, { checkError: 'viga', onCheckErrorClose: onClose });
    expect(screen.getByText('forms.technical_check.validation.checkError')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the check error when validation was triggered and the summary is invalid', () => {
    setup({}, { validationTriggered: true }, { partsSummary: 'x' });
    expect(screen.getByText('forms.technical_check.validation.checkError')).toBeTruthy();
  });

  it('selects result types and the other-measure flag', () => {
    const { setResultType, formik } = setup({ resultType: 'extraordinary_inspection' });
    click('vehicle-resultType-driving_ban');
    expect(setResultType).toHaveBeenCalledWith('driving_ban');
    click('vehicle-resultType-ok');
    expect(setResultType).toHaveBeenCalledWith('ok');
    expect(formik.setFieldValue).toHaveBeenCalledWith('otherMeasure', false);
    click('vehicle-otherMeasure-item');
    expect(formik.setFieldValue).toHaveBeenCalledWith('otherMeasure', true);
  });

  it('locks result options below the automatic level and shows a hint', () => {
    setup({ partsDefects: [{ partCode: 'CAA_1', defectCode: 'D1', severity: 'EOV' }, { partCode: 'CAA_10', defectCode: 'X', severity: 'EOV' }] });
    expect((document.getElementById('vehicle-resultType-ok') as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById('vehicle-resultType-extraordinary_inspection') as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById('vehicle-resultType-driving_ban') as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByText('forms.technical_check.result.autoLockedHint')).toBeTruthy();
  });

  it('locks only the ok option for an OV defect', () => {
    setup({ partsDefects: [{ partCode: 'CAA_1', defectCode: 'D1', severity: 'OV' }] });
    expect((document.getElementById('vehicle-resultType-ok') as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById('vehicle-resultType-extraordinary_inspection') as HTMLInputElement).disabled).toBe(false);
  });

  it('hides the other-measure selection from the result radio while it is on', () => {
    setup({ otherMeasure: true });
    expect((document.getElementById('vehicle-resultType-ok') as HTMLInputElement).checked).toBe(false);
    // „muu meede" avab menetluse ja rikkumiste osa
    expect(screen.getByText('forms.technical_check.violations.title')).toBeTruthy();
  });

  it('offers the transport interruption flag for a driving ban', () => {
    const { formik } = setup({ resultType: 'driving_ban' });
    click('vehicle-resultTransportInterruption-item');
    expect(formik.setFieldValue).toHaveBeenCalledWith('resultTransportInterruption', true);
  });

  it('edits the technical-assistance fields', () => {
    const { formik } = setup({ resultType: 'extraordinary_inspection_ta', eraYvMntAxles: true, eraYvMntRegnr: true, eraYvMntVintin: true, eraYvMntPlaces: true, eraYvMntRebuilt: true });
    click('vehicle-ta-places');
    expect(formik.setFieldValue).toHaveBeenCalledWith('eraYvMntPlaces', false);
    expect(formik.setFieldValue).toHaveBeenCalledWith('eraYvMntAxles', true);
    click('vehicle-ta-regnr');
    click('vehicle-ta-vintin');
    click('vehicle-ta-rebuilt');
    click('vehicle-ta-axles');
  });

  it('handles the proceeding block: type, reference number, clearing and the autovs flag', () => {
    const { formik } = setup({ resultType: 'extraordinary_inspection', proceedingType: 'summary', proceedingReferenceNumber: '12' }, {}, { proceedingReferenceNumber: 'nõutav' });
    click('vehicle-proceedingType-general');
    expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', 'general');
    fireEvent.change(document.getElementById('vehicle-proceedingReferenceNumber')!, { target: { value: '99' } });
    expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingReferenceNumber', '99');
    expect(screen.getByText('nõutav')).toBeTruthy();
    click('vehicle-transportInterruptionAutovs5131-item');
    expect(formik.setFieldValue).toHaveBeenCalledWith('transportInterruptionAutovs5131', true);

    fireEvent.click(document.getElementById('vehicle-clearProceeding')!);
    fireEvent.click(screen.getAllByText('forms.technical_check.result.clearProceeding').pop()!);
    expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', '');
    expect(formik.setFieldTouched).toHaveBeenCalledWith('proceedingReferenceNumber', false, false);
  });

  it('uses the case number label for general proceedings and cancels the clear dialog', () => {
    setup({ resultType: 'driving_ban', proceedingType: 'general' });
    expect(screen.getByText('forms.technical_check.result.caseNumber')).toBeTruthy();
    fireEvent.click(document.getElementById('vehicle-clearProceeding')!);
    fireEvent.click(screen.getAllByText('common.cancel').pop()!);
  });

  it('writes notes and shows the counter hint / limit error', () => {
    const { formik, unmount } = setup({ notes: 'abc' });
    fireEvent.change(document.getElementById('vehicle-notes')!, { target: { value: 'uus' } });
    expect(formik.setFieldValue).toHaveBeenCalledWith('notes', 'uus');
    unmount();
    setup({ notes: 'x'.repeat(2000) });
  });

  it('toggles violations per category', () => {
    const { toggleViolation } = setup({ resultType: 'driving_ban', violations: ['VSI847'] });
    click('vehicle-violation-MSI203');
    expect(toggleViolation).toHaveBeenCalledWith('MSI203', true);
    click('vehicle-violation-VSI847');
    expect(toggleViolation).toHaveBeenCalledWith('VSI847', false);
  });

  it('skips empty violation categories', () => {
    setup({ resultType: 'driving_ban' }, { euViolations: [euViolations[0]] });
    expect(document.getElementById('vehicle-violation-VSI847')).toBeNull();
  });

  it('shows files and the x-road block for confirmed forms with outcome editing rights', () => {
    perms.list = new Set(['control_form.punishment_register']);
    const { formik } = setup({ status: 'confirmed', subFormNumber: 'TK-1', extraordinaryInspectionDate: '2026-01-02' });
    expect(screen.getByTestId('files').textContent).toBe('vehicle-technical:TK-1');
    expect(screen.getByTestId('date').textContent).toBe('set');
    fireEvent.change(document.getElementById('vehicle-enforcementDecision')!, { target: { value: 'otsus' } });
    fireEvent.change(document.getElementById('vehicle-proceedingClosureBasis')!, { target: { value: 'alus' } });
    expect(formik.setFieldValue).toHaveBeenCalledWith('enforcementDecision', 'otsus');
    expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingClosureBasis', 'alus');
  });

  it('keeps the x-road outcome read-only without the permission', () => {
    setup({ status: 'published', subFormNumber: 'TK-1' }, { variant: 'trailer', trailerIndex: 0 });
    expect(screen.getByTestId('files').textContent).toBe('trailer-technical:TK-1');
    expect((document.getElementById('trailer-0-enforcementDecision') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByTestId('date').textContent).toBe('empty');
  });

  it('is read-only when editing is not allowed', () => {
    const { setResultType, setPartChecked, formik, applyPartDefects } = setup(
      { resultType: 'driving_ban', proceedingType: 'summary', violations: ['MSI203'] },
      { canEdit: false },
    );
    fireEvent.click(document.getElementById('vehicle-resultType-ok')!);
    fireEvent.click(document.getElementById('vehicle-part-status-CAA_2-checked')!);
    fireEvent.click(document.getElementById('vehicle-otherMeasure-item')!);
    fireEvent.click(document.getElementById('vehicle-resultTransportInterruption-item')!);
    fireEvent.click(document.getElementById('vehicle-proceedingType-general')!);
    fireEvent.click(document.getElementById('vehicle-transportInterruptionAutovs5131-item')!);
    expect(setResultType).not.toHaveBeenCalled();
    expect(setPartChecked).not.toHaveBeenCalled();
    expect(applyPartDefects).not.toHaveBeenCalled();
    expect(formik.setFieldValue).not.toHaveBeenCalled();
    expect(document.getElementById('vehicle-clearProceeding')).toBeNull();
  });

  it('is read-only for technical-assistance fields too', () => {
    const { formik } = setup({ resultType: 'extraordinary_inspection_ta' }, { canEdit: false });
    fireEvent.click(document.getElementById('vehicle-ta-regnr')!);
    expect(formik.setFieldValue).not.toHaveBeenCalled();
  });
});
