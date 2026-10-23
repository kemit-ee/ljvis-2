// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Entry = Record<string, unknown>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../../testing/tediStubs');
  return { ...(await orig<object>()), Search: stubs.SearchStub, Checkbox: stubs.CheckboxStub };
});
vi.mock('../CheckModal/MassDimensionModal', () => ({
  MassDimensionModal: (p: { isModalOpen: boolean; onConfirm: (e: Entry[]) => void; existingEntries: Entry[] }) => (
    <div data-testid="mass-modal" data-open={String(p.isModalOpen)} data-count={p.existingEntries.length}>
      <button
        onClick={() =>
          p.onConfirm([
            { level1Code: 'MASS', level1Name: 'Mass N3', level2Code: 'M3A', level2Name: 'Üle 40t', severity: 'raske', note: 'märkus' },
            { level1Code: 'MASS2', level1Name: 'Mass N2', level2Code: 'M2A', level2Name: 'Üle 12t', severity: '', note: '' },
          ])
        }
      >
        confirm-mass
      </button>
    </div>
  ),
}));
vi.mock('../CheckModal/DocCheckModal', () => ({
  DocCheckModal: (p: { level1Item: { code: string; name: string }; onConfirm: (e: Entry[]) => void }) => (
    <button
      onClick={() =>
        p.onConfirm([
          {
            level1Code: p.level1Item.code,
            level1Name: p.level1Item.name,
            level2Code: 'DOC2',
            level2Name: 'Dokument 2',
            level3Code: 'DOC3',
            level3Name: 'Kood',
            severity: '',
          },
        ])
      }
    >
      confirm-doc:{p.level1Item.code}
    </button>
  ),
}));
vi.mock('../CheckModal/DrivingViolationModal', () => ({
  DrivingViolationModal: (p: { level1Item: { code: string; name: string }; onConfirm: (e: Entry[]) => void }) => (
    <button
      onClick={() =>
        p.onConfirm([
          {
            level1Code: p.level1Item.code,
            level1Name: p.level1Item.name,
            level2Code: 'V2',
            level2Name: 'Vahe',
            level2Description: 'kirjeldus',
            level3Code: 'V3',
            level3Name: 'Rikkumine',
            severity: 'MI',
          },
        ])
      }
    >
      confirm-driving:{p.level1Item.code}
    </button>
  ),
}));

import { ModalResultSection } from './ModalResultSection';

const e = (key: number, parentKey: number | null, code: string, name: string, description?: string) =>
  ({ classifierValueKey: key, parentKey, code, name, description }) as never;

// Sõidurikkumised: kaks direktiivi
const driving = [
  e(1, null, 'D1', 'Sõit 1', '561/2006'),
  e(2, null, 'D2', 'Sõit 2', '165/2014'),
  e(3, 1, 'D1L2', 'Vahe 1', 'kirj'),
  e(4, 3, 'VIOL1', 'Rikkumine üks', 'MI'),
  e(5, 2, 'D2L2', 'Vahe 2'),
  e(6, 5, 'VIOL2', 'Rikkumine kaks', 'SI'),
];

// Dokumendikontroll: TEGEVUSLUBA_01 on ainult sõitjatevedu
const docs = [
  e(1, null, 'DOC1', 'Dokumendid'),
  e(2, 1, 'TEGEVUSLUBA_01', 'Sõitjate luba'),
  e(3, 1, 'TEGEVUSLUBA_02', 'Veo luba'),
  e(4, 1, 'TEGEVUSLOA_ARAKIRI_03', 'Mõlemad'),
  e(5, 1, 'PLAIN', 'Tavaline'),
  e(6, 2, 'DOCV1', 'Kood 1', 'kirjeldus'),
];

const masses = [e(1, null, 'MASS', 'Mass N3', 'Mass'), e(2, 1, 'M3A', 'Üle 40t')];

