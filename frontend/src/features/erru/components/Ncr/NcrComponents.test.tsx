// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../shared/api/client';
import { exerciseAll } from '../../testing/exercise';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  buildNcrRequest: vi.fn(),
  saveNcrRequest: vi.fn(),
  saveNcrResponse: vi.fn(),
  getCompoundForm: vi.fn(),
}));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<object>('react-router-dom')),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../../api', () => mocks);
vi.mock('../../../control-forms/api', () => ({ getCompoundForm: mocks.getCompoundForm }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../organisations/hooks', () => {
  const organisations = [{ code: 'KLIM', name: 'Kliimaministeerium' }, { code: 'PPA', name: 'PPA' }];
  return { useOrganisations: () => ({ organisations, loading: false }) };
});
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({ label: (_c: string, v: string | null) => (v ? `L:${v}` : '') }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [
    { code: 'EE', name: 'Eesti' },
    { code: 'LV', name: 'Läti' },
    { code: 'MSI101', name: 'rikkumine' },
    { code: 'MSI', name: 'MSI' },
    { code: 'VSI', name: 'VSI' },
  ];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});

import { useNcrRequestForm } from '../../pages/ncr/useNcrRequestForm';
import { useNcrResponseForm } from '../../pages/ncr/useNcrResponseForm';
import { NcrBuildModal } from './NcrBuildModal';
import { NcrRequestFields } from './NcrRequestFields';
import { NcrResponseFields } from './NcrResponseFields';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
beforeEach(() => {
  Object.values(mocks).forEach((f) => f.mockReset());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(cleanup);

const penalty = { penaltyImposedIdentifier: 'p', penaltyTypeImposed: 'MSI', finalDecisionDate: '', isExecuted: 'No', notExecutedReason: 'r' };
const si = (category: string) => ({
  category,
  infringementType: 'MSI101',
  dateOfInfringement: '',
  detectionCheckDate: '',
  appealPossible: true,
  penaltiesImposed: [penalty],
  penaltiesRequested: [{ penaltyRequestedIdentifier: 'q', penaltyTypeRequested: 'MSI', duration: 4 }],
});
const failedMessage = {
  businessCaseId: 'B1',
  checkResult: 'Fail',
  seriousInfringements: [si('MSI'), si('VSI')],
} as never;

let reqForm: ReturnType<typeof useNcrRequestForm>;
function RequestHarness({ message }: { message?: never }) {
  const form = useNcrRequestForm(message, vi.fn());
  useEffect(() => {
    reqForm = form;
  });
  return <NcrRequestFields form={form} />;
}

describe('NcrRequestFields', () => {
  it('shows only the header and summary while the check passed', () => {
    render(<RequestHarness />);
    expect(screen.queryByText('common.add')).toBeNull();
    exerciseAll();
    expect(screen.queryAllByText('common.add').length).toBeGreaterThan(0);
  });

  it('edits serious infringements and their penalties', async () => {
    render(<RequestHarness message={failedMessage} />);
    exerciseAll(document.body, { radios: false });
    fireEvent.click(screen.getAllByText('common.add')[0]);
    exerciseAll(document.body, { radios: false });
    // the radios (executed Yes/No/Unknown, appeal, passed check) change what is shown
    exerciseAll();
    await act(async () => {
      await reqForm.formik.setFieldValue('seriousInfringements', [{ ...si(''), infringementType: '', penaltiesImposed: [], penaltiesRequested: [] }]);
    });
    await act(async () => {
      await reqForm.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  }, 60000);

  it('adds and removes rows through the buttons', async () => {
    render(<RequestHarness message={failedMessage} />);
    const addButtons = () => screen.getAllByText('common.add');
    fireEvent.click(addButtons()[0]);
    fireEvent.click(addButtons()[1]);
    fireEvent.click(addButtons()[2]);
    const removeAll = () => screen.queryAllByText('common.remove');
    while (removeAll().length) {
      await act(async () => fireEvent.click(removeAll()[removeAll().length - 1]));
    }
    expect(reqForm.formik.values.seriousInfringements).toHaveLength(0);
  });

  it('toggling the passed-check radio clears the data', () => {
    render(<RequestHarness message={failedMessage} />);
    fireEvent.click(document.querySelector('input[type=radio][value=true]')!);
    expect(reqForm.formik.values.checkPassed).toBe(true);
  });
});

let respForm: ReturnType<typeof useNcrResponseForm>;
function ResponseHarness({ message }: { message: never }) {
  const form = useNcrResponseForm(message, vi.fn());
  useEffect(() => {
    respForm = form;
  });
  return (
    <NcrResponseFields
      form={form}
      message={message}
      organisations={[{ code: 'KLIM', name: 'Kliimaministeerium' } as never]}
    />
  );
}

describe('NcrResponseFields', () => {
  const incoming = {
    businessCaseId: 'B1',
    ncrTo: 'EE',
    ncrFrom: 'LV',
    originatingAuthority: 'KLIM',
    seriousInfringements: [{ penaltiesRequested: [{ penaltyRequestedIdentifier: 'r1' }, { penaltyRequestedIdentifier: 'r2' }] }],
    responsePenaltiesImposed: [{ penaltyRequestedIdentifier: 'r2', authorityImposingPenalty: 'Other', isImposed: true, penaltyTypeImposed: 'MSI' }],
  } as never;

  it('drives every control, including imposed / not imposed rows', async () => {
    render(<ResponseHarness message={incoming} />);
    exerciseAll();
    exerciseAll();
    await act(async () => {
      await respForm.formik.setFieldValue('responsePenaltiesImposed', [
        { penaltyRequestedIdentifier: 'r1', authorityImposingPenalty: 'KLIM', isImposed: true, penaltyTypeImposed: '' },
        { penaltyRequestedIdentifier: 'r2', authorityImposingPenalty: 'KLIM', isImposed: false, penaltyTypeImposed: null },
      ]);
    });
    await act(async () => {
      await respForm.formik.submitForm();
    });
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });

  it('renders for a message without requested penalties', () => {
    render(<ResponseHarness message={{ businessCaseId: 'B', seriousInfringements: [] } as never} />);
    expect(screen.getByText('erru.ncr.form.responseBlock')).toBeTruthy();
  });
});

describe('NcrBuildModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof NcrBuildModal>> = {}) => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <NcrBuildModal spFormKey={5} spFormType="driver" open onClose={onClose} {...props} />
      </MemoryRouter>,
    );
    return onClose;
  };
  const pickCountry = () => fireEvent.change(document.getElementById('ncr-build-ncr-to')!, { target: { value: 'LV' } });

  it('renders nothing while closed', () => {
    render(
      <MemoryRouter>
        <NcrBuildModal spFormKey={5} spFormType="driver" open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('requires a destination country', () => {
    renderModal();
    fireEvent.click(screen.getByText('erru.ncr.buildModal.submit'));
    expect(screen.getByText('erru.ncr.validation.required')).toBeTruthy();
    expect(mocks.buildNcrRequest).not.toHaveBeenCalled();
  });

  it('builds a request and opens the new draft', async () => {
    mocks.buildNcrRequest.mockResolvedValue({ businessCaseId: 'NEW-1' });
    renderModal({ initialNcrTo: 'EE', initialOriginatingAuthority: 'PPA' });
    pickCountry();
    for (const id of ['ncr-build-originating-authority', 'ncr-build-request-source', 'ncr-build-request-purpose']) {
      fireEvent.change(document.getElementById(id)!, { target: { value: 'EE' } });
    }
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.buildModal.submit')));
    expect(mocks.buildNcrRequest).toHaveBeenCalledWith(expect.objectContaining({ spFormKey: '5', spFormType: 'driver', ncrTo: 'LV' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/erru/ncr/NEW-1');
  });

  it('prefills from the compound form', async () => {
    mocks.getCompoundForm.mockResolvedValue({ vehicleCountryCode: 'LV', inspectorOrganisationId: 'PPA' });
    mocks.buildNcrRequest.mockResolvedValue({ businessCaseId: 'N' });
    renderModal({ compoundFormKey: 9 });
    await waitFor(() => expect((document.getElementById('ncr-build-ncr-to') as HTMLSelectElement).value).toBe('LV'));
    expect(mocks.getCompoundForm).toHaveBeenCalledWith(9);
  });

  it('tolerates a failing prefill', async () => {
    mocks.getCompoundForm.mockRejectedValue(new Error('x'));
    renderModal({ compoundFormKey: 9 });
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  it.each([
    [403, 'erru.ncr.buildModal.forbidden'],
    [404, 'erru.ncr.buildModal.notFound'],
    [500, 'erru.ncr.buildModal.failed'],
  ])('maps a %i response to a message', async (status, message) => {
    mocks.buildNcrRequest.mockRejectedValue(new ApiError('x', status));
    renderModal();
    pickCountry();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.buildModal.submit')));
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('closes through the cancel button', () => {
    const onClose = renderModal();
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
