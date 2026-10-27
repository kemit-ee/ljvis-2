// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdrFormFields } from './AdrFormFields';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'RL10', name: '10. Veodokumendid', parentKey: null, isValid: true },
      { code: 'RL11', name: '11. Vana', parentKey: null, isValid: false },
    ],
  }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => ({
  ...(await orig<object>()),
  ...(await import('../pageTestHarness')).tediSelectOverride(),
}));
vi.mock('./DangerousGoodsTable', async () => ({
  DangerousGoodsTable: (await import('../pageTestHarness')).cardStub('DangerousGoodsTable'),
}));
vi.mock('./AdrInfringementsSection', async () => ({
  AdrInfringementsSection: (await import('../pageTestHarness')).cardStub('AdrInfringementsSection'),
}));
vi.mock('./AdrOtherInfringementsSection', async () => ({
  AdrOtherInfringementsSection: (await import('../pageTestHarness')).cardStub('AdrOtherInfringementsSection'),
}));
vi.mock('../../components/shared/AddressFields', async () => ({
  AddressFields: (await import('../pageTestHarness')).cardStub('AddressFields'),
}));
vi.mock('../../components/ProceedingOutcomeFields/ProceedingOutcomeFields', async () => ({
  ProceedingOutcomeFields: (await import('../pageTestHarness')).cardStub('ProceedingOutcomeFields'),
}));
vi.mock('../../components/AdministrativeProcedureCard/AdministrativeProcedureCard', () => ({
  AdministrativeProcedureCard: (p: { formKey: string }) => <div data-testid="admin-card">{p.formKey}</div>,
}));
vi.mock('../../components/shared/FileUploadBlock.tsx', () => ({
  FileUploadBlock: (p: { formNumber: string }) => <div data-testid="files">{p.formNumber}</div>,
}));
vi.mock('../../components/shared/MaskedDateField', () => ({
  MaskedDateField: (p: { id: string; onSelect: (d?: Date) => void; selected?: Date }) => (
    <div>
      <button type="button" onClick={() => p.onSelect(new Date(2026, 0, 2))}>{`date:${p.id}`}</button>
      <button type="button" onClick={() => p.onSelect(undefined)}>{`date-clear:${p.id}`}</button>
      <span>{p.selected ? `sel:${p.id}` : ''}</span>
    </div>
  ),
}));

const baseValues = () => ({
  id: '3',
  status: 'saved',
  subFormNumber: '',
  driverAssistant: {} as Record<string, unknown>,
  driverAdrCertificateNumber: '',
  crewAdrCertificateNumber: '',
  assistantAdrCertificateNumber: '',
  lastLoadAddress: {},
  lastLoadDate: '',
  nextLoadAddress: {},
  dangerousGoods: [],
  exemptionApplied: false,
  exemptionAdrProvision: '',
  exemptionNotes: '',
  containerTypes: [] as string[],
  infringements: [] as unknown[],
  otherInfringements: [] as unknown[],
  resultType: 'ok',
  drivingBanApplied: false,
  transportInterruptionApplied: false,
  proceedingType: '',
  proceedingReferenceNumber: '',
  correctiveMeasures: [] as string[],
  sealOpened: false,
  sealOpenedDate: '',
  sealInstalledDate: '',
  notes: '',
  enforcementDecision: '',
  proceedingClosureBasis: '',
});

const setup = (values: Record<string, unknown> = {}, props: Record<string, unknown> = {}, formikExtra: Record<string, unknown> = {}) => {
  const formik = {
    values: { ...baseValues(), ...values },
    errors: {},
    touched: {},
    setFieldValue: vi.fn(),
    setFieldTouched: vi.fn(),
    ...formikExtra,
  };
  const fns = {
    setDriverAssistant: vi.fn(),
    setLastLoadAddress: vi.fn(),
    setNextLoadAddress: vi.fn(),
    addDangerousGood: vi.fn(),
    updateDangerousGood: vi.fn(),
    removeDangerousGood: vi.fn(),
    toggleCorrectiveMeasure: vi.fn(),
    toggleContainerType: vi.fn(),
    getCheckpoint: vi.fn(),
    setCheckpoint: vi.fn(),
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    removeRecord: vi.fn(),
    addOtherInfringement: vi.fn(),
    updateOtherInfringement: vi.fn(),
    removeOtherInfringement: vi.fn(),
    addOtherRecord: vi.fn(),
    updateOtherRecord: vi.fn(),
    removeOtherRecord: vi.fn(),
  };
  const onSearch = vi.fn();
  const utils = render(
    <AdrFormFields
      formik={formik as never}
      counties={[]}
      {...fns}
      canEdit
      isDesktop
      onSearch={onSearch}
      {...(props as object)}
    />,
  );
  return { formik, onSearch, ...fns, ...utils };
};

