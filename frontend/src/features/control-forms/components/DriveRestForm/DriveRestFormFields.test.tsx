// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  perms: [] as string[],
  setSpy: vi.fn(),
  modalProps: [] as Record<string, unknown>[],
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }) }));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return {
    ...(await orig<object>()),
    ChoiceGroup: stubs.ChoiceGroupStub,
    TextField: stubs.TextFieldStub,
    Textarea: stubs.TextareaStub,
    Checkbox: stubs.CheckboxStub,
    ...stubs.AccordionStubs,
  };
});
vi.mock('./ModalResultSection/ModalResultSection', () => ({
  ModalResultSection: (p: Record<string, unknown>) => {
    h.modalProps.push(p);
    return <div data-testid={`mrs-${String(p.type)}`} />;
  },
}));
vi.mock('./DocRightOtherSection', () => ({
  DocRightOtherSection: (p: { idPrefix?: string }) => <div data-testid="other-docs" data-prefix={p.idPrefix} />,
}));
vi.mock('../AdministrativeProcedureCard/AdministrativeProcedureCard', () => ({
  AdministrativeProcedureCard: (p: { formType: string }) => <div data-testid="admin-proc" data-type={p.formType} />,
}));
vi.mock('../shared/FileUploadBlock', async () => ({
  FileUploadBlock: (await import('../../testing/commonStubs')).FileUploadBlockStub,
}));

import { DriveRestFormFields } from './DriveRestFormFields';

const baseValues = {
  id: '5',
  subFormNumber: 'SP-1',
  status: 'saved',
  transportType: 'Veosevedu',
  transportEmptyRun: false,
  transportNature: '',
  transportNatureExempt: false,
  transportClasses: [],
  cabotageViolations: [],
  resultType: 'warning',
  additionalMeasure: '',
  proceedingType: '',
  proceedingReferenceNumber: '',
  documentChecks: [],
  otherDocuments: [],
  spApplicability: '',
  tachographTypeCode: '',
  tachographDataNotDownloaded: false,
  tachographNotes: '',
  checkedDaysCount: '',
  workDaysCount: '',
  otherActivityDaysCount: '',
  violations5612006: [],
  violations1652014: [],
  violations200215: [],
  violations5932008: [],
  violations20201057: [],
  massDimensionMeasurements: [],
  atpViolationFound: 'false',
  atpViolationDescription: '',
  enforcementDecision: '',
  proceedingClosureBasis: '',
  notes: '',
  liiniNumber: '',
  liiniNimetus: '',
  personFirstName: '',
  personLastName: '',
};

const code = (c: string, name = c, description?: string) => ({ code: c, name, description, classifierValueKey: 1 }) as never;

const transportClassItems = [
  code('REGULAR'), code('PASSENGER_REGULAR'), code('CABOTAGE'), code('ATP_PERISHABLE'), code('OTHER'),
];

interface HarnessProps {
  values?: Record<string, unknown>;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  type?: string;
  readOnly?: boolean;
  authority?: 'PPA' | 'TRAM';
  hide?: boolean;
  extra?: Record<string, unknown>;
}

function Harness({ values, errors, touched, type = 'driver', readOnly, authority, hide, extra }: HarnessProps) {
  const [vals, setVals] = useState<Record<string, unknown>>({ ...baseValues, ...values });
  const formik = {
    values: vals,
    errors: errors ?? {},
    touched: touched ?? {},
    setFieldValue: (f: string, v: unknown) => {
      h.setSpy(f, v);
      setVals((prev) => ({ ...prev, [f]: v }));
    },
  };
  return (
    <DriveRestFormFields
      type={type}
      formik={formik as never}
      isDesktop
      transportClassItems={transportClassItems}
      cargoCabotageViolations={[code('CC1', 'Veo kabotaaž', 'sev1')]}
      passengerCabotageViolations={[code('PC1', 'Sõitjate kabotaaž', 'sev2')]}
      docRightChecks={[]}
      docRightOtherDocs={[]}
      tachographTypes={[code('TG1', 'Digitaalne')]}
      drivingViolations={[]}
      massDimensions={[]}
      readOnly={readOnly}
      authority={authority}
      hideDriveRestExtras={hide}
      {...(extra as object)}
    />
  );
}

const click = (id: string) => fireEvent.click(screen.getByTestId(id));
const type_ = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });

