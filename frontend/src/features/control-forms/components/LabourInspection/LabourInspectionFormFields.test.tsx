// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    TextField: stubs.TextFieldStub,
    ChoiceGroup: stubs.ChoiceGroupStub,
    Checkbox: stubs.CheckboxStub,
  };
});
vi.mock('../shared/MaskedDateField', async () => ({
  MaskedDateField: (await import('../../testing/tediStubs')).DateFieldStub,
}));
vi.mock('../ProceedingOutcomeFields/ProceedingOutcomeFields', () => ({
  ProceedingOutcomeFields: (p: { onChange: (f: string, v: string) => void; status?: string }) => (
    <button onClick={() => p.onChange('enforcementDecision', 'D')}>outcome:{p.status ?? '-'}</button>
  ),
}));
vi.mock('../CompanyPickerModal', () => ({
  CompanyPickerModal: (p: { companies: unknown[]; onSelect: (c: unknown) => void; onClose: () => void }) => (
    <div>
      <button onClick={() => p.onSelect(p.companies[0])}>pick-company</button>
      <button onClick={p.onClose}>close-picker</button>
    </div>
  ),
}));
vi.mock('./ControlsMatrixTable', () => ({
  ControlsMatrixTable: (p: { onAddRow: (n: number) => void; onUpdateRow: (i: number, x: object) => void; onRemoveRow: (i: number) => void }) => (
    <div>
      <button onClick={() => p.onAddRow(1)}>matrix-add</button>
      <button onClick={() => p.onUpdateRow(0, {})}>matrix-update</button>
      <button onClick={() => p.onRemoveRow(0)}>matrix-remove</button>
    </div>
  ),
}));
vi.mock('./ViolationPickerModal', () => ({
  ViolationPickerModal: (p: { violationClassifiers: { code: string }[]; onAdd: (v: object) => void; onClose: () => void }) => (
    <div>
      <span data-testid="picker-codes">{p.violationClassifiers.map((c) => c.code).join(',')}</span>
      <button onClick={() => p.onAdd({ level1ValueKey: 1 })}>picker-add</button>
      <button onClick={p.onClose}>picker-close</button>
    </div>
  ),
}));

import { LabourInspectionFormFields } from './LabourInspectionFormFields';

const classifiers = [
  { classifierValueKey: 1, parentKey: null, code: 'TI_SP', name: 'SP', description: 'Kirjeldus' },
  { classifierValueKey: 2, parentKey: 1, code: 'X2', name: 'Tase2', description: 'Alus' },
  { classifierValueKey: 3, parentKey: 2, code: 'X3', name: 'Tase3', description: 'Kood' },
  { classifierValueKey: 4, parentKey: null, code: 'OTHER', name: 'Muu', description: '' },
  { classifierValueKey: 5, parentKey: 4, code: 'O5', name: 'Muu2' },
] as never[];

const baseValues = {
  inspectorName: 'Insp',
  inspectionDate: '2026-02-03',
  inspectionType: 'cargo',
  companyName: 'Firma',
  companyRegCode: '123',
  vehicleCount: '2',
  totalDriversCount: '5',
  controlsMatrix: [],
  prescriptionComposed: false,
  punishedPersonIdCode: 'P',
  punishedPersonFirstName: 'F',
  punishedPersonLastName: 'L',
  proceedingReferenceNumber: 'R',
  enforcementDecision: '',
  proceedingClosureBasis: '',
  violations: [],
};

