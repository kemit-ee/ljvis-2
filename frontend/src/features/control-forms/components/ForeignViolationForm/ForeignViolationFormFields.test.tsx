// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    Select: stubs.SelectStub,
    TextField: stubs.TextFieldStub,
    Textarea: stubs.TextareaStub,
    ChoiceGroup: stubs.ChoiceGroupStub,
    ...stubs.AccordionStubs,
  };
});
vi.mock('../shared/MaskedDateField', async () => ({
  MaskedDateField: (await import('../../testing/tediStubs')).DateFieldStub,
}));
vi.mock('../shared/MaskedTimeField', async () => ({
  MaskedTimeField: (await import('../../testing/tediStubs')).TimeFieldStub,
}));
vi.mock('../shared/FileUploadBlock.tsx', async () => ({
  FileUploadBlock: (await import('../../testing/commonStubs')).FileUploadBlockStub,
}));
vi.mock('../CompanyPickerModal', () => ({
  CompanyPickerModal: (p: { companies: unknown[]; onSelect: (c: unknown) => void; onClose: () => void }) => (
    <div>
      <button onClick={() => p.onSelect(p.companies[0])}>pick-company</button>
      <button onClick={p.onClose}>close-picker</button>
    </div>
  ),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({
    getByCode: () => [
      { code: 'LV', name: 'Läti', isValid: true },
      { code: 'EE', name: 'Eesti', isValid: true },
      { code: 'XX', name: 'Vana', isValid: false },
    ],
  }),
}));

import { ForeignViolationFormFields } from './ForeignViolationFormFields';

type Vals = Record<string, unknown>;

const setup = (opts: {
  values?: Vals;
  readOnly?: boolean;
  isDesktop?: boolean;
  touched?: Record<string, boolean>;
  errors?: Record<string, string>;
  props?: Record<string, unknown>;
}) => {
  const setFieldValue = vi.fn();
  const fns = {
    handleOrgChange: vi.fn(),
    handleStructuralUnitChange: vi.fn(),
    handleCompanyRegCodeSearch: vi.fn(),
    handleCompanyNameSearch: vi.fn(),
    handleVehicleSearch: vi.fn(),
    handleLicenceCopyNumberSearch: vi.fn(),
    handleCompanyCountyChange: vi.fn(),
    handleInspectionRegionChange: vi.fn(),
    setCompanySearchError: vi.fn(),
    setVehicleSearchError: vi.fn(),
    setLicenceCopyNumberError: vi.fn(),
    onCompanyPicked: vi.fn(),
    closeCompanyPicker: vi.fn(),
  };
  const values = {
    reportingCountryCode: 'LV',
    inspectionCountryCode: 'LV',
    companyCountryCode: 'LV',
    sanctionCode: 'KORRAS',
    recommendedMeasureCode: 'PUUDUVAD',
    violations: [],
    ...opts.values,
  };
  render(
    <ForeignViolationFormFields
      formik={{ values, errors: opts.errors ?? {}, touched: opts.touched ?? {}, setFieldValue } as never}
      readOnly={opts.readOnly ?? false}
      isDesktop={opts.isDesktop ?? true}
      orgOptions={[{ label: 'Org 1', value: 'O1' }]}
      structureUnits={[{ code: 'U1', name: 'Üksus 1' }]}
      counties={[{ id: 1, name: 'Harju' }]}
      companyCitiesParishes={[{ id: 11, name: 'Tallinn' }]}
      inspectionCitiesParishes={[{ id: 12, name: 'Tartu' }]}
      {...fns}
      {...opts.props}
    />,
  );
  return { setFieldValue, ...fns };
};

