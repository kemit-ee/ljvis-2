// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

vi.mock('../../api', () => ({}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({ label: (_c: string, v: string | null) => (v ? `L:${v}` : '') }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});

import { useCtudForm } from '../../pages/ctud/useCtudForm';
import { CtudRequestFields } from './CtudRequestFields';
import { CtudResponseBlock } from './CtudResponseBlock';

let formRef: ReturnType<typeof useCtudForm>;
function Harness({ id }: { id?: string }) {
  const form = useCtudForm(undefined, vi.fn());
  useEffect(() => {
    formRef = form;
  });
  return <CtudRequestFields form={form} businessCaseId={id} />;
}

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
afterEach(cleanup);

describe('CtudRequestFields', () => {
  it('drives every control and shows validation errors', async () => {
    render(<Harness id="BC-1" />);
    expect(screen.getByText('BC-1')).toBeTruthy();
    exerciseAll();
    await act(async () => {
      await formRef.formik.setValues({ ...formRef.formik.values, ctudTo: '', requestSource: '', transportUndertakingName: 'x'.repeat(200) });
    });
    await act(async () => {
      await formRef.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });

  it('renders without a case id', () => {
    render(<Harness />);
    expect(screen.queryByText('BC-1')).toBeNull();
  });
});

const baseRequest = {
  ctudTo: 'LV',
  ctudFrom: 'EE',
  respondingAuthority: 'Auth',
  originatingAuthority: 'KLIM',
  businessCaseId: 'BC-9',
  createdAt: '2024-01-02T10:00:00Z',
  responseStatusCode: 'Found',
  responseStatusMessage: 'msg',
} as never;

describe('CtudResponseBlock', () => {
  it('renders nothing without a response', () => {
    const { container } = render(<CtudResponseBlock request={{ ...(baseRequest as object), responseStatusCode: null } as never} />);
    expect(container.textContent).toBe('');
  });

  it('shows the header only for non-Found responses', () => {
    render(<CtudResponseBlock request={{ ...(baseRequest as object), responseStatusCode: 'NotFound', responseStatusMessage: null, responseContent: { transportUndertakingName: 'X' } } as never} />);
    expect(screen.getByText('erru.ctud.response.title')).toBeTruthy();
    expect(screen.queryByText('erru.ctud.response.undertaking')).toBeNull();
  });

  it('shows the whole Found response', () => {
    render(
      <CtudResponseBlock
        request={{
          ...(baseRequest as object),
          responseContent: {
            transportUndertakingName: 'AS Test',
            legalForm: 'OÜ',
            numberOfVehicles: 3,
            numberOfEmployees: 4,
            riskRating: 1,
            riskBand: 'LOW',
            searchMethod: 'X',
            address: { address: 'Tänav 1', postCode: '1', city: 'Tln', country: 'EE' },
            communityLicenceDetails: [{ communityLicenceNumber: 'L1' }, { communityLicenceNumber: 'L2' }],
            certifiedTrueCopyDetails: [{ trueCopyNumber: 'T1' }, { trueCopyNumber: 'T2' }],
            vehicleRegistrations: ['ABC', 'DEF'],
          },
        } as never}
      />,
    );
    expect(screen.getByText('AS Test')).toBeTruthy();
    expect(screen.getByText('ABC, DEF')).toBeTruthy();
    expect(screen.getByText('L1')).toBeTruthy();
    expect(screen.getByText('T2')).toBeTruthy();
  });

  it('skips optional sections when they are absent', () => {
    render(<CtudResponseBlock request={{ ...(baseRequest as object), responseContent: { transportUndertakingName: 'AS Test' } } as never} />);
    expect(screen.queryByText('erru.ctud.response.address')).toBeNull();
    expect(screen.queryByText('erru.ctud.response.licences')).toBeNull();
  });
});