const setup = (over: {
  values?: Record<string, unknown>;
  readOnly?: boolean;
  touched?: Record<string, boolean>;
  errors?: Record<string, string>;
  props?: Record<string, unknown>;
}) => {
  const fns = {
    setFieldValue: vi.fn(),
    addMatrixRow: vi.fn(),
    updateMatrixRow: vi.fn(),
    removeMatrixRow: vi.fn(),
    addViolation: vi.fn(),
    removeViolation: vi.fn(),
  };
  render(
    <LabourInspectionFormFields
      formik={{
        values: { ...baseValues, ...over.values },
        touched: over.touched ?? {},
        errors: over.errors ?? {},
        setFieldValue: fns.setFieldValue,
      } as never}
      gridClass="grid"
      readOnly={over.readOnly ?? false}
      transportTypes={[]}
      violationClassifiers={classifiers}
      addMatrixRow={fns.addMatrixRow}
      updateMatrixRow={fns.updateMatrixRow}
      removeMatrixRow={fns.removeMatrixRow}
      addViolation={fns.addViolation}
      removeViolation={fns.removeViolation}
      {...over.props}
    />,
  );
  return fns;
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LabourInspectionFormFields (muutmine)', () => {
  it('väljade muutmine kutsub setFieldValue', () => {
    const f = setup({ values: { prescriptionComposed: false } });
    const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    type('inspectorName', 'X');
    type('inspectionDate', '2026-01-01');
    type('companyName', 'C');
    type('companyRegCode', 'R');
    type('vehicleCount', '1a2');
    type('totalDriversCount', '3b');
    type('punishedPersonIdCode', 'a');
    type('punishedPersonFirstName', 'b');
    type('punishedPersonLastName', 'c');
    type('proceedingReferenceNumber', 'd');
    expect(f.setFieldValue).toHaveBeenCalledWith('vehicleCount', '12');
    expect(f.setFieldValue).toHaveBeenCalledWith('totalDriversCount', '3');
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionDate', '2026-01-01');
    fireEvent.click(screen.getByTestId('inspectionType_passenger'));
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionType', 'passenger');
    fireEvent.click(screen.getByTestId('prescriptionComposed'));
    expect(f.setFieldValue).toHaveBeenCalledWith('prescriptionComposed', true);
    fireEvent.click(screen.getByText('outcome:-'));
    expect(f.setFieldValue).toHaveBeenCalledWith('enforcementDecision', 'D');
  });

  it('maatriksi tagasikutsed jõuavad lehele', () => {
    const f = setup({});
    fireEvent.click(screen.getByText('matrix-add'));
    fireEvent.click(screen.getByText('matrix-update'));
    fireEvent.click(screen.getByText('matrix-remove'));
    expect(f.addMatrixRow).toHaveBeenCalledWith(1);
    expect(f.updateMatrixRow).toHaveBeenCalled();
    expect(f.removeMatrixRow).toHaveBeenCalledWith(0);
  });

  it('ettevõtte otsingunupud, viga ja valija', () => {
    const regSearch = vi.fn();
    const nameSearch = vi.fn();
    const setErr = vi.fn();
    const picked = vi.fn();
    const closePicker = vi.fn();
    setup({
      props: {
        handleCompanyRegSearch: regSearch,
        handleCompanyNameSearch: nameSearch,
        companySearchError: true,
        setCompanySearchError: setErr,
        companyPickerResults: [{ companyName: 'A' }],
        onCompanyPicked: picked,
        closeCompanyPicker: closePicker,
      },
    });
    const buttons = screen.getAllByText('forms.labour_inspection.companySearchButton');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(nameSearch).toHaveBeenCalled();
    expect(regSearch).toHaveBeenCalled();
    expect(screen.getByText('common.noResults')).toBeTruthy();
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
    fireEvent.click(screen.getByText('pick-company'));
    fireEvent.click(screen.getByText('close-picker'));
    expect(picked).toHaveBeenCalledWith({ companyName: 'A' });
    expect(closePicker).toHaveBeenCalled();
  });

  it('veateated kuvatakse väljade juures', () => {
    setup({
      touched: { inspectorName: true, inspectionDate: true, companyName: true, companyRegCode: true },
      errors: { inspectorName: 'E1', inspectionDate: 'E2', companyName: 'E3', companyRegCode: 'E4' },
    });
    for (const e of ['E1', 'E3', 'E4']) expect(screen.getByText(e)).toBeTruthy();
  });

  it('rikkumiste valija avamine, lisamine ja sulgemine; kuratoreeritud loend', () => {
    const f = setup({});
    expect(screen.getByText('common.tableIsEmpty')).toBeTruthy();
    fireEvent.click(screen.getByText('forms.labour_inspection.violations.add'));
    expect(screen.getByTestId('picker-codes').textContent).toBe('TI_SP,X2,X3');
    fireEvent.click(screen.getByText('picker-add'));
    expect(f.addViolation).toHaveBeenCalled();
    fireEvent.click(screen.getByText('picker-close'));
    expect(screen.queryByTestId('picker-codes')).toBeNull();
  });

  it('rikkumiste tabel grupeerib tasemete kaupa ja eemaldab rea', () => {
    const f = setup({
      values: {
        violations: [
          { level1ValueKey: 1, level2ValueKey: 2, level3ValueKey: 3, quantity: 4 },
          { level1ValueKey: 1, level2ValueKey: 99, quantity: 1 },
          { level1ValueKey: 4, level2ValueKey: 5, quantity: 2 },
          { level1ValueKey: 77, level2ValueKey: 5, quantity: 2 },
          { level1ValueKey: null, level2ValueKey: 5, quantity: 2 },
          { level1ValueKey: 'abc', level2ValueKey: 5, quantity: 2 },
        ],
      },
    });
    expect(screen.getByText('Kirjeldus — SP')).toBeTruthy();
    expect(screen.getByText('Muu')).toBeTruthy();
    expect(screen.getByText('77')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Tase3', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getAllByText('common.remove')[0]);
    expect(f.removeViolation).toHaveBeenCalledWith(0);
  });
});

describe('LabourInspectionFormFields (lugemine)', () => {
  it('näitab väärtusi tekstina, ilma sisestusväljadeta', () => {
    setup({
      readOnly: true,
      props: { formStatus: 'published' },
      values: {
        prescriptionComposed: true,
        violations: [{ level1ValueKey: 1, level2ValueKey: 2, quantity: 3 }],
      },
    });
    expect(screen.queryByTestId('inspectorName')).toBeNull();
    expect(screen.getByText('Firma', { exact: false })).toBeTruthy();
    expect(screen.getByText('common.yes')).toBeTruthy();
    expect(screen.getByText('forms.labour_inspection.inspectionTypeCargo')).toBeTruthy();
    expect(screen.getByText('outcome:published')).toBeTruthy();
    expect(screen.queryByText('forms.labour_inspection.violations.add')).toBeNull();
    expect(screen.queryByText('common.remove')).toBeNull();
  });

  it('tundmatu tüüp ja eitav ettekirjutus', () => {
    setup({ readOnly: true, values: { inspectionType: 'zzz', prescriptionComposed: false } });
    expect(screen.getByText('common.no')).toBeTruthy();
  });
});