const render_ = (props: Record<string, unknown>) => {
  const setFieldValue = vi.fn();
  const view = render(<ModalResultSection setFieldValue={setFieldValue} {...(props as never)} />);
  return { setFieldValue, ...view };
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ModalResultSection (drivingViolation)', () => {
  it('tühi seisund nullib kõik viis direktiivi välja', () => {
    const { setFieldValue } = render_({ checks: driving, type: 'drivingViolation' });
    expect(screen.getByText('forms.drive_rest.empty')).toBeTruthy();
    expect(screen.getByText('Sõidu- ja puhkeaja nõuete rikkumised')).toBeTruthy();
    expect(setFieldValue).toHaveBeenCalledWith('violations5612006', []);
    expect(setFieldValue).toHaveBeenCalledWith('violations20201057', []);
  });

  it('scopedFields piirab nullimise oma väljadele ja hideTitle peidab pealkirja', () => {
    const { setFieldValue } = render_({ checks: driving, type: 'drivingViolation', scopedFields: ['violations5932008'], hideTitle: true });
    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(setFieldValue).toHaveBeenCalledWith('violations5932008', []);
    expect(screen.queryByText('Sõidu- ja puhkeaja nõuete rikkumised')).toBeNull();
  });

  it('lisamine: dropdown, otsing, rühmad, valik ja modaali kinnitus', async () => {
    const { setFieldValue } = render_({ checks: driving, type: 'drivingViolation' });
    fireEvent.click(screen.getByText('common.add'));
    expect(await screen.findByText('561/2006')).toBeTruthy();
    expect(screen.getByText('165/2014')).toBeTruthy();
    fireEvent.change(screen.getByTestId('doc-right-check-search'), { target: { value: 'sõit 2' } });
    expect(screen.queryByText('Sõit 1')).toBeNull();
    fireEvent.change(screen.getByTestId('doc-right-check-search'), { target: { value: 'ei leia' } });
    expect(screen.getByText('Päring ei tagastanud ühtegi tulemust')).toBeTruthy();
    fireEvent.change(screen.getByTestId('doc-right-check-search'), { target: { value: '165' } });
    fireEvent.click(screen.getByText('Sõit 2'));
    fireEvent.click(screen.getByText('confirm-driving:D2'));
    expect(screen.getByText('Vahe')).toBeTruthy();
    expect(screen.getByText('V3')).toBeTruthy();
    expect(setFieldValue).toHaveBeenCalledWith('violations1652014', [{ violationCode: 'V3', severityCode: 'MI', isDetected: 'true' }]);
  });

  it('uue kirje lisamine asendab sama level1 vanad kirjed ja eemaldamine töötab', async () => {
    const { setFieldValue } = render_({ checks: driving, type: 'drivingViolation' });
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('common.add'));
      fireEvent.click(await screen.findByRole('button', { name: 'Sõit 2' }));
      fireEvent.click(screen.getByText('confirm-driving:D2'));
    }
    expect(screen.getAllByText('V3')).toHaveLength(1);
    fireEvent.click(screen.getByText('common.remove'));
    expect(screen.queryByText('V3')).toBeNull();
    expect(setFieldValue).toHaveBeenLastCalledWith('violations20201057', []);
  });

  it('dropdown sulgub välisklikil ja kerimisel', async () => {
    render_({ checks: driving, type: 'drivingViolation' });
    fireEvent.click(screen.getByText('common.add'));
    expect(await screen.findByText('Sõit 1')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Sõit 1')).toBeNull();
    fireEvent.click(screen.getByText('common.add'));
    expect(await screen.findByText('Sõit 1')).toBeTruthy();
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(screen.queryByText('Sõit 1')).toBeNull();
    fireEvent.click(screen.getByText('common.add'));
    fireEvent.click(screen.getByText('common.add'));
    expect(screen.queryByText('Sõit 1')).toBeNull();
  });

  it('esialgsed rikkumised kaardistatakse klassifikaatoriga', () => {
    render_({
      checks: driving,
      type: 'drivingViolation',
      initialViolations: {
        violations5612006: [{ violationCode: 'VIOL1', severityCode: 'MI', isDetected: 'true' }],
        violations1652014: [{ violationCode: 'GONE', severityCode: 'SI', isDetected: 'true' }],
      },
      readOnly: true,
    });
    expect(screen.getByText('Rikkumine üks')).toBeTruthy();
    expect(screen.getAllByText('GONE').length).toBeGreaterThan(0);
    expect(screen.queryByText('common.add')).toBeNull();
    expect(screen.queryByText('common.remove')).toBeNull();
  });

  it('esialgsed rikkumised puuduvate väljadega', () => {
    render_({ checks: driving, type: 'drivingViolation', initialViolations: { violations5612006: [{ violationCode: 'VIOL1', severityCode: 'MI', isDetected: 'true' }] } });
    expect(screen.getByText('Rikkumine üks')).toBeTruthy();
  });

  it('singleCheckbox: märkimine ja mahavõtmine; puuduva puu korral null', () => {
    const single = [e(1, null, 'R1', 'Rooma', 'dir'), e(2, 1, 'R2', 'Vahe'), e(3, 2, 'R3', 'Ainus rikkumine', 'MI')];
    const { setFieldValue, container } = render_({ checks: single, type: 'drivingViolation', singleCheckbox: true, scopedFields: ['violations5932008'] });
    const box = screen.getByTestId('single-violation-R3') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect((screen.getByTestId('single-violation-R3') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId('single-violation-R3'));
    expect((screen.getByTestId('single-violation-R3') as HTMLInputElement).checked).toBe(false);
    expect(setFieldValue).toHaveBeenCalled();
    cleanup();
    const r2 = render_({ checks: [e(1, null, 'R1', 'x')], type: 'drivingViolation', singleCheckbox: true });
    expect(r2.container.firstChild).toBeNull();
    void container;
  });
});

