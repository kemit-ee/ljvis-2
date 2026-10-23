// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: '5' } as { id?: string; snapshotId?: string },
  state: undefined as undefined | { justCreated?: boolean },
  perms: [] as string[],
  admin: false,
  detail: { form: null as null | Record<string, unknown>, loading: false, refetch: vi.fn() },
  callbacks: {} as { saved?: () => void; confirmed?: () => void; published?: () => void },
  triggerConfirm: vi.fn(),
  triggerPublish: vi.fn(),
  submitForm: vi.fn(),
  resetForm: vi.fn(),
  setFieldValue: vi.fn(),
  formError: null as string | null,
  onPersonFound: undefined as undefined | ((p: object) => void),
  search: vi.fn(),
  deleteForm: vi.fn(),
  getSnapshot: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => h.navigate,
  useParams: () => h.params,
  useLocation: () => ({ state: h.state }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: (p: string) => h.perms.includes(p) }) }));
vi.mock('../../../../hooks/useIsAdmin', () => ({ useIsAdmin: () => h.admin }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({
  useClassifiers: () => ({ getByCode: () => [{ code: 'EE', name: 'Eesti' }] }),
  useClassifierScopeActive: vi.fn(),
}));
vi.mock('../../../xroad/hooks/usePersonSearch', () => ({
  usePersonSearch: (o: { onPersonFound: (p: object) => void }) => {
    h.onPersonFound = o.onPersonFound;
    return {
      searchByPersonalCode: h.search,
      loading: false,
      error: false,
      setError: vi.fn(),
      notFound: false,
      setNotFound: vi.fn(),
    };
  },
}));
vi.mock('../../../../hooks/useMediaQuery.ts', () => ({ useMediaQuery: () => true }));
vi.mock('./useGoodReputeFormDetail', () => ({ useGoodReputeFormDetail: () => h.detail }));
vi.mock('./useGoodReputeForm', () => ({
  useGoodReputeForm: (_f: unknown, saved: () => void, confirmed: () => void, published: () => void) => {
    h.callbacks = { saved, confirmed, published };
    return {
      formik: {
        handleSubmit: vi.fn(),
        submitForm: h.submitForm,
        resetForm: h.resetForm,
        setFieldValue: h.setFieldValue,
        values: { personalCode: '39001010000' },
      },
      triggerConfirm: h.triggerConfirm,
      triggerPublish: h.triggerPublish,
      formError: h.formError,
    };
  },
}));
vi.mock('../../api', () => ({
  deleteGoodReputeForm: h.deleteForm,
  getGoodReputeFormSnapshot: h.getSnapshot,
}));
vi.mock('../../components/GoodRepute/GoodReputeFormFields', () => ({
  GoodReputeFormFields: (p: { readOnly: boolean; onSearchPerson: () => void }) => (
    <div data-testid="fields" data-readonly={String(p.readOnly)}>
      <button onClick={p.onSearchPerson}>search-person</button>
    </div>
  ),
}));
vi.mock('../../components/shared/FileUploadBlock', async () => ({
  FileUploadBlock: (await import('../../testing/commonStubs')).FileUploadBlockStub,
}));
vi.mock('../../components/FormVersionsTable/FormVersionsTable', async () => ({
  FormVersionsTable: (await import('../../testing/commonStubs')).FormVersionsTableStub,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));
vi.mock('../../../../shared/components/FormNotFoundView', async () => ({
  FormNotFoundView: (await import('../../testing/commonStubs')).FormNotFoundViewStub,
}));
vi.mock('../../../../shared/components/DeleteConfirmModal.tsx', async () => ({
  DeleteConfirmModal: (await import('../../testing/commonStubs')).DeleteConfirmModalStub,
}));

import { GoodReputeFormPage } from './GoodReputeFormPage';

const setForm = (o: Record<string, unknown> = {}) => {
  h.detail = { form: { id: '5', formNumber: 'GR-1', version: 3, status: 'saved', ...o }, loading: false, refetch: vi.fn() };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { id: '5' };
  h.state = undefined;
  h.perms = ['good_repute_form.read'];
  h.admin = false;
  h.formError = null;
  setForm();
  h.deleteForm.mockResolvedValue([]);
  h.getSnapshot.mockResolvedValue([{ formNumber: 'GR-1', version: 2 }]);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GoodReputeFormPage (detail)', () => {
  it('laadimine, keelatud ja puuduv vorm', () => {
    h.detail = { form: null, loading: true, refetch: vi.fn() };
    const { unmount } = render(<GoodReputeFormPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    unmount();
    h.detail = { form: { id: '5' }, loading: false, refetch: vi.fn() };
    h.perms = [];
    const r2 = render(<GoodReputeFormPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    r2.unmount();
    h.perms = ['good_repute_form.read'];
    h.detail = { form: null, loading: false, refetch: vi.fn() };
    render(<GoodReputeFormPage />);
    expect(screen.getByTestId('not-found')).toBeTruthy();
  });

  it('salvestatud vorm avab muutmisrežiimi; Katkesta lähtestab', () => {
    h.perms = ['good_repute_form.read'];
    render(<GoodReputeFormPage />);
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
    expect(screen.getByText('GR-1/3')).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    expect(h.resetForm).toHaveBeenCalled();
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('true');
  });

  it('pealkiri ilma vormi numbrita', () => {
    setForm({ formNumber: '', status: 'published' });
    render(<GoodReputeFormPage />);
    expect(screen.getByText('forms.good_repute_form')).toBeTruthy();
  });

  it('salvesta, kinnita ja kustuta (õigustega kasutaja)', async () => {
    h.admin = true;
    h.perms = ['good_repute_form.write'];
    render(<GoodReputeFormPage />);
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.confirm'));
    expect(h.triggerConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(h.deleteForm).toHaveBeenCalledWith('5', 'saved'));
    expect(h.navigate).toHaveBeenCalledWith('/', { state: { justCreated: true } });
  });

  it('kustutamise viga ei navigeeri', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.admin = true;
    h.deleteForm.mockRejectedValue(new Error('x'));
    render(<GoodReputeFormPage />);
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(h.navigate).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('kinnitatud vorm: admin saab muuta ja avalikustada', () => {
    h.admin = true;
    h.perms = ['good_repute_form.write'];
    setForm({ status: 'confirmed' });
    render(<GoodReputeFormPage />);
    fireEvent.click(screen.getByText('common.publish'));
    expect(h.triggerPublish).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.edit'));
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
  });

  it('avaldatud sobimatu vorm lubab NU loomist', () => {
    h.admin = true;
    h.perms = ['nu.create', 'good_repute_form.read'];
    setForm({ status: 'published', fitnessStatus: 'unfit' });
    render(<GoodReputeFormPage />);
    fireEvent.click(screen.getByText('erru.nu.createFromGoodRepute'));
    expect(h.navigate).toHaveBeenCalledWith('/erru/nu/new?sourceKey=5');
  });

  it('lugemisrežiimis ilma õigusteta nuppe ei ole', () => {
    setForm({ status: 'published' });
    render(<GoodReputeFormPage />);
    expect(screen.queryByText('common.edit')).toBeNull();
    expect(screen.getByTestId('print-button')).toBeTruthy();
  });

  it('tagasikutsed näitavad teateid ja värskendavad', () => {
    h.admin = true;
    h.perms = ['good_repute_form.write'];
    h.formError = 'FORM-ERR';
    render(<GoodReputeFormPage />);
    expect(screen.getByText('FORM-ERR')).toBeTruthy();
    act(() => h.callbacks.saved!());
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    act(() => h.callbacks.confirmed!());
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    act(() => h.callbacks.published!());
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    expect(h.detail.refetch).toHaveBeenCalledTimes(3);
  });

  it('just created olek näitab salvestamise teadet ja sulgeb selle', () => {
    h.state = { justCreated: true };
    setForm({ status: 'confirmed' });
    render(<GoodReputeFormPage />);
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
    const close = screen.getAllByRole('button', { name: /close|sulge/i });
    fireEvent.click(close[0]);
  });

  it('isikuotsing ja leitud isik täidavad vormi', () => {
    render(<GoodReputeFormPage />);
    fireEvent.click(screen.getByText('search-person'));
    expect(h.search).toHaveBeenCalledWith('39001010000');
    h.onPersonFound!({ firstName: 'A', lastName: 'B', dateOfBirth: '2000-01-01' });
    h.onPersonFound!({ firstName: 'A', lastName: 'B' });
    expect(h.setFieldValue).toHaveBeenCalledWith('dateOfBirth', '2000-01-01');
  });
});

describe('GoodReputeFormPage (snapshot)', () => {
  beforeEach(() => {
    h.params = { id: '5', snapshotId: '9' };
  });

  it('näitab versiooni kirjutuskaitstult', async () => {
    render(<GoodReputeFormPage />);
    expect(await screen.findByText('GR-1/2')).toBeTruthy();
    expect(h.getSnapshot).toHaveBeenCalledWith('9', '5');
    expect(screen.getByTestId('print-button').getAttribute('data-snapshot')).toBe('9');
    expect(screen.getByTestId('file-upload').getAttribute('data-disabled')).toBe('true');
  });

  it('snapshot ilma vormi numbrita ja objektivastus', async () => {
    h.getSnapshot.mockResolvedValue({ version: 1 });
    render(<GoodReputeFormPage />);
    expect(await screen.findByText('forms.good_repute_form')).toBeTruthy();
  });

  it('puuduv snapshot ja viga näitavad "ei leitud"', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.getSnapshot.mockRejectedValue(new Error('x'));
    render(<GoodReputeFormPage />);
    expect(await screen.findByTestId('not-found')).toBeTruthy();
    err.mockRestore();
  });

  it('õigusteta kasutaja saab keelatud teate', async () => {
    h.perms = [];
    render(<GoodReputeFormPage />);
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });
});
