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
  cb: {} as { saved?: () => void; confirmed?: () => void; reset?: () => void; published?: () => void },
  triggerConfirm: vi.fn(),
  triggerPublish: vi.fn(),
  handleSubmit: vi.fn(),
  submitForm: vi.fn(),
  resetForm: vi.fn(),
  submitCount: 0,
  isValid: true,
  values: {} as Record<string, unknown>,
  deleteForm: vi.fn(),
  getSnapshot: vi.fn(),
  etoimik: vi.fn(),
  ncr: vi.fn(),
  hookArg: undefined as unknown,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => h.navigate,
  useParams: () => h.params,
  useLocation: () => ({ state: h.state }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => {
  // Stabiilsed viited: leht kasutab hasPermission-it efekti sõltuvusena.
  const auth = {
    hasPermission: (p: string) => h.perms.includes(p),
    hasAnyPermission: (ps: string[]) => ps.some((p) => h.perms.includes(p)),
  };
  return { useAuth: () => auth };
});
vi.mock('../../../../hooks/useIsAdmin', () => ({ useIsAdmin: () => h.admin }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('./useTramControlCardDetail', () => ({ useTramControlCardDetail: () => h.detail }));
vi.mock('./useTramControlCard', () => ({
  useTramControlCard: (arg: unknown, saved: () => void, confirmed: () => void, reset: () => void, published: () => void) => {
    h.hookArg = arg;
    h.cb = { saved, confirmed, reset, published };
    return {
      formik: {
        handleSubmit: h.handleSubmit,
        submitForm: h.submitForm,
        resetForm: h.resetForm,
        submitCount: h.submitCount,
        isValid: h.isValid,
        isSubmitting: false,
        values: h.values,
      },
      structureUnits: [],
      orgOptions: [],
      roads: [],
      trailerCategories: [],
      vehicleCategories: [],
      counties: [],
      citiesParishes: [],
      companyCitiesParishes: [],
      triggerConfirm: h.triggerConfirm,
      triggerPublish: h.triggerPublish,
    };
  },
}));
vi.mock('../../api', () => ({ getTramFormSnapshot: h.getSnapshot, deleteTramForm: h.deleteForm }));
vi.mock('../../components/AdministrativeProcedureCard/AdministrativeProcedureCard', () => ({
  AdministrativeProcedureCard: () => <div data-testid="admin-proc" />,
}));
vi.mock('../../components/CompoundForm/CompoundFormEditCard', () => ({
  CompoundFormEditCard: (p: { onCancel: () => void; onDelete: () => void }) => (
    <div data-testid="edit-card">
      <button onClick={p.onCancel}>edit-card-cancel</button>
      <button onClick={p.onDelete}>edit-card-delete</button>
    </div>
  ),
}));
vi.mock('../../components/CompoundForm/CompoundFormViewCard', () => ({
  CompoundFormViewCard: (p: { onEdit: () => void; canEdit: boolean; isSnapshot?: boolean }) => (
    <div data-testid="view-card" data-snapshot={String(!!p.isSnapshot)} data-can-edit={String(p.canEdit)}>
      <button onClick={p.onEdit}>view-card-edit</button>
    </div>
  ),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormFields', () => ({
  DriveRestFormFields: (p: { readOnly: boolean }) => <div data-testid="dr-fields" data-readonly={String(p.readOnly)} />,
}));
vi.mock('../../components/EtoimikQueryCard/EtoimikQueryCard', () => ({
  EtoimikQueryCard: (p: object) => {
    h.etoimik(p);
    return <div data-testid="etoimik" />;
  },
}));
vi.mock('../../components/FormVersionsTable/FormVersionsTable.tsx', async () => ({
  FormVersionsTable: (await import('../../testing/commonStubs')).FormVersionsTableStub,
}));
vi.mock('../../components/FormPrintButton/FormPrintButton.tsx', async () => ({
  FormPrintButton: (await import('../../testing/commonStubs')).FormPrintButtonStub,
}));
vi.mock('../../components/shared/NotifyCarrierCheckbox', () => ({
  NotifyCarrierCheckbox: (p: { onChange: (v: boolean) => void }) => <button onClick={() => p.onChange(true)}>notify-carrier</button>,
}));
vi.mock('../../components/shared/RequestCarrierNotification', () => ({
  RequestCarrierNotification: () => <div data-testid="request-notification" />,
}));
vi.mock('../../../erru/components/Ncr/NcrBuildModal', () => ({
  NcrBuildModal: (p: { open: boolean; onClose: () => void; spFormKey: unknown }) => {
    h.ncr(p);
    return p.open ? <button onClick={p.onClose}>ncr-close</button> : null;
  },
}));
vi.mock('../../../../shared/components/FormNotFoundView', async () => ({
  FormNotFoundView: (await import('../../testing/commonStubs')).FormNotFoundViewStub,
}));
vi.mock('../../../../shared/components/DeleteConfirmModal', async () => ({
  DeleteConfirmModal: (await import('../../testing/commonStubs')).DeleteConfirmModalStub,
}));

import { TramControlCardPage } from './TramControlCardPage';

const setForm = (o: Record<string, unknown> = {}) => {
  h.detail = {
    form: { id: 5, formNumber: 'TRAM-1', status: 'saved', drivers: [{ firstName: 'Jaan' }], vehicleCountryCode: 'LV', inspectorOrganisationId: 'TRAM', ...o },
    loading: false,
    refetch: vi.fn(),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { id: '5' };
  h.state = undefined;
  h.perms = ['tram_driver_form.read'];
  h.admin = false;
  h.submitCount = 0;
  h.isValid = true;
  h.values = {};
  setForm();
  h.deleteForm.mockResolvedValue([]);
  h.getSnapshot.mockResolvedValue([{ formNumber: 'TRAM-1', status: 'published' }]);
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TramControlCardPage (detail)', () => {
  it('keelatud, laadimine ja puuduv kaart', () => {
    h.perms = [];
    const a = render(<TramControlCardPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
    a.unmount();
    h.perms = ['tram_driver_form.read'];
    h.detail = { form: null, loading: true, refetch: vi.fn() };
    const b = render(<TramControlCardPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    b.unmount();
    h.detail = { form: null, loading: false, refetch: vi.fn() };
    render(<TramControlCardPage />);
    expect(screen.getByTestId('not-found')).toBeTruthy();
  });

  it('lugemisvaade: vaatekaart, tõlkimata muutmisnupud puuduvad ilma õigusteta', () => {
    setForm({ status: 'published' });
    render(<TramControlCardPage />);
    expect(screen.getByTestId('view-card')).toBeTruthy();
    expect(screen.getByTestId('dr-fields').getAttribute('data-readonly')).toBe('true');
    expect(screen.getByTestId('admin-proc')).toBeTruthy();
    expect(screen.queryByText('common.edit')).toBeNull();
    expect(screen.queryByText('do-delete')).toBeNull();
  });

  it('salvestatud kaart avab kirjutajale automaatselt muutmisrežiimi', async () => {
    h.perms = ['tram_driver_form.write', 'control_form.delete'];
    render(<TramControlCardPage />);
    expect(await screen.findByTestId('edit-card')).toBeTruthy();
    expect(screen.getByTestId('request-notification')).toBeTruthy();
    fireEvent.click(screen.getByText('common.save'));
    expect(h.handleSubmit).toHaveBeenCalled();
    fireEvent.click(screen.getByText('notify-carrier'));
    fireEvent.click(screen.getByText('common.confirm'));
    expect(h.triggerConfirm).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText('common.cancel'));
    expect(h.resetForm).toHaveBeenCalled();
    expect(screen.getByTestId('view-card')).toBeTruthy();
  });

  it('kustutamine õnnestub ja ebaõnnestub', async () => {
    h.perms = ['tram_driver_form.read', 'control_form.delete'];
    render(<TramControlCardPage />);
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(h.deleteForm).toHaveBeenCalledWith('5', 'saved'));
    expect(h.navigate).toHaveBeenCalledWith('/');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.navigate.mockClear();
    h.deleteForm.mockRejectedValue(new Error('x'));
    fireEvent.click(screen.getByText('do-delete'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(h.navigate).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('kinnitatud kaart: admin muudab, kirjutaja avalikustab', () => {
    h.admin = true;
    h.perms = ['tram_driver_form.write'];
    setForm({ status: 'confirmed' });
    render(<TramControlCardPage />);
    fireEvent.click(screen.getByText('common.publish'));
    expect(h.triggerPublish).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.edit'));
    expect(screen.getByTestId('edit-card')).toBeTruthy();
    fireEvent.click(screen.getByText('edit-card-cancel'));
    fireEvent.click(screen.getByText('view-card-edit'));
    expect(screen.getByTestId('edit-card')).toBeTruthy();
    fireEvent.click(screen.getByText('edit-card-delete'));
  });

  it('menetlusega kaarti ei saa ilma tulemuseta avalikustada', () => {
    h.perms = ['tram_driver_form.write'];
    h.values = { proceedingReferenceNumber: 'M-1' };
    setForm({ status: 'confirmed' });
    render(<TramControlCardPage />);
    expect(screen.queryByText('common.publish')).toBeNull();
  });

  it('e-toimiku kaart karistusregistri õigusega; juhid JSON-stringist ja viitenumbriga', () => {
    h.perms = ['tram_driver_form.read', 'control_form.punishment_register'];
    setForm({ status: 'published', drivers: JSON.stringify([{ firstName: 'Mari' }]), proceedingReferenceNumber: 'M-7' });
    render(<TramControlCardPage />);
    const p = h.etoimik.mock.calls[0][0];
    expect(p.drivers[0].firstName).toBe('Mari');
    expect(p.referenceNumberOptions).toEqual([{ label: 'TRAM-1 — M-7', value: 'M-7' }]);
  });

  it('juhid puuduvad: e-toimiku kaarti ei ole; viitenumbri valik ilma vormi numbrita', () => {
    h.perms = ['tram_driver_form.read', 'control_form.punishment_register'];
    setForm({ status: 'published', drivers: undefined });
    render(<TramControlCardPage />);
    expect(screen.queryByTestId('etoimik')).toBeNull();
    cleanup();
    setForm({ status: 'published', formNumber: undefined, proceedingReferenceNumber: 'M-8' });
    render(<TramControlCardPage />);
    expect(h.etoimik.mock.calls[0][0].referenceNumberOptions[0].label).toBe(' — M-8');
  });

  it('NCR nupp avab ja sulgeb modaali', () => {
    h.perms = ['tram_driver_form.read', 'ncr.create'];
    render(<TramControlCardPage />);
    fireEvent.click(screen.getByText('erru.ncr.buildModal.button'));
    fireEvent.click(screen.getByText('ncr-close'));
    expect(h.ncr).toHaveBeenCalled();
  });

  it('tagasikutsed näitavad teateid ja värskendavad', () => {
    h.state = { justCreated: true };
    h.submitCount = 1;
    h.isValid = false;
    setForm({ status: 'published' });
    render(<TramControlCardPage />);
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    expect(screen.getByText('forms.validationErrorNote')).toBeTruthy();
    act(() => h.cb.saved!());
    act(() => h.cb.confirmed!());
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    act(() => h.cb.published!());
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    act(() => h.cb.reset!());
    expect(h.detail.refetch).toHaveBeenCalledTimes(4);
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
  });
});

describe('TramControlCardPage (snapshot)', () => {
  beforeEach(() => {
    h.params = { id: '5', snapshotId: '9' };
  });

  it('näitab versiooni vaatekaardina', async () => {
    render(<TramControlCardPage />);
    expect(await screen.findByTestId('view-card')).toBeTruthy();
    expect(screen.getByTestId('view-card').getAttribute('data-snapshot')).toBe('true');
    expect(h.getSnapshot).toHaveBeenCalledWith('9', '5');
    expect(screen.getByTestId('dr-fields').getAttribute('data-readonly')).toBe('true');
    fireEvent.click(screen.getByText('view-card-edit'));
  });

  it('objektivastus, viga ja laadimine', async () => {
    h.getSnapshot.mockResolvedValue({ formNumber: 'X' });
    const a = render(<TramControlCardPage />);
    expect(await screen.findByTestId('view-card')).toBeTruthy();
    a.unmount();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.getSnapshot.mockRejectedValue(new Error('x'));
    render(<TramControlCardPage />);
    expect(await screen.findByTestId('not-found')).toBeTruthy();
    err.mockRestore();
  });

  it('laadimisel näitab laadimist', () => {
    h.getSnapshot.mockReturnValue(new Promise(() => {}));
    render(<TramControlCardPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
  });
});