beforeEach(() => {
  vi.clearAllMocks();
  h.perms = [];
  h.modalProps.length = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DriveRestFormFields – veoliik ja veoklass', () => {
  it('veoliigi, tühisõidu ja veo laadi valik', () => {
    render(<Harness />);
    click('transport_type_passenger');
    expect(h.setSpy).toHaveBeenCalledWith('transportType', 'Sõitjatevedu');
    click('transport_empty_run');
    expect(h.setSpy).toHaveBeenCalledWith('transportEmptyRun', true);
    click('transport_nature_own');
    expect(h.setSpy).toHaveBeenCalledWith('transportNature', 'Oma kulul');
    click('transport_nature_exempt');
    expect(h.setSpy).toHaveBeenCalledWith('transportNatureExempt', true);
  });

  it('veoliigi vahetus eemaldab mittesobivad veoklassid, dokumendid ja ATP', () => {
    render(
      <Harness
        values={{
          transportType: 'Veosevedu',
          transportClasses: [{ classCode: 'PASSENGER_REGULAR', className: 'x' }, { classCode: 'REGULAR', className: 'y' }],
          documentChecks: [{ documentCode: 'TEGEVUSLUBA_01' }, { documentCode: 'PLAIN' }],
        }}
      />,
    );
    expect(h.setSpy).toHaveBeenCalledWith('transportClasses', [{ classCode: 'REGULAR', className: 'y' }]);
    expect(h.setSpy).toHaveBeenCalledWith('documentChecks', [{ documentCode: 'PLAIN' }]);
    cleanup();
    h.setSpy.mockClear();
    render(
      <Harness
        values={{
          transportType: 'Sõitjatevedu',
          transportClasses: [{ classCode: 'ATP_PERISHABLE' }],
          documentChecks: [{ documentCode: 'TEGEVUSLUBA_02' }, { documentCode: 'TEGEVUSLOA_ARAKIRI_03' }, { documentCode: 'TEGEVUSLUBA_01' }],
          atpViolationFound: 'true',
          atpViolationDescription: 'kirjeldus',
        }}
      />,
    );
    expect(h.setSpy).toHaveBeenCalledWith('transportClasses', []);
    expect(h.setSpy).toHaveBeenCalledWith('documentChecks', [{ documentCode: 'TEGEVUSLOA_ARAKIRI_03' }, { documentCode: 'TEGEVUSLUBA_01' }]);
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationFound', 'false');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationDescription', '');
  });

  it('veoklasside valik ja kabotaaži alamvalikud (veosevedu)', () => {
    render(<Harness values={{ transportClasses: [{ classCode: 'CABOTAGE' }] }} />);
    click('REGULAR');
    expect(h.setSpy).toHaveBeenCalledWith('transportClasses', expect.arrayContaining([{ classCode: 'CABOTAGE', className: 'CABOTAGE' }, { classCode: 'REGULAR', className: 'REGULAR' }]));
    click('CC1');
    expect(h.setSpy).toHaveBeenCalledWith('cabotageViolations', [{ violationCode: 'CC1', severityCode: 'sev1' }]);
    click('OTHER');
    expect(h.setSpy).toHaveBeenCalledWith('transportClasses', expect.any(Array));
  });

  it('kabotaaži mahavõtmine nullib rikkumised; sõitjateveo alamvalikud', () => {
    render(<Harness values={{ transportType: 'Sõitjatevedu', transportClasses: [{ classCode: 'CABOTAGE' }] }} />);
    click('PC1');
    expect(h.setSpy).toHaveBeenCalledWith('cabotageViolations', [{ violationCode: 'PC1', severityCode: 'sev2' }]);
    click('CABOTAGE');
    expect(h.setSpy).toHaveBeenCalledWith('cabotageViolations', []);
  });

  it('TRAM sõitjateveol näitab liini väljad; meeskonnaliikme nimi on nähtav', () => {
    render(<Harness authority="TRAM" values={{ transportType: 'Sõitjatevedu' }} />);
    type_('liiniNumber', '12');
    type_('liiniNimetus', 'Tallinn–Tartu');
    expect(h.setSpy).toHaveBeenCalledWith('liiniNumber', '12');
    expect(h.setSpy).toHaveBeenCalledWith('liiniNimetus', 'Tallinn–Tartu');
    cleanup();
    render(<Harness type="teammate" values={{ personFirstName: 'Mari', personLastName: 'Maasikas' }} />);
    expect(screen.getByText('Mari Maasikas')).toBeTruthy();
    expect(screen.getByTestId('teammate-transport_type_cargo')).toBeTruthy();
    expect(screen.getByTestId('other-docs').getAttribute('data-prefix')).toBe('teammate-');
    expect(screen.getByTestId('admin-proc').getAttribute('data-type')).toBe('drive-rest-form/teammate');
  });

  it('meeskonnaliikme ploki puudumine tühja nime korral', () => {
    render(<Harness type="teammate" />);
    expect(screen.queryByText('forms.drive_rest.teammatePerson:')).toBeNull();
    expect(document.querySelector('#teammate-person-name')).toBeNull();
  });
});

