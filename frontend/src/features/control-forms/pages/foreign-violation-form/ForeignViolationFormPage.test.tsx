// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: '5' } as { id?: string; snapshotId?: string },
  state: undefined as undefined | { justCreated?: boolean },
  perms: [] as string[],
  admin: false,
  adminProc: false,
  detail: { form: null as null | Record<string, unknown>, loading: false, refetch: vi.fn() },
  callbacks: {} as { saved?: () => void; confirmed?: () => void; published?: () => void },
  duplicate: null as null | { formNumber: string },
  triggerConfirm: vi.fn(),
  triggerPublish: vi.fn(),
  submitForm: vi.fn(),
  resetForm: vi.fn(),
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
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../../../hooks/useCanUseAdministrativeProcedure', () => ({ useCanUseAdministrativeProcedure: () => h.adminProc }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('./useFormDetail.ts', () => ({ useFormDetail: () => h.detail }));
vi.mock('./useForeignViolationForm', () => ({
  useForeignViolationForm: (_f: unknown, saved: () => void, confirmed: () => void, published: () => void) => {
    h.callbacks = { saved, confirmed, published };
    return {
      formik: { handleSubmit: vi.fn(), submitForm: h.submitForm, resetForm: h.resetForm },
      structureUnits: [],
      orgOptions: [],
      duplicateWarning: h.duplicate,
      triggerConfirm: h.triggerConfirm,
      triggerPublish: h.triggerPublish,
    };
  },
}));
vi.mock('../../api', () => ({
  deleteForeignViolationForm: h.deleteForm,
  getForeignViolationFormSnapshot: h.getSnapshot,
}));
vi.mock('../../components/ForeignViolationForm/ForeignViolationFormFields.tsx', () => ({
  ForeignViolationFormFields: (p: { readOnly: boolean; showAdminSection?: boolean }) => (
    <div data-testid="fields" data-readonly={String(p.readOnly)} data-admin={String(!!p.showAdminSection)} />
  ),
}));
vi.mock('../../components/FormVersionsTable/FormVersionsTable.tsx', async () => ({
  FormVersionsTable: (await import('../../testing/commonStubs')).FormVersionsTableStub,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));
vi.mock('../../../../shared/components/FormLoadError', () => ({ FormLoadError: () => <div data-testid="load-error" /> }));
vi.mock('../../../../shared/components/DeleteConfirmModal.tsx', async () => ({
  DeleteConfirmModal: (await import('../../testing/commonStubs')).DeleteConfirmModalStub,
}));

import { ForeignViolationFormPage } from './ForeignViolationFormPage';

const setForm = (o: Record<string, unknown> = {}) => {
  h.detail = { form: { id: 5, formNumber: 'VR-1', version: 3, status: 'saved', ...o }, loading: false, refetch: vi.fn() };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { id: '5' };
  h.state = undefined;
  h.perms = ['foreign_violation_form.read'];
  h.admin = false;
  h.adminProc = false;
  h.duplicate = null;
  setForm();
  h.deleteForm.mockResolvedValue([]);
  h.getSnapshot.mockResolvedValue([{ formNumber: 'VR-1', version: 2 }]);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ForeignViolationFormPage (detail)', () => {
  it('laadimine, keelatud ja laadimisviga', () => {
    h.detail = { form: null, loading: true, refetch: vi.fn() };
    const a = render(<ForeignViolationFormPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    a.unmount();
    setForm();
    h.perms = [];
    const b = render(<ForeignViolationFormPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    b.unmount();
    h.perms = ['foreign_violation_form.read'];
    h.detail = { form: null, loading: false, refetch: vi.fn() };
    render(<ForeignViolationFormPage />);
    expect(screen.getByTestId('load-error')).toBeTruthy();
  });

  it('salvestatud vorm: muutmine, kustutamine ja nupud', async () => {
    h.admin = true;
    h.adminProc = true;
    h.perms = ['foreign_violation_form.write'];
    h.duplicate = { formNumber: 'VR-0' };
    render(<ForeignViolationFormPage />);
    expect(screen.getByText('VR-1/3')).toBeTruthy();
    expect(screen.getByTestId('fields').getAttribute('data-admin')).toBe('true');
    expect(screen.getByText('forms.foreign_violation.duplicateWarning')).toBeTruthy();
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.confirm'));
    expect(h.triggerConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(h.deleteForm).toHaveBeenCalledWith('5', 'VR-1', 'saved'));
    expect(h.navigate).toHaveBeenCalledWith('/', { state: { justCreated: true } });
    fireEvent.click(screen.getByText('common.cancel'));
    expect(h.resetForm).toHaveBeenCalled();
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('true');
  });

  it('kustutamise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.admin = true;
    h.deleteForm.mockRejectedValue(new Error('x'));
    render(<ForeignViolationFormPage />);
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(h.navigate).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('kinnitatud vorm: muuda ja avalikusta', () => {
    h.admin = true;
    setForm({ status: 'confirmed', formNumber: '' });
    render(<ForeignViolationFormPage />);
    expect(screen.getByText('forms.foreign_violation_form')).toBeTruthy();
    fireEvent.click(screen.getByText('common.publish'));
    expect(h.triggerPublish).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.edit'));
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
  });

  it('lugemisvaates ilma õigusteta muutmisnuppe pole', () => {
    setForm({ status: 'published' });
    render(<ForeignViolationFormPage />);
    expect(screen.queryByText('common.edit')).toBeNull();
    expect(screen.getByTestId('print-button')).toBeTruthy();
  });

  it('tagasikutsed näitavad teateid', () => {
    h.admin = true;
    render(<ForeignViolationFormPage />);
    act(() => h.callbacks.saved!());
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    act(() => h.callbacks.confirmed!());
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    act(() => h.callbacks.published!());
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    expect(h.detail.refetch).toHaveBeenCalledTimes(3);
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
  });

  it('just created olek näitab salvestamise teadet', () => {
    h.state = { justCreated: true };
    setForm({ status: 'confirmed' });
    render(<ForeignViolationFormPage />);
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /close|sulge/i })[0]);
  });
});

describe('ForeignViolationFormPage (snapshot)', () => {
  beforeEach(() => {
    h.params = { id: '5', snapshotId: '9' };
  });

  it('näitab versiooni', async () => {
    render(<ForeignViolationFormPage />);
    expect(await screen.findByText('VR-1/2')).toBeTruthy();
    expect(h.getSnapshot).toHaveBeenCalledWith('9', '5');
    expect(screen.getByTestId('print-button').getAttribute('data-snapshot')).toBe('9');
  });

  it('versioonita ja numbrita objektivastus', async () => {
    h.getSnapshot.mockResolvedValue({ formNumber: 'VR-9' });
    render(<ForeignViolationFormPage />);
    expect(await screen.findByText('VR-9/1')).toBeTruthy();
    cleanup();
    h.getSnapshot.mockResolvedValue({});
    render(<ForeignViolationFormPage />);
    expect(await screen.findByText('forms.foreign_violation_form')).toBeTruthy();
  });

  it('viga näitab laadimisviga', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.getSnapshot.mockRejectedValue(new Error('x'));
    render(<ForeignViolationFormPage />);
    expect(await screen.findByTestId('load-error')).toBeTruthy();
    err.mockRestore();
  });

  it('õigusteta kasutaja', async () => {
    h.perms = [];
    render(<ForeignViolationFormPage />);
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });
});