describe('ModalResultSection (docCheck)', () => {
  it('sõitjateveol on nähtavad vaid sõitjate ja kõigile mõeldud dokumendid', async () => {
    const { setFieldValue } = render_({ checks: docs, type: 'docCheck', transportType: 'Sõitjatevedu', fieldName: 'documentChecks' });
    expect(screen.getByText('Dokumendi või õiguse kontroll')).toBeTruthy();
    fireEvent.click(screen.getByText('common.add'));
    expect(await screen.findByText('Dokumendid')).toBeTruthy();
    expect(screen.queryByText('561/2006')).toBeNull();
    fireEvent.click(screen.getByText('Dokumendid'));
    fireEvent.click(screen.getByText('confirm-doc:DOC1'));
    expect(screen.getByText('Dokument 2')).toBeTruthy();
    expect(setFieldValue).toHaveBeenCalledWith('documentChecks', [expect.objectContaining({ level2Code: 'DOC2' })]);
  });

  it('veoseveol on nähtavad veo dokumendid; tundmatu veoliik peidab piiratud read', () => {
    render_({
      checks: docs,
      type: 'docCheck',
      transportType: 'Veosevedu',
      initialDocumentChecks: [
        { documentCode: 'TEGEVUSLUBA_02', documentName: 'Veo luba', severityCode: 'sev', violationCode: 'DOCV1' },
        { documentCode: 'NOPE', documentName: 'Tundmatu', severityCode: 'sev2', violationCode: 'NOVIOL' },
      ],
      fieldName: 'documentChecks',
    });
    expect(screen.getByText('Veo luba')).toBeTruthy();
    expect(screen.getByText('Tundmatu')).toBeTruthy();
    expect(screen.getByText('NOVIOL')).toBeTruthy();
  });

  it('setFieldValue puudumisel ei kuku ja fieldName puudumisel ei kirjuta', () => {
    const { container } = render(<ModalResultSection checks={docs} type="docCheck" />);
    expect(container).toBeTruthy();
    const { setFieldValue } = render_({ checks: docs, type: 'docCheck' });
    expect(setFieldValue).not.toHaveBeenCalled();
  });
});

describe('ModalResultSection (massDimension)', () => {
  it('Lisa avab modaali; kinnitus asendab kirjed ja kirjutab välja', () => {
    const { setFieldValue } = render_({ checks: masses, type: 'massDimension', fieldName: 'massDimensionMeasurements' });
    expect(screen.getByText('Andmed sõiduki massi ja mõõtmete kohta')).toBeTruthy();
    expect(screen.getByTestId('mass-modal').getAttribute('data-open')).toBe('false');
    fireEvent.click(screen.getByText(/common.add/));
    expect(screen.getByTestId('mass-modal').getAttribute('data-open')).toBe('true');
    fireEvent.click(screen.getByText('confirm-mass'));
    expect(screen.getByText('märkus')).toBeTruthy();
    expect(screen.getByText('M3A')).toBeTruthy();
    expect(screen.getAllByText('Üle 40t').length).toBeGreaterThan(0);
    expect(setFieldValue).toHaveBeenCalledWith('massDimensionMeasurements', expect.any(Array));
  });

  it('esialgsed kirjed tulevad propsist; sama description näitab päist ühe korra', () => {
    render_({
      checks: masses,
      type: 'massDimension',
      readOnly: true,
      initialEntries: [
        { level1Code: 'MASS', level1Name: 'Mass N3', level2Code: 'M3A', level2Name: 'Üle 40t', severity: '', note: '' },
        { level1Code: 'MASS2', level1Name: 'Mass N2', level2Code: 'M2A', level2Name: 'Üle 12t', severity: 'x', note: 'n' },
      ],
    });
    expect(screen.getByTestId('mass-modal').getAttribute('data-count')).toBe('2');
  });
});
