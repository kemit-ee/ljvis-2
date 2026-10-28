// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EtoimikQueryCard } from './EtoimikQueryCard';
import { CompoundEtoimikQueryCard } from './CompoundEtoimikQueryCard';
import { queryEtoimikQualifications } from '../../../xroad/api';

const perms = new Set<string>();
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => perms.has(p) }) }));
vi.mock('../../../xroad/api', () => ({ queryEtoimikQualifications: vi.fn() }));

const refs = [
  { label: 'A', value: 'REF-1' },
  { label: 'B', value: 'REF-2' },
];
const ee = { firstName: 'Mari', lastName: 'Maasikas', personalCodeEe: '49001010000', birthDate: '', citizenshipCode: 'EE', personalCodeForeign: '' };
const foreign = { firstName: 'Jan', lastName: 'Novak', personalCodeEe: '', birthDate: '1990-01-01', citizenshipCode: 'CZ', personalCodeForeign: 'X1' };
const sel = (id: string) => document.getElementById(id) as HTMLSelectElement;

const fullResult = {
  proceedings: [
    {
      objectId: 1,
      proceedingNumber: 'P-1',
      actions: [
        {
          objectId: 2,
          typeCode: 10,
          subTypeCode: 11,
          legalBasis: [{ objectId: 3, text: 'LB tekst' }, { paragraph: '§1', subsection: '2' }],
          participants: [
            {
              person: { firstName: 'Mari', lastName: 'M' },
              sanctions: [
                {
                  objectId: 4,
                  typeCode: 5,
                  convictionPoints: [
                    { objectId: 6, reference: 'CP1', qualificationParagraphs: [{ objectId: 7, text: 'QP tekst' }, { paragraph: '§9' }] },
                    { qualificationParagraphs: [] },
                  ],
                },
              ],
            },
          ],
        },
        { typeCode: 20, legalBasis: [], participants: [] },
      ],
    },
    { proceedingNumber: 'P-2', actions: [] },
  ],
};

describe('EtoimikQueryCard', () => {
  beforeEach(() => {
    perms.clear();
    perms.add('compound_form.read');
    vi.mocked(queryEtoimikQualifications).mockReset();
  });
  afterEach(cleanup);

  it('peidub ilma õiguseta ja ilma viitenumbriteta', () => {
    perms.clear();
    const { container, rerender } = render(<EtoimikQueryCard drivers={[ee]} referenceNumberOptions={refs} compoundFormKey={1} />);
    expect(container.innerHTML).toBe('');
    perms.add('tram_driver_form.read');
    rerender(<EtoimikQueryCard drivers={[ee]} referenceNumberOptions={[]} compoundFormKey={1} />);
    expect(container.innerHTML).toBe('');
  });

  it('nupp on keelatud kuni valikud on tehtud; Eesti isik saadetakse isikukoodiga', async () => {
    vi.mocked(queryEtoimikQualifications).mockResolvedValue(fullResult as never);
    render(<EtoimikQueryCard drivers={[ee, foreign]} referenceNumberOptions={refs} compoundFormKey={42} />);
    const btn = screen.getByText('etoimik.queryButton') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(sel('etoimikReferenceNumber'), { target: { value: 'REF-2' } });
    fireEvent.change(sel('etoimikDriver'), { target: { value: '0' } });
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/P-1/)).toBeTruthy());
    expect(queryEtoimikQualifications).toHaveBeenCalledWith(
      expect.objectContaining({ referenceNumber: 'REF-2', personalCode: '49001010000', firstName: '', sourceType: 'compound_form', sourceRecordId: '42' }),
    );
    expect(screen.getByText('LB tekst')).toBeTruthy();
    expect(screen.getByText('§1 2')).toBeTruthy();
    expect(screen.getByText('QP tekst')).toBeTruthy();
    expect(screen.getByText('§9')).toBeTruthy();
    expect(screen.getByText('CP1')).toBeTruthy();
    expect(screen.getByText('etoimik.convictionPoint')).toBeTruthy();
    // valiku muutmine tühjendab tulemuse
    fireEvent.change(sel('etoimikDriver'), { target: { value: '1' } });
    expect(screen.queryByText(/P-1/)).toBeNull();
    fireEvent.change(sel('etoimikReferenceNumber'), { target: { value: '' } });
    fireEvent.change(sel('etoimikDriver'), { target: { value: '' } });
  });

  it('ühe valikuga eeltäidab; välismaalane saadetakse nime ja sünniajaga; leiab mitte midagi', async () => {
    vi.mocked(queryEtoimikQualifications).mockResolvedValue(null);
    render(<EtoimikQueryCard drivers={[foreign]} referenceNumberOptions={[refs[0]]} compoundFormKey={1} sourceType="labour_inspection_form" />);
    fireEvent.click(screen.getByText('etoimik.queryButton'));
    await waitFor(() => expect(screen.getByText('etoimik.notFound')).toBeTruthy());
    expect(queryEtoimikQualifications).toHaveBeenCalledWith(
      expect.objectContaining({ personalCode: '', firstName: 'Jan', lastName: 'Novak', birthDate: '1990-01-01', sourceType: 'labour_inspection_form' }),
    );
  });

  it('päringu viga näitab veateadet; nimeta isik saab vaikenime', async () => {
    vi.mocked(queryEtoimikQualifications).mockRejectedValue(new Error('x'));
    render(<EtoimikQueryCard drivers={[{ firstName: '', lastName: '', personalCodeEe: '' } as never]} referenceNumberOptions={[refs[0]]} compoundFormKey={1} />);
    expect(screen.getByText('etoimik.unnamedDriver')).toBeTruthy();
    fireEvent.click(screen.getByText('etoimik.queryButton'));
    await waitFor(() => expect(screen.getByText('etoimik.queryFailed')).toBeTruthy());
  });

  it('puuduvate nimeväljadega isik', () => {
    render(<EtoimikQueryCard drivers={[{} as never, {} as never]} referenceNumberOptions={refs} compoundFormKey={1} />);
    expect(screen.getAllByText('etoimik.unnamedDriver').length).toBeGreaterThan(0);
  });
});