describe('DriveRestFormFields – kontrolli tulemus ja menetlus', () => {
  it('"Korras" nullib menetluse väljad; hoiatusel ilmuvad lisameetmed (PPA raadio)', () => {
    render(<Harness values={{ resultType: 'warning' }} />);
    click('measure_arest');
    expect(h.setSpy).toHaveBeenCalledWith('additionalMeasure', 'arrest');
    click('result_korras');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingType', '');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingReferenceNumber', '');
    expect(h.setSpy).toHaveBeenCalledWith('additionalMeasure', '');
    expect(h.setSpy).toHaveBeenCalledWith('resultType', 'ok');
  });

  it('TRAM: märgukiri ja mitmikvalikuga lisameetmed', () => {
    render(<Harness authority="TRAM" values={{ resultType: 'warning', additionalMeasure: 'arrest' }} />);
    expect(screen.getByTestId('result_margukiri')).toBeTruthy();
    click('measure_juhtimiselt');
    expect(h.setSpy).toHaveBeenCalledWith('additionalMeasure', 'arrest,driving_ban');
  });

  it('väärteomenetlus: menetluse liigi valik, viitenumber ja ülejäänud liigid', () => {
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', proceedingType: '' }} />);
    click('proceeding_kiir');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingType', 'KIIR');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingReferenceNumber', '');
    type_('proceedingReferenceNumber', 'M-1');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingReferenceNumber', 'M-1');
    click('proceeding_lyhi');
    click('proceeding_yld');
  });

  it('menetlus keskmise liigiga näitab ees- ja tagaosa', () => {
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', proceedingType: 'KIIR' }} errors={{ proceedingReferenceNumber: 'E' }} touched={{ proceedingReferenceNumber: true }} />);
    expect(screen.getByTestId('proceeding_lyhi')).toBeTruthy();
    expect(screen.getByTestId('proceeding_yld')).toBeTruthy();
    click('proceeding_lyhi');
    click('proceeding_kiir');
    click('proceeding_yld');
  });

  it('menetlus esimese liigiga ja viimase liigiga', () => {
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', proceedingType: 'LYHI' }} />);
    expect(screen.queryByTestId('proceeding_lyhi')).toBeTruthy();
    click('proceeding_kiir');
    cleanup();
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', proceedingType: 'YLD' }} />);
    expect(screen.getByTestId('proceedingReferenceNumber')).toBeTruthy();
  });

  it('tundmatu menetluse liik ei renderda valikuid', () => {
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', proceedingType: 'ZZZ' }} />);
    expect(screen.queryByTestId('proceeding_lyhi')).toBeNull();
  });

  it('veateated ja tulemuse puudumine peidavad plokid', () => {
    render(<Harness values={{ resultType: '' }} touched={{ transportType: true, resultType: true }} errors={{ transportType: 'E1', resultType: 'E2' }} />);
    expect(screen.queryByTestId('mrs-docCheck')).toBeNull();
    expect(screen.queryByTestId('mrs-drivingViolation')).toBeNull();
  });
});

describe('DriveRestFormFields – sõidu- ja puhkeaja plokk', () => {
  it('rakendatavus, sõidumeeriku tüüp ja päevad', () => {
    render(<Harness values={{ resultType: 'ok' }} touched={{ spApplicability: true, workDaysCount: true }} errors={{ spApplicability: 'E', workDaysCount: 'Liiga palju' }} />);
    expect(screen.getByText('Liiga palju')).toBeTruthy();
    click('applicability_applied');
    expect(h.setSpy).toHaveBeenCalledWith('spApplicability', 'RAKENDATAKSE');
    click('tachograph_TG1');
    expect(h.setSpy).toHaveBeenCalledWith('tachographTypeCode', 'TG1');
    type_('checkedDaysCount', '1a2b3');
    expect(h.setSpy).toHaveBeenCalledWith('checkedDaysCount', '12');
    type_('workDaysCount', 'x');
    expect(h.setSpy).toHaveBeenCalledWith('workDaysCount', '0');
    type_('otherActivityDaysCount', '7');
    expect(h.setSpy).toHaveBeenCalledWith('otherActivityDaysCount', '7');
    click('tachographDataNotDownloadedCheckbox');
    expect(h.setSpy).toHaveBeenCalledWith('tachographDataNotDownloaded', true);
    type_('tachographNotes', 'märkus');
    expect(h.setSpy).toHaveBeenCalledWith('tachographNotes', 'märkus');
  });

  it('teammate selgitus ja ModalResultSection kolm eksemplari', () => {
    render(
      <Harness
        type="teammate"
        values={{ resultType: 'warning' }}
        extra={{ rooma1Violations: [code('R1')], postingViolations: [code('P1')] }}
      />,
    );
    expect(screen.getByText(/applicabilityRequiredExplanationTeammate/)).toBeTruthy();
    const driving = h.modalProps.filter((p) => p.type === 'drivingViolation');
    expect(driving.length).toBeGreaterThanOrEqual(3);
    expect(driving.some((p) => p.singleCheckbox)).toBe(true);
    expect(driving.some((p) => p.hideTitle)).toBe(true);
  });

  it('hideDriveRestExtras peidab sõidu-/puhkeaja, Rooma I, lähetamise, massi ja ATP plokid', () => {
    render(<Harness hide extra={{ rooma1Violations: [code('R1')] }} />);
    expect(screen.queryByTestId('mrs-drivingViolation')).toBeNull();
    expect(screen.queryByTestId('mrs-massDimension')).toBeNull();
    expect(screen.queryByTestId('applicability_applied')).toBeNull();
  });
});