const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ForeignViolationFormFields (muutmine, välisfirma)', () => {
  it('sünkroniseerib kontrolli riigi teate saatnud riigiga', () => {
    const f = setup({ values: { inspectionCountryCode: 'EE', reportingCountryCode: 'LV' } });
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionCountryCode', 'LV');
  });

  it('tekstiväljad ja kuupäevad kutsuvad setFieldValue', () => {
    const f = setup({ values: { inspectionCountryCode: 'LV', inspectionTime: '10:30:00' } });
    for (const id of [
      'reportingAuthority', 'inspectionAddressLine1', 'inspectionAddressLine2', 'inspectionRegion', 'inspectionCity',
      'companyRegCode', 'companyName', 'companyAddressLine2', 'companyAddressLine1', 'companyCity', 'companyPostalCode',
      'driverFirstName', 'driverLastName', 'vehicleMake', 'vehicleModel', 'vehicleVin', 'vehicleBodyType',
      'licenceCopyNumber', 'violationDescription', 'inspectorFirstName', 'inspectorLastName', 'inspectorProfession',
      'sanctionNotes', 'recommendedMeasureGeneralNotes',
    ]) {
      type(id, 'x');
      expect(f.setFieldValue.mock.calls.some((c) => c[1] === 'x' && (c[0] === id || id === 'recommendedMeasureGeneralNotes'))).toBe(true);
    }
    type('vehicleRegNr', 'abc');
    expect(f.setFieldValue).toHaveBeenCalledWith('vehicleRegNr', 'ABC');
    type('minorViolationsCount', '1a2');
    expect(f.setFieldValue).toHaveBeenCalledWith('minorViolationsCount', '12');
    type('minorViolationsCount', 'x');
    expect(f.setFieldValue).toHaveBeenCalledWith('minorViolationsCount', '0');
    type('inspectionDate', '2026-01-02');
    type('vehicleFirstRegistration', '2020-01-02');
    type('dataEntryDate', '2026-03-04');
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionDate', '2026-01-02');
    type('inspectionTime', '10:45');
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionTime', '10:45:00');
    type('inspectionTime', '10:45:30');
    type('inspectionTime', '');
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionTime', '');
  });

  it('riikide valikud ja kontrolli riigi lukustus', () => {
    const f = setup({});
    type('reportingCountry', 'EE');
    expect(f.setFieldValue).toHaveBeenCalledWith('reportingCountryCode', 'EE');
    type('reportingCountry', 'nope');
    expect(f.setFieldValue).toHaveBeenCalledWith('reportingCountryCode', '');
    type('companyCountry', 'EE');
    expect(f.setFieldValue).toHaveBeenCalledWith('companyCountryCode', 'EE');
    expect(f.setFieldValue).toHaveBeenCalledWith('companyAddressLine2', '');
    type('vehicleCountry', 'LV');
    expect(f.setFieldValue).toHaveBeenCalledWith('vehicleCountryCode', 'LV');
    type('vehicleCountry', 'nope');
    fireEvent.change(screen.getByTestId('inspectionCountry'), { target: { value: 'EE' } });
    expect((screen.getByTestId('inspectionCountry') as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByText('Vana')).toBeNull();
  });

  it('otsingunupud, vead ja valija', () => {
    const f = setup({
      props: {
        companySearchError: true,
        vehicleSearchError: true,
        licenceCopyNumberError: true,
        companyPickerResults: [{ companyName: 'A' }],
      },
    });
    const search = screen.getAllByText('common.search');
    expect(search).toHaveLength(4);
    search.forEach((b) => fireEvent.click(b));
    expect(f.handleCompanyRegCodeSearch).toHaveBeenCalled();
    expect(f.handleCompanyNameSearch).toHaveBeenCalled();
    expect(f.handleVehicleSearch).toHaveBeenCalled();
    expect(f.handleLicenceCopyNumberSearch).toHaveBeenCalled();
    expect(screen.getAllByText('common.noResults')).toHaveLength(3);
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
    expect(f.setCompanySearchError).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByText('pick-company'));
    fireEvent.click(screen.getByText('close-picker'));
    expect(f.onCompanyPicked).toHaveBeenCalledWith({ companyName: 'A' });
    expect(f.closeCompanyPicker).toHaveBeenCalled();
  });

  it('ettevõtte teave: e-post, puuduv e-post, seotud isikud ja laadimine', () => {
    setup({
      values: { companyName: 'Firma', carrierRegistryEmail: '' },
      props: {
        associatedPersonsLoading: false,
        associatedPersons: [
          { firstName: 'Mari', nameOrBusinessName: 'Maasikas', roleText: 'Juhatuse liige' },
          { nameOrBusinessName: 'OÜ Äri', roleText: 'Osanik' },
          { nameOrBusinessName: 'Lõppenud', roleText: 'X', endDate: '2020-01-01' },
        ],
      },
    });
    expect(screen.getByText(/forms.foreign_violation.carrierRegistryEmailMissing/)).toBeTruthy();
    expect(screen.getByText('Mari Maasikas — Juhatuse liige')).toBeTruthy();
    expect(screen.getByText('OÜ Äri — Osanik')).toBeTruthy();
    expect(screen.queryByText(/Lõppenud/)).toBeNull();
  });

  it('e-posti olemasolul ja laadimisel', () => {
    setup({ values: { companyName: 'Firma', carrierRegistryEmail: 'a@b.ee' }, props: { associatedPersonsLoading: true } });
    expect(screen.getByText(/a@b.ee/)).toBeTruthy();
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('veateated kuvatakse väljade juures', () => {
    setup({
      touched: {
        reportingCountryCode: true, reportingAuthority: true, inspectionDate: true, inspectionTime: true,
        dataEntryDate: true, inspectorFirstName: true, inspectorLastName: true, inspectorOrganisationId: true,
      },
      errors: {
        reportingCountryCode: 'E1', reportingAuthority: 'E2', inspectionDate: 'E3', inspectionTime: 'E4',
        dataEntryDate: 'E5', inspectorFirstName: 'E6', inspectorLastName: 'E7', inspectorOrganisationId: 'E8',
      },
    });
    for (const e of ['E1', 'E2', 'E6', 'E7', 'E8']) expect(screen.getByText(e)).toBeTruthy();
  });

  it('inspektori organisatsioon ja üksus kasutavad lehe käsitlejaid', () => {
    const f = setup({ values: { inspectorOrganisationId: 'O1', inspectorUnit: 'U1' } });
    type('inspectorOrganisation', 'O1');
    type('inspectorUnit', 'U1');
    expect(f.handleOrgChange).toHaveBeenCalled();
    expect(f.handleStructuralUnitChange).toHaveBeenCalled();
    type('inspectorProfession', 'p');
  });

  it('käsitlejateta organisatsiooni ja üksuse valik ei kuku', () => {
    setup({ props: { handleOrgChange: undefined, handleStructuralUnitChange: undefined } });
    type('inspectorOrganisation', 'O1');
    type('inspectorUnit', 'U1');
  });

  it('üldine sanktsioon ja lisasanktsioonid', () => {
    const f = setup({ values: { additionalSanctionCodes: [] } });
    fireEvent.click(screen.getByTestId('sanctionCode_TRAHV'));
    expect(f.setFieldValue).toHaveBeenCalledWith('sanctionCode', 'TRAHV');
    fireEvent.click(screen.getByText('forms.foreign_violation.addSanction'));
    const extra = document.querySelector('[data-testid^="additionalSanctionCode_"]') as HTMLInputElement;
    fireEvent.click(extra);
    expect(f.setFieldValue).toHaveBeenCalledWith('additionalSanctionCodes', expect.any(Array));
    expect(screen.queryByTestId('additionalSanctionCode_KORRAS')).toBeNull();
  });

  it('lisasanktsioonid on nähtavad, kui need on olemas; soovituslik meede MUU', () => {
    const f = setup({ values: { additionalSanctionCodes: ['TRAHV'], recommendedMeasureCode: 'MUU' } });
    expect(document.querySelector('[data-testid^="additionalSanctionCode_"]')).toBeTruthy();
    type('recommendedMeasureNotes', 'märkus');
    expect(f.setFieldValue).toHaveBeenCalledWith('recommendedMeasureNotes', 'märkus');
    const measure = document.querySelector('[data-testid^="recommendedMeasureCode_"]') as HTMLInputElement;
    fireEvent.click(measure);
    expect(f.setFieldValue).toHaveBeenCalledWith('recommendedMeasureCode', expect.any(String));
  });

  it('ELi rikkumise valik säilitab teiste gruppide kirjed ja lisab uue', () => {
    const f = setup({ values: { violations: [{ code: 'OTHER-GROUP', sanctionCode: 'TRAHV' }] } });
    const firstBox = document.querySelector('[data-testid^="euViolation_"]') as HTMLInputElement;
    fireEvent.click(firstBox);
    const call = f.setFieldValue.mock.calls.find((c) => c[0] === 'violations')!;
    expect(call[1][0]).toEqual({ code: 'OTHER-GROUP', sanctionCode: 'TRAHV' });
    expect(call[1].length).toBe(2);
  });
});