describe('CompoundEtoimikQueryCard', () => {
  beforeEach(() => {
    perms.clear();
    perms.add('compound_form.read');
    perms.add('control_form.punishment_register');
  });
  afterEach(cleanup);

  it('peidub ilma vormi, võtme või õiguseta', () => {
    const { container, rerender } = render(<CompoundEtoimikQueryCard compoundForm={null} compoundFormKey={1} />);
    expect(container.innerHTML).toBe('');
    rerender(<CompoundEtoimikQueryCard compoundForm={{}} compoundFormKey={undefined} />);
    expect(container.innerHTML).toBe('');
    perms.delete('control_form.punishment_register');
    rerender(<CompoundEtoimikQueryCard compoundForm={{}} compoundFormKey={1} />);
    expect(container.innerHTML).toBe('');
  });

  it.each(['YLD', 'general'])('üldmenetlus %s saadab asja numbri; sama numbriga kiirmenetlus saadab viitenumbri', async (proceedingType) => {
    vi.mocked(queryEtoimikQualifications).mockResolvedValue(null);
    render(<CompoundEtoimikQueryCard compoundForm={{ drivers: [ee] }} compoundFormKey={1}
      driver={{ proceedingReferenceNumber: '123', proceedingType }}
      vehicle={{ proceedingReferenceNumber: '123', proceedingType: 'expedited' }} />);
    fireEvent.change(sel('etoimikReferenceNumber'), { target: { value: 'case:123' } });
    fireEvent.click(screen.getByText('etoimik.queryButton'));
    await waitFor(() => expect(queryEtoimikQualifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ caseNumber: '123', referenceNumber: '' }),
    ));
    await waitFor(() => expect((screen.getByText('etoimik.queryButton') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(sel('etoimikReferenceNumber'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('etoimik.queryButton'));
    await waitFor(() => expect(queryEtoimikQualifications).toHaveBeenLastCalledWith(
      expect.objectContaining({ caseNumber: '', referenceNumber: '123' }),
    ));
  });

  it('koostab viitenumbrite valikud alamvormidest ja parsib juhid (massiiv, JSON, vigane)', () => {
    const cf = { drivers: [ee] };
    const { rerender } = render(
      <CompoundEtoimikQueryCard
        compoundForm={cf}
        compoundFormKey={1}
        vehicle={{ subFormNumber: 'V1', proceedingReferenceNumber: 'R-V' }}
        trailers={[{ proceedingReferenceNumber: 'R-T' }, null]}
        driver={{ subFormNumber: 'D1', proceedingReferenceNumber: 'R-D' }}
        teammate={{}}
        adr={{ proceedingReferenceNumber: 'R-A' }}
      />,
    );
    const opts = Array.from(sel('etoimikReferenceNumber').options).map((o) => o.value).filter(Boolean);
    expect(opts).toEqual(['R-V', 'R-T', 'R-D', 'R-A']);
    expect(screen.getByText(/forms.technical_check.vehicleTitle V1 — R-V/)).toBeTruthy();
    expect(sel('etoimikDriver').options.length).toBe(2);

    rerender(<CompoundEtoimikQueryCard compoundForm={{ drivers: JSON.stringify([ee, foreign]) }} compoundFormKey={1} driver={{ proceedingReferenceNumber: 'R' }} />);
    expect(sel('etoimikDriver').options.length).toBe(3);
    rerender(<CompoundEtoimikQueryCard compoundForm={{ drivers: '{"a":1}' }} compoundFormKey={1} driver={{ proceedingReferenceNumber: 'R' }} />);
    expect(sel('etoimikDriver').options.length).toBe(1);
    rerender(<CompoundEtoimikQueryCard compoundForm={{ drivers: 'not json' }} compoundFormKey={1} driver={{ proceedingReferenceNumber: 'R' }} />);
    expect(sel('etoimikDriver').options.length).toBe(1);
    rerender(<CompoundEtoimikQueryCard compoundForm={{ drivers: 5 }} compoundFormKey={1} driver={{ proceedingReferenceNumber: 'R' }} />);
    expect(sel('etoimikDriver').options.length).toBe(1);
  });
});
