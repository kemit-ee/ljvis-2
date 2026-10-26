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
  hook: { dirty: false, values: {} as Record<string, unknown> },
  triggerConfirm: vi.fn(),
  triggerPublish: vi.fn(),
  submitForm: vi.fn(),
  resetForm: vi.fn(),
  formError: null as string | null,
  deleteForm: vi.fn(),
  getSnapshot: vi.fn(),
  etoimik: vi.fn(),
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
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('./useLabourInspectionFormDetail', () => ({ useLabourInspectionFormDetail: () => h.detail }));
vi.mock('./useLabourInspectionForm', () => ({
  useLabourInspectionForm: (_f: unknown, saved: () => void, confirmed: () => void, published: () => void) => {
    h.callbacks = { saved, confirmed, published };
    return {
      formik: {
        handleSubmit: vi.fn(),
        submitForm: h.submitForm,
        resetForm: h.resetForm,
        dirty: h.hook.dirty,
        values: h.hook.values,
      },
      transportTypes: [],
      violationClassifiers: [],
      addMatrixRow: vi.fn(),
      updateMatrixRow: vi.fn(),
      removeMatrixRow: vi.fn(),
      addViolation: vi.fn(),
      removeViolation: vi.fn(),
      triggerConfirm: h.triggerConfirm,
      triggerPublish: h.triggerPublish,
      formError: h.formError,
      handleCompanyRegSearch: vi.fn(),
      handleCompanyNameSearch: vi.fn(),
      companySearchError: false,
      setCompanySearchError: vi.fn(),
      companyPickerResults: [],
      onCompanyPicked: vi.fn(),
      closeCompanyPicker: vi.fn(),
    };
  },
}));
vi.mock('../../api', () => ({
  deleteLabourInspectionForm: h.deleteForm,
  getLabourInspectionFormSnapshot: h.getSnapshot,
}));
vi.mock('../../components/EtoimikQueryCard/EtoimikQueryCard', () => ({
  EtoimikQueryCard: (p: object) => {
    h.etoimik(p);
    return <div data-testid="etoimik" />;
  },
}));
vi.mock('../../components/LabourInspection/LabourInspectionFormFields', () => ({
  LabourInspectionFormFields: (p: { readOnly: boolean }) => <div data-testid="fields" data-readonly={String(p.readOnly)} />,
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
vi.mock('../../../../shared/components/DeleteConfirmModal', async () => ({
  DeleteConfirmModal: (await import('../../testing/commonStubs')).DeleteConfirmModalStub,
}));

import { LabourInspectionFormPage } from './LabourInspectionFormPage';

const setForm = (o: Record<string, unknown> = {}) => {
  h.detail = { form: { id: 5, formNumber: 'TK-1', version: 3, status: 'saved', ...o }, loading: false, refetch: vi.fn() };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { id: '5' };
  h.state = undefined;
  h.perms = ['labour_inspection_form.read'];
  h.admin = false;
  h.formError = null;
  h.hook = { dirty: false, values: {} };
  setForm();
  h.deleteForm.mockResolvedValue([]);
  h.getSnapshot.mockResolvedValue([{ formNumber: 'TK-1', version: 2, status: 'published' }]);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LabourInspectionFormPage (detail)', () => {
  it('laadimine, keelatud ja puuduv vorm', () => {
    h.detail = { form: null, loading: true, refetch: vi.fn() };
    const a = render(<LabourInspectionFormPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    a.unmount();
    setForm();
    h.perms = [];
    const b = render(<LabourInspectionFormPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    b.unmount();
    h.perms = ['labour_inspection_form.read'];
    h.detail = { form: null, loading: false, refetch: vi.fn() };
    render(<LabourInspectionFormPage />);
    expect(screen.getByTestId('not-found')).toBeTruthy();
  });

  it('salvestatud vorm: muutmisrežiim, katkesta, salvesta, kinnita, kustuta', async () => {
    h.admin = true;
    h.perms = ['labour_inspection_form.write'];
    h.hook.dirty = true;
    render(<LabourInspectionFormPage />);
    expect(screen.getByText('GR-1/3'.replace('GR', 'TK'))).toBeTruthy();
    expect(screen.getByText('forms.labour_inspection.unsavedChangesWarning')).toBeTruthy();
    fireEvent.click(screen.getByText('common.save'));
    expect(h.submitForm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.confirm'));
    expect(h.triggerConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(h.deleteForm).toHaveBeenCalledWith('5', 'saved'));
    expect(h.navigate).toHaveBeenCalledWith('/', { state: { justCreated: true } });
    fireEvent.click(screen.getByText('common.cancel'));
    expect(h.resetForm).toHaveBeenCalled();
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('true');
  });

  it('kustutamise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.admin = true;
    h.deleteForm.mockRejectedValue(new Error('x'));
    render(<LabourInspectionFormPage />);
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(h.navigate).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('kinnitatud vorm: muuda ja avalikusta', () => {
    h.admin = true;
    setForm({ status: 'confirmed', formNumber: '' });
    render(<LabourInspectionFormPage />);
    expect(screen.getByText('forms.labour_inspection_form')).toBeTruthy();
    fireEvent.click(screen.getByText('common.publish'));
    expect(h.triggerPublish).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.edit'));
    expect(screen.getByTestId('fields').getAttribute('data-readonly')).toBe('false');
  });

  it('menetlusega kinnitatud vormi ei saa käsitsi avalikustada ilma tulemuseta', () => {
    h.admin = true;
    h.hook.values = { proceedingReferenceNumber: 'M-1' };
    setForm({ status: 'confirmed' });
    render(<LabourInspectionFormPage />);
    expect(screen.queryByText('common.publish')).toBeNull();
  });

  it('lugemisvaates ilma õigusteta muutmisnuppe pole', () => {
    setForm({ status: 'published' });
    render(<LabourInspectionFormPage />);
    expect(screen.queryByText('common.edit')).toBeNull();
    expect(screen.getByTestId('print-button')).toBeTruthy();
  });

  it('e-toimiku kaart karistatud isikuga ja menetluse numbriga', () => {
    h.perms = ['labour_inspection_form.read', 'control_form.punishment_register'];
    setForm({
      status: 'published',
      punishedPersonIdCode: '39001010000',
      punishedPersonFirstName: 'Mari',
      punishedPersonLastName: 'Maasikas',
      proceedingReferenceNumber: 'M-7',
    });
    render(<LabourInspectionFormPage />);
    expect(screen.getByTestId('etoimik')).toBeTruthy();
    const props = h.etoimik.mock.calls[0][0];
    expect(props.referenceNumberOptions).toEqual([{ label: 'TK-1 — M-7', value: 'M-7' }]);
    expect(props.drivers[0].firstName).toBe('Mari');
    expect(props.compoundFormKey).toBe(5);
  });

  it('e-toimiku kaart ilma viitenumbri ja vormi numbrita', () => {
    h.perms = ['labour_inspection_form.read', 'control_form.punishment_register'];
    setForm({ status: 'published', formNumber: undefined, punishedPersonFirstName: 'Mari' });
    render(<LabourInspectionFormPage />);
    expect(h.etoimik.mock.calls[0][0].referenceNumberOptions).toEqual([]);
    expect(h.etoimik.mock.calls[0][0].drivers[0].personalCodeEe).toBe('');
  });

  it('tagasikutsed näitavad teateid ja värskendavad', () => {
    h.admin = true;
    h.formError = 'FORM-ERR';
    render(<LabourInspectionFormPage />);
    expect(screen.getByText('FORM-ERR')).toBeTruthy();
    act(() => h.callbacks.saved!());
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    act(() => h.callbacks.confirmed!());
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    act(() => h.callbacks.published!());
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    expect(h.detail.refetch).toHaveBeenCalledTimes(3);
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
  });

  it('just created olek avab muutmise ja salvestamise teate', () => {
    h.state = { justCreated: true };
    setForm({ status: 'confirmed' });
    render(<LabourInspectionFormPage />);
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /close|sulge/i })[0]);
  });
});

describe('LabourInspectionFormPage (snapshot)', () => {
  beforeEach(() => {
    h.params = { id: '5', snapshotId: '9' };
  });

  it('näitab versiooni kirjutuskaitstult', async () => {
    render(<LabourInspectionFormPage />);
    expect(await screen.findByText('TK-1/2')).toBeTruthy();
    expect(h.getSnapshot).toHaveBeenCalledWith('9', '5');
    expect(screen.getByTestId('print-button').getAttribute('data-snapshot')).toBe('9');
  });

  it('numbrita snapshot, objektivastus', async () => {
    h.getSnapshot.mockResolvedValue({ version: 1 });
    render(<LabourInspectionFormPage />);
    expect(await screen.findByText('forms.labour_inspection_form')).toBeTruthy();
  });

  it('viga näitab "ei leitud"', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.getSnapshot.mockRejectedValue(new Error('x'));
    render(<LabourInspectionFormPage />);
    expect(await screen.findByTestId('not-found')).toBeTruthy();
    err.mockRestore();
  });

  it('õigusteta kasutaja', async () => {
    h.perms = [];
    render(<LabourInspectionFormPage />);
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });
});