describe('ForeignViolationFormFields (rikkumisega)', () => {
  const findCode = () => {
    setup({});
    const el = document.querySelector('[data-testid^="euViolation_"]') as HTMLElement;
    const code = el.getAttribute('data-testid')!.replace('euViolation_', '');
    cleanup();
    return code;
  };

  it('valitud rikkumine peidab üldised sanktsiooniplokid ja muudab selle välju', () => {
    const code = findCode();
    const f = setup({
      values: {
        violations: [{ code, sanctionCode: 'TRAHV', sanctionNotes: 'n', recommendedMeasureCode: 'MUU', requestedPenaltyCodes: ['FINE'] }],
      },
    });
    expect(screen.queryByTestId('sanctionCode_TRAHV')).toBeNull();
    fireEvent.click(screen.getByTestId(`violationSanction_${code}_HOIATUS`));
    expect(f.setFieldValue).toHaveBeenCalledWith(
      'violations',
      [expect.objectContaining({ code, sanctionCode: 'HOIATUS' })],
    );
    type(`violationSanctionNotes_${code}`, 'uus');
    expect(f.setFieldValue).toHaveBeenCalledWith(
      'violations',
      [expect.objectContaining({ code, sanctionNotes: 'uus' })],
    );
    const measure = document.querySelector(`[data-testid^="violationMeasure_${code}_"]`) as HTMLInputElement;
    fireEvent.click(measure);
    expect(f.setFieldValue).toHaveBeenCalledWith(
      'violations',
      [expect.objectContaining({ code, recommendedMeasureCode: expect.any(String) })],
    );
  });

  it('rikkumise märgistuses on rakendatud ja taotletud karistused', () => {
    const code = findCode();
    setup({
      values: { violations: [{ code, sanctionCode: 'TRAHV', requestedPenaltyCodes: ['FINE', 'BAN'] }] },
    });
    expect(screen.getByText(/forms.foreign_violation.requestedPenalty.FINE, forms.foreign_violation.requestedPenalty.BAN/)).toBeTruthy();
  });

  it('ainult taotletud karistus ilma rakendatud sanktsioonita, KORRAS ei näita rakendatud karistust', () => {
    const code = findCode();
    setup({ values: { violations: [{ code, sanctionCode: 'KORRAS', requestedPenaltyCodes: ['FINE'] }] } });
    expect(screen.getByText(/forms.foreign_violation.requestedPenalty.FINE/)).toBeTruthy();
  });
});