const click = (id: string) => fireEvent.click(document.getElementById(id)!);
const press = (label: string) => fireEvent.click(screen.getByText(label));

describe('AdrFormFields', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe('driver assistant', () => {
    it('is collapsed without data and can be opened and closed', () => {
      setup();
      expect(document.getElementById('driverAssistantPersonalCode')).toBeNull();
      press('forms.adr.driverAssistant.open');
      expect(document.getElementById('driverAssistantPersonalCode')).toBeTruthy();
      press('forms.adr.driverAssistant.close');
      expect(document.getElementById('driverAssistantPersonalCode')).toBeNull();
    });

    it('is open when assistant data exists, edits fields and searches', () => {
      const da = { personalCodeEe: '39001010000', firstName: 'A', lastName: 'B', citizenshipCode: 'EE', birthDate: '1990-01-01' };
      const { setDriverAssistant, onSearch } = setup({ driverAssistant: da });
      fireEvent.change(document.getElementById('driverAssistantPersonalCode')!, { target: { value: '1' } });
      expect(setDriverAssistant).toHaveBeenCalledWith({ ...da, personalCodeEe: '1' });
      fireEvent.change(document.getElementById('driverAssistantFirstName')!, { target: { value: 'X' } });
      expect(setDriverAssistant).toHaveBeenCalledWith({ ...da, firstName: 'X' });
      fireEvent.change(document.getElementById('driverAssistantLastName')!, { target: { value: 'Y' } });
      expect(setDriverAssistant).toHaveBeenCalledWith({ ...da, lastName: 'Y' });
      fireEvent.change(document.getElementById('driverAssistantCitizenship')!, { target: { value: 'LV' } });
      expect(setDriverAssistant).toHaveBeenCalledWith(expect.objectContaining({ citizenshipCode: 'LV' }));
      fireEvent.click(screen.getByTestId('clear-driverAssistantCitizenship'));
      expect(setDriverAssistant).toHaveBeenCalledWith(expect.objectContaining({ citizenshipCode: '' }));
      press('date:driverAssistantBirthDate');
      expect(setDriverAssistant).toHaveBeenCalledWith(expect.objectContaining({ birthDate: '2026-01-02' }));
      press('date-clear:driverAssistantBirthDate');
      press('common.search');
      expect(onSearch).toHaveBeenCalledWith('39001010000');
    });

    it('searches without a code set', () => {
      const { onSearch } = setup({ driverAssistant: { firstName: 'A' } });
      press('common.search');
      expect(onSearch).toHaveBeenCalledWith(undefined);
    });

    it('shows search alerts and closes them', () => {
      const onSearchErrorClose = vi.fn();
      const onSearchNotFoundClose = vi.fn();
      setup({ driverAssistant: { firstName: 'A' } }, { searchError: true, searchNotFound: true, onSearchErrorClose, onSearchNotFoundClose, formError: 'Üldine viga', searchLoading: true });
      expect(screen.getByText('Üldine viga')).toBeTruthy();
      for (const b of screen.getAllByLabelText('close')) fireEvent.click(b);
      expect(onSearchErrorClose).toHaveBeenCalled();
      expect(onSearchNotFoundClose).toHaveBeenCalled();
    });

    it('is read-only in view mode', () => {
      const { setDriverAssistant } = setup({ driverAssistant: { firstName: 'A', citizenshipCode: 'EE' } }, { canEdit: false });
      expect(screen.queryByText('common.search')).toBeNull();
      fireEvent.change(document.getElementById('view-driverAssistantFirstName')!, { target: { value: 'X' } });
      fireEvent.change(document.getElementById('view-driverAssistantLastName')!, { target: { value: 'X' } });
      fireEvent.change(document.getElementById('view-driverAssistantCitizenship')!, { target: { value: 'LV' } });
      fireEvent.click(screen.getByTestId('clear-view-driverAssistantCitizenship'));
      press('date:view-driverAssistantBirthDate');
      expect(setDriverAssistant).not.toHaveBeenCalled();
    });
  });

  describe('certificates, loads and dangerous goods', () => {
    it('edits certificate numbers', () => {
      const { formik } = setup();
      fireEvent.change(document.getElementById('driverAdrCertificateNumber')!, { target: { value: 'A' } });
      fireEvent.change(document.getElementById('crewAdrCertificateNumber')!, { target: { value: 'B' } });
      fireEvent.change(document.getElementById('assistantAdrCertificateNumber')!, { target: { value: 'C' } });
      expect(formik.setFieldValue).toHaveBeenCalledWith('driverAdrCertificateNumber', 'A');
      expect(formik.setFieldValue).toHaveBeenCalledWith('crewAdrCertificateNumber', 'B');
      expect(formik.setFieldValue).toHaveBeenCalledWith('assistantAdrCertificateNumber', 'C');
    });

    it('routes load addresses, the load date and dangerous goods callbacks', () => {
      const { setLastLoadAddress, setNextLoadAddress, formik, addDangerousGood, updateDangerousGood, removeDangerousGood } = setup(
        { lastLoadAddress: { countryCode: 'EE', city: 'T' }, lastLoadDate: '2026-01-01' },
        {},
        { errors: { dangerousGoods: [{ quantity: 'x' }] }, touched: { dangerousGoods: [{ quantity: true }] } },
      );
      const addressButtons = screen.getAllByText('AddressFields.onChange');
      fireEvent.click(addressButtons[0]);
      fireEvent.click(addressButtons[1]);
      expect(setLastLoadAddress).toHaveBeenCalled();
      expect(setNextLoadAddress).toHaveBeenCalled();
      press('date:lastLoadDate');
      expect(formik.setFieldValue).toHaveBeenCalledWith('lastLoadDate', '2026-01-02');
      press('date-clear:lastLoadDate');
      press('DangerousGoodsTable.onAdd');
      press('DangerousGoodsTable.onUpdate');
      press('DangerousGoodsTable.onRemove');
      press('DangerousGoodsTable.onQuantityBlur');
      expect(addDangerousGood).toHaveBeenCalled();
      expect(updateDangerousGood).toHaveBeenCalled();
      expect(removeDangerousGood).toHaveBeenCalled();
      expect(formik.setFieldTouched).toHaveBeenCalledWith('dangerousGoods[0].quantity', true);
    });

    it('marks all dangerous goods errors visible when the whole field is touched', () => {
      setup({}, {}, { touched: { dangerousGoods: 'x' } });
      expect(screen.getByTestId('DangerousGoodsTable')).toBeTruthy();
    });

    it('does nothing in view mode', () => {
      const { setLastLoadAddress, setNextLoadAddress, addDangerousGood, formik } = setup({}, { canEdit: false });
      const addressButtons = screen.getAllByText('AddressFields.onChange');
      fireEvent.click(addressButtons[0]);
      fireEvent.click(addressButtons[1]);
      press('date:view-lastLoadDate');
      press('DangerousGoodsTable.onAdd');
      press('DangerousGoodsTable.onUpdate');
      press('DangerousGoodsTable.onRemove');
      fireEvent.change(document.getElementById('view-driverAdrCertificateNumber')!, { target: { value: 'x' } });
      fireEvent.change(document.getElementById('view-crewAdrCertificateNumber')!, { target: { value: 'x' } });
      fireEvent.change(document.getElementById('view-assistantAdrCertificateNumber')!, { target: { value: 'x' } });
      expect(setLastLoadAddress).not.toHaveBeenCalled();
      expect(setNextLoadAddress).not.toHaveBeenCalled();
      expect(addDangerousGood).not.toHaveBeenCalled();
      expect(formik.setFieldValue).not.toHaveBeenCalled();
    });
  });

  describe('exemption and containers', () => {
    it('toggles the exemption and shows its details', () => {
      const { formik } = setup();
      click('exemptionApplied-true');
      expect(formik.setFieldValue).toHaveBeenCalledWith('exemptionApplied', true);
    });

    it('clears the provision when the exemption is turned off', () => {
      const { formik } = setup({ exemptionApplied: true, exemptionAdrProvision: '1.1' });
      click('exemptionApplied-false');
      expect(formik.setFieldValue).toHaveBeenCalledWith('exemptionAdrProvision', '');
      fireEvent.change(document.getElementById('exemptionAdrProvision')!, { target: { value: '2.2' } });
      fireEvent.change(document.getElementById('exemptionNotes')!, { target: { value: 'n' } });
      expect(formik.setFieldValue).toHaveBeenCalledWith('exemptionAdrProvision', '2.2');
      expect(formik.setFieldValue).toHaveBeenCalledWith('exemptionNotes', 'n');
    });

    it('shows the provision error when touched', () => {
      setup({ exemptionApplied: true }, {}, { touched: { exemptionAdrProvision: true }, errors: { exemptionAdrProvision: 'nõutav' } });
      expect(screen.getByText('nõutav')).toBeTruthy();
    });

    it('is read-only in view mode', () => {
      const { formik } = setup({ exemptionApplied: true, exemptionAdrProvision: 'x' }, { canEdit: false });
      click('view-exemptionApplied-false');
      fireEvent.change(document.getElementById('view-exemptionAdrProvision')!, { target: { value: 'y' } });
      fireEvent.change(document.getElementById('view-exemptionNotes')!, { target: { value: 'y' } });
      click('view-containerType-pakend');
      expect(formik.setFieldValue).not.toHaveBeenCalled();
    });

    it('adds and removes container types', () => {
      const { toggleContainerType } = setup({ containerTypes: ['paak'] });
      click('containerType-memu');
      expect(toggleContainerType).toHaveBeenCalledWith('memu', true);
      click('containerType-paak');
      expect(toggleContainerType).toHaveBeenCalledWith('paak', false);
    });
  });

  describe('infringement sections', () => {
    it('hides outdated checkpoints while editing and exposes them in view mode', () => {
      const { unmount } = setup();
      expect(screen.getByTestId('AdrInfringementsSection')).toBeTruthy();
      expect(screen.getByTestId('AdrOtherInfringementsSection')).toBeTruthy();
      unmount();
      setup({}, { canEdit: false });
      press('AdrInfringementsSection.getCheckpoint');
    });

    it('builds the read-only summary from checkpoint and other infringement notes', () => {
      setup({
        infringements: [
          { checkpointCode: 'RL10', records: [{ notes: 'märge üks' }] },
          { checkpointCode: 'RL99', records: undefined },
        ],
        otherInfringements: [
          { title: 'Oma', records: [{ notes: 'märge kaks' }] },
          { title: ' ', records: [{ notes: 'märge kolm' }] },
        ],
      });
      const summary = document.getElementById('infringementNotesSummary') as HTMLTextAreaElement;
      expect(summary.value).toBe(
        '10. Veodokumendid, Rikkumine 1: märge üks; Oma, Rikkumine 1: märge kaks; forms.adr.otherInfringements.fallbackLabel, Rikkumine 1: märge kolm',
      );
    });

    it('omits the summary and tolerates missing lists', () => {
      setup({ infringements: undefined, otherInfringements: undefined });
      expect(document.getElementById('infringementNotesSummary')).toBeNull();
    });
  });

  describe('result', () => {
    it('resets proceeding data when the result is ok', () => {
      const { formik } = setup({ resultType: 'warning' });
      click('resultType-ok');
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', '');
      expect(formik.setFieldValue).toHaveBeenCalledWith('correctiveMeasures', []);
      expect(formik.setFieldValue).toHaveBeenCalledWith('resultType', 'ok');
    });

    it('selects other result types and additional measures', () => {
      const { formik } = setup({ drivingBanApplied: true });
      click('resultType-misdemeanor_proceedings');
      expect(formik.setFieldValue).toHaveBeenCalledWith('resultType', 'misdemeanor_proceedings');
      click('transportInterruptionApplied');
      expect(formik.setFieldValue).toHaveBeenCalledWith('transportInterruptionApplied', true);
      expect(formik.setFieldValue).toHaveBeenCalledWith('drivingBanApplied', true);
      click('drivingBanApplied');
      expect(formik.setFieldValue).toHaveBeenCalledWith('drivingBanApplied', false);
    });

    it('shows the unselected proceeding types and picks one', () => {
      const { formik } = setup({ resultType: 'warning' });
      click('proceedingType-general');
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', 'general');
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingReferenceNumber', '');
    });

    it('splits the proceeding types around the selected first option', () => {
      const { formik } = setup({ resultType: 'warning', proceedingType: 'expedited', proceedingReferenceNumber: '5' }, {}, { touched: { proceedingReferenceNumber: true }, errors: { proceedingReferenceNumber: 'vigane number' } });
      expect(screen.getByText('vigane number')).toBeTruthy();
      fireEvent.change(document.getElementById('proceedingReferenceNumber')!, { target: { value: '6' } });
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingReferenceNumber', '6');
      click('proceedingType-general');
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', 'general');
    });

    it('splits the proceeding types around the selected last option', () => {
      const { formik } = setup({ resultType: 'warning', proceedingType: 'general' });
      expect(document.getElementById('proceedingReferenceNumber')?.getAttribute('placeholder')).toBe('forms.adr.result.misdemeanourCaseNumber');
      click('proceedingType-expedited');
      expect(formik.setFieldValue).toHaveBeenCalledWith('proceedingType', 'expedited');
    });

    it('toggles corrective measures', () => {
      const { toggleCorrectiveMeasure } = setup({ resultType: 'warning', correctiveMeasures: ['on_spot'] });
      click('correctiveMeasure-at_premises');
      expect(toggleCorrectiveMeasure).toHaveBeenCalledWith('at_premises', true);
      click('correctiveMeasure-on_spot');
      expect(toggleCorrectiveMeasure).toHaveBeenCalledWith('on_spot', false);
    });

    it('is inert in view mode', () => {
      const { formik, toggleCorrectiveMeasure } = setup(
        { resultType: 'warning', proceedingType: 'expedited', proceedingReferenceNumber: '1', sealOpened: true },
        { canEdit: false },
        { touched: { proceedingReferenceNumber: true }, errors: { proceedingReferenceNumber: 'peidus' } },
      );
      click('view-resultType-ok');
      click('view-drivingBanApplied');
      click('view-proceedingType-general');
      click('view-correctiveMeasure-on_spot');
      click('view-sealOpened-false');
      press('date:view-sealOpenedDate');
      press('date:view-sealInstalledDate');
      fireEvent.change(document.getElementById('view-proceedingReferenceNumber')!, { target: { value: '2' } });
      expect(formik.setFieldValue).not.toHaveBeenCalled();
      expect(toggleCorrectiveMeasure).not.toHaveBeenCalled();
      expect(screen.queryByText('peidus')).toBeNull();
    });

    it('handles the seal dates', () => {
      const { formik } = setup({ sealOpened: true, sealOpenedDate: '2026-01-01', sealInstalledDate: '2026-01-02' });
      press('date:sealOpenedDate');
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealOpenedDate', '2026-01-02');
      press('date:sealInstalledDate');
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealInstalledDate', '2026-01-02');
      press('date-clear:sealOpenedDate');
      press('date-clear:sealInstalledDate');
    });

    it('clears the seal dates when the seal is not opened', () => {
      const { formik } = setup({ sealOpened: true });
      click('sealOpened-false');
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealOpened', false);
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealOpenedDate', '');
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealInstalledDate', '');
    });

    it('opens the seal section', () => {
      const { formik } = setup();
      click('sealOpened-true');
      expect(formik.setFieldValue).toHaveBeenCalledWith('sealOpened', true);
      expect(formik.setFieldValue).not.toHaveBeenCalledWith('sealOpenedDate', '');
    });
  });

  describe('notes and extras', () => {
    it('writes notes and shows the validation error when touched', () => {
      const { formik, unmount } = setup({ notes: 'a' });
      fireEvent.change(document.getElementById('notes')!, { target: { value: 'b' } });
      expect(formik.setFieldValue).toHaveBeenCalledWith('notes', 'b');
      unmount();
      setup({ notes: 'a' }, {}, { touched: { notes: true }, errors: { notes: 'liiga pikk' } });
      expect(screen.getByText('liiga pikk')).toBeTruthy();
    });

    it('shows the counter as an error at the limit', () => {
      setup({ notes: 'x'.repeat(4000) });
      expect(screen.getByText('forms.adr.notes.counter')).toBeTruthy();
    });

    it('does not write notes in view mode and uses an empty placeholder', () => {
      const { formik } = setup({ notes: 'a' }, { canEdit: false });
      fireEvent.change(document.getElementById('view-notes')!, { target: { value: 'z' } });
      expect(formik.setFieldValue).not.toHaveBeenCalled();
    });

    it('forwards proceeding outcome changes and renders the admin card and files', () => {
      const { formik } = setup({ subFormNumber: 'ADR-1' });
      press('ProceedingOutcomeFields.onChange');
      expect(formik.setFieldValue).toHaveBeenCalled();
      expect(screen.getByTestId('admin-card').textContent).toBe('3');
      expect(screen.getByTestId('files').textContent).toBe('ADR-1');
    });
  });
});