describe('DriveRestFormFields – ATP, mass ja märkused', () => {
  it('autojuhi ATP: linnuke ja kirjeldus sünkroniseeruvad', () => {
    render(<Harness values={{ resultType: 'warning', atpViolationFound: 'false' }} touched={{ atpViolationDescription: true }} errors={{ atpViolationDescription: 'Nõutav' }} />);
    expect(screen.getByTestId('mrs-massDimension')).toBeTruthy();
    click('atpViolationFound');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationFound', 'true');
    type_('atpViolationDescription', 'kirjeldus');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationFound', 'true');
    type_('atpViolationDescription', '   ');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationFound', 'false');
    type_('atpViolationDescription', 'jälle');
    h.setSpy.mockClear();
    click('atpViolationFound');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationFound', 'false');
    expect(h.setSpy).toHaveBeenCalledWith('atpViolationDescription', '');
  });

  it('ATP on sõitjateveol keelatud; "korras" peidab massi/ATP', () => {
    render(<Harness values={{ resultType: 'warning', transportType: 'Sõitjatevedu' }} />);
    expect((screen.getByTestId('atpViolationFound') as HTMLInputElement).disabled).toBe(true);
    cleanup();
    render(<Harness values={{ resultType: 'ok' }} />);
    expect(screen.queryByTestId('mrs-massDimension')).toBeNull();
  });

  it('meeskonnaliikme ATP omaette plokis', () => {
    render(<Harness type="teammate" values={{ resultType: 'warning' }} />);
    expect(screen.getByTestId('teammate-atpViolationFound')).toBeTruthy();
    expect(screen.queryByTestId('mrs-massDimension')).toBeNull();
  });

  it('märkused: PPA "korras" peidab, TRAM näitab alati; kirjutamine', () => {
    render(<Harness values={{ resultType: 'ok' }} />);
    expect(screen.queryByTestId('sanctionNotes')).toBeNull();
    cleanup();
    render(<Harness authority="TRAM" values={{ resultType: 'ok' }} />);
    type_('sanctionNotes', 'märkus');
    expect(h.setSpy).toHaveBeenCalledWith('notes', 'märkus');
    expect(screen.queryByTestId('admin-proc')).toBeNull();
  });
});

describe('DriveRestFormFields – X-tee ja failid', () => {
  it('menetluse tulemuse väljad on keelatud ilma õiguseta ja muudetavad õigusega', () => {
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', status: 'confirmed', enforcementDecision: 'otsus' }} />);
    expect((screen.getByTestId('enforcementDecision') as HTMLTextAreaElement).disabled).toBe(true);
    cleanup();
    h.perms = ['control_form.punishment_register'];
    render(<Harness values={{ resultType: 'misdemeanor_proceedings', status: 'published', proceedingClosureBasis: 'alus' }} />);
    expect((screen.getByTestId('enforcementDecision') as HTMLTextAreaElement).disabled).toBe(false);
    type_('enforcementDecision', 'uus');
    type_('proceedingClosureBasis', 'uus2');
    expect(h.setSpy).toHaveBeenCalledWith('enforcementDecision', 'uus');
    expect(h.setSpy).toHaveBeenCalledWith('proceedingClosureBasis', 'uus2');
  });

  it('admini õigus ja readOnly', () => {
    h.perms = ['control_form.edit_locked'];
    render(<Harness readOnly values={{ resultType: 'misdemeanor_proceedings', status: 'confirmed' }} />);
    expect((screen.getByTestId('enforcementDecision') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByTestId('file-upload').getAttribute('data-disabled')).toBe('true');
  });

  it('failide ploki asukoht tuleb propsidest', () => {
    render(<Harness extra={{ filesFormType: 'tram-card', filesFormNumber: 'TRAM-1' }} />);
    expect(screen.getByTestId('file-upload').getAttribute('data-form-number')).toBe('TRAM-1');
  });
});