describe('ForeignViolationFormFields (eesti ettevõte/kontroll)', () => {
  it('maakonna ja linna valikud', () => {
    const f = setup({
      values: {
        companyCountryCode: 'EE',
        inspectionCountryCode: 'EE',
        reportingCountryCode: 'EE',
        companyAddressLine2: '1',
        inspectionRegion: '1',
      },
    });
    type('inspectionRegion', '1');
    expect(f.handleInspectionRegionChange).toHaveBeenCalled();
    type('inspectionCity', '12');
    expect(f.setFieldValue).toHaveBeenCalledWith('inspectionCity', '12');
    type('companyAddressLine2', '1');
    expect(f.handleCompanyCountyChange).toHaveBeenCalled();
    type('companyCity', '11');
    expect(f.setFieldValue).toHaveBeenCalledWith('companyCity', '11');
    type('inspectionRegion', 'nope');
    type('inspectionCity', 'nope');
    type('companyAddressLine2', 'nope');
    type('companyCity', 'nope');
  });
});

describe('ForeignViolationFormFields (teavitused ja haldus)', () => {
  it('teavituse linnukesed ja ajalugu', () => {
    const f = setup({
      values: {
        notificationHistory: [
          { type: 'carrier_violation', sentAt: '2026-01-01', recipientAddress: 'a@b.ee', status: 'sent' },
          { type: 'labor', sentAt: '2026-01-02', recipientAddress: '', status: 'queued' },
        ],
      },
    });
    fireEvent.click(screen.getByTestId('foreignAuthorityProposal'));
    expect(f.setFieldValue).toHaveBeenCalledWith('foreignAuthorityProposal', true);
    expect(f.setFieldValue).toHaveBeenCalledWith('notifyLaborInspector', true);
    fireEvent.click(screen.getByTestId('notifyCarrier'));
    expect(f.setFieldValue).toHaveBeenCalledWith('notifyCarrier', true);
    expect(screen.getByText(/2026-01-01/)).toBeTruthy();
    expect(screen.getByText(/queued/)).toBeTruthy();
  });

  it('juba märgitud ettepanek on lukus', () => {
    const f = setup({ values: { foreignAuthorityProposal: true, notifyCarrier: true } });
    expect((screen.getByTestId('foreignAuthorityProposal') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('notifyCarrier'));
    expect(f.setFieldValue).toHaveBeenCalledWith('notifyCarrier', false);
    expect(f.setFieldValue).not.toHaveBeenCalledWith('foreignAuthorityProposal', expect.anything());
  });

  it('haldusmenetluse sektsioon', () => {
    const f = setup({
      props: { showAdminSection: true },
      values: {
        klimClarificationDate: '2026-01-01',
        carrierExplanationDate: '2026-01-02',
        penaltyValidUntil: '2026-01-03',
        akvkNextMeetingDate: '2026-01-04',
        commissionLastDecisionDate: '2026-01-05',
        penaltyExpiredOrProcessed: true,
      },
    });
    for (const id of [
      'klimClarificationDate', 'carrierExplanationDate', 'penaltyValidUntil', 'akvkNextMeetingDate', 'commissionLastDecisionDate',
    ]) {
      type(id, '2027-02-02');
      expect(f.setFieldValue).toHaveBeenCalledWith(id, '2027-02-02');
    }
    type('adminProcedureDecision', 'otsus');
    expect(f.setFieldValue).toHaveBeenCalledWith('adminProcedureDecision', 'otsus');
    fireEvent.click(screen.getByTestId('penaltyExpiredOrProcessed'));
    expect(f.setFieldValue).toHaveBeenCalledWith('penaltyExpiredOrProcessed', false);
  });
});

describe('ForeignViolationFormFields (lugemine)', () => {
  it('ei võimalda muutmist ja peidab tühjad rikkumisegrupid', () => {
    const f = setup({
      readOnly: true,
      isDesktop: false,
      props: { showAdminSection: true },
      values: {
        companyName: 'Firma',
        additionalSanctionCodes: ['TRAHV'],
        notificationHistory: [],
        violations: [],
        penaltyExpiredOrProcessed: true,
      },
    });
    expect(screen.queryByText('common.search')).toBeNull();
    expect(screen.queryByText('forms.foreign_violation.addSanction')).toBeNull();
    fireEvent.click(screen.getByTestId('sanctionCode_TRAHV'));
    fireEvent.click(screen.getByTestId('penaltyExpiredOrProcessed'));
    fireEvent.click(screen.getByTestId('notifyCarrier'));
    expect(document.querySelector('[data-testid^="euViolation_"]')).toBeNull();
    const additional = document.querySelector('[data-testid^="additionalSanctionCode_"]') as HTMLInputElement;
    fireEvent.click(additional);
    fireEvent.click(screen.getByTestId('recommendedMeasureCode_PUUDUVAD'));
    expect(f.setFieldValue).not.toHaveBeenCalledWith('sanctionCode', expect.anything());
    expect(f.setFieldValue).not.toHaveBeenCalledWith('additionalSanctionCodes', expect.anything());
  });

  it('valitud rikkumine on näha, muutmine ei tee midagi', () => {
    setup({});
    const el = document.querySelector('[data-testid^="euViolation_"]') as HTMLElement;
    const code = el.getAttribute('data-testid')!.replace('euViolation_', '');
    cleanup();
    const f = setup({ readOnly: true, values: { violations: [{ code, sanctionCode: 'TRAHV' }] } });
    expect(screen.getByTestId(`euViolation_${code}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId(`euViolation_${code}`));
    fireEvent.click(screen.getByTestId(`violationSanction_${code}_HOIATUS`));
    const measure = document.querySelector(`[data-testid^="violationMeasure_${code}_"]`) as HTMLInputElement;
    fireEvent.click(measure);
    expect(f.setFieldValue).not.toHaveBeenCalledWith('violations', expect.anything());
  });
});
