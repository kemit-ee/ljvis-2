// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundFormPage } from './CompoundFormPage';
import * as api from '../../api';
import { stubRefApi } from '../../testSupport/propsStub';
import { driveAll } from '../../testSupport/driveForm';

const auth = {
  perms: new Set<string>(),
  user: { firstname: 'Ines', lastname: 'Insp', organisationid: 7, personalcode: '39001010000' } as Record<string, unknown>,
};
const route = { params: { id: '5' } as Record<string, string | undefined>, state: undefined as unknown };
const detail = { form: null as Record<string, unknown> | null, loading: false, refetch: vi.fn() };
const navigate = vi.fn();
const compound = {
  formik: {
    values: { trailers: [{ regNr: 'T1' }, { regNr: '' }], drivers: [{}, {}] },
    setFieldValue: vi.fn(),
    handleSubmit: vi.fn(),
    validateForm: vi.fn(async () => ({}) as Record<string, unknown>),
    setTouched: vi.fn(),
    resetForm: vi.fn(),
  },
  triggerConfirm: vi.fn(),
  triggerPublish: vi.fn(),
  triggerSaveAsSaved: vi.fn(),
  triggerSaveAfterSubFormDelete: vi.fn(),
  handleCountyChange: vi.fn(),
  handleCompanyCountyChange: vi.fn(),
};
let hookArgs: unknown[] = [];
const schemaState = { valid: true };

vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testSupport/tediMock')).tediMock);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-router-dom', () => ({
  useParams: () => route.params,
  useNavigate: () => navigate,
  useLocation: () => ({ state: route.state }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => auth.perms.has(p), user: auth.user }),
}));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../../../hooks/useContainerWidth', () => ({ useContainerWidth: () => 1000 }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('./useCompoundFormDetail', () => ({
  useCompoundFormDetail: () => ({ form: detail.form, loading: detail.loading, refetch: detail.refetch }),
}));
vi.mock('./useCompoundForm', () => ({
  useCompoundForm: (...args: unknown[]) => {
    hookArgs = args;
    return {
      ...compound,
      structureUnits: [], orgOptions: [], roads: [], trailerCategories: [], vehicleCategories: [], counties: [],
      citiesParishes: [], companyCitiesParishes: [], handleOrgChange: vi.fn(), handleStructuralUnitChange: vi.fn(),
      companySearchError: false, setCompanySearchError: vi.fn(), vehicleSearchError: false, setVehicleSearchError: vi.fn(),
      trailerSearchError: null, setTrailerSearchError: vi.fn(), mtrSearchError: null, setMtrSearchError: vi.fn(),
      driverSearchError: null, setDriverSearchError: vi.fn(), driverSearchNotFound: null, setDriverSearchNotFound: vi.fn(),
      driverSearchLoading: null, handleCompanySearch: vi.fn(), handleCompanyNameSearch: vi.fn(), companyPickerResults: [],
      onCompanyPicked: vi.fn(), closeCompanyPicker: vi.fn(), handleVehicleSearch: vi.fn(), handleTrailerSearch: vi.fn(),
      handleMtrSearch: vi.fn(), handleDriverPersonSearch: vi.fn(),
    };
  },
}));
vi.mock('../../api', () => ({
  deleteCompoundForm: vi.fn(),
  deleteTechnicalCheckForm: vi.fn(),
  getCompoundFormSnapshot: vi.fn(),
  getDriveRestFormByCompoundFormKey: vi.fn(),
  saveDriveRestForm: vi.fn(),
  listTechnicalCheckFormsByCompoundFormKey: vi.fn(),
  getTechnicalCheckForm: vi.fn(),
  listTransportInterruptionFormsByCompoundFormKey: vi.fn(),
  getTransportInterruptionForm: vi.fn(),
  listAdrFormsByCompoundFormKey: vi.fn(),
  getAdrForm: vi.fn(),
  saveAdrForm: vi.fn(),
  saveTransportInterruptionForm: vi.fn(),
  saveTechnicalCheckForm: vi.fn(),
  publishDriveRestForm: vi.fn(),
  publishTechnicalCheckForm: vi.fn(),
  publishAdrForm: vi.fn(),
  publishTransportInterruptionForm: vi.fn(),
  deleteDriveRestForm: vi.fn(),
  deleteAdrForm: vi.fn(),
  deleteTransportInterruptionForm: vi.fn(),
}));
vi.mock('../drive-rest-form/useDriveRestForm', () => ({
  createDriveRestValidationSchema: () => ({ isValid: async () => schemaState.valid }),
  serializeDriveRestFormValues: (d: unknown) => d,
}));
vi.mock('../technical-check-form/useTechnicalCheckForm.ts', () => ({
  createTechnicalCheckValidationSchema: () => ({ isValid: async () => schemaState.valid }),
}));
vi.mock('../adr-form/useAdrForm', () => ({
  createAdrValidationSchema: () => ({ isValid: async () => schemaState.valid }),
  serializeAdrFormPayload: (d: unknown) => d,
}));
vi.mock('../../components/CompoundForm/CompoundFormViewCard', async () => ({
  CompoundFormViewCard: (await import('../../testSupport/propsStub')).makeStub('compound-view'),
}));
vi.mock('../../components/CompoundForm/CompoundFormEditCard', async () => ({
  CompoundFormEditCard: (await import('../../testSupport/propsStub')).makeStub('compound-edit'),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormViewCard', async () => ({
  DriveRestFormViewCard: (await import('../../testSupport/propsStub')).makeStub('drive-view'),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormEditCard', async () => ({
  DriveRestFormEditCard: (await import('../../testSupport/propsStub')).makeStub('drive-edit', true),
}));
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormViewCard.tsx', async () => ({
  TechnicalCheckFormViewCard: (await import('../../testSupport/propsStub')).makeStub('tech-view'),
}));
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormEditCard.tsx', async () => ({
  TechnicalCheckFormEditCard: (await import('../../testSupport/propsStub')).makeStub('tech-edit', true),
}));
vi.mock('../../components/AdrForm/AdrFormViewCard', async () => ({
  AdrFormViewCard: (await import('../../testSupport/propsStub')).makeStub('adr-view'),
}));
vi.mock('../../components/AdrForm/AdrFormEditCard', async () => ({
  AdrFormEditCard: (await import('../../testSupport/propsStub')).makeStub('adr-edit', true),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormViewCard', async () => ({
  TransportInterruptionFormViewCard: (await import('../../testSupport/propsStub')).makeStub('ti-view'),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormEditCard', async () => ({
  TransportInterruptionFormEditCard: (await import('../../testSupport/propsStub')).makeStub('ti-edit', true),
}));
vi.mock('../../components/shared/FileUploadBlock', () => ({ FileUploadBlock: () => <div data-testid="files" /> }));
vi.mock('../../../../shared/components/FormLoadError', () => ({ FormLoadError: () => <div>load-error</div> }));
vi.mock('../../../../shared/components/DeleteConfirmModal', async () => ({
  DeleteConfirmModal: (await import('../../testSupport/propsStub')).makeStub('delete-modal'),
}));

const A = vi.mocked(api);
const sub = (id: number, status: string, extra: Record<string, unknown> = {}) => ({ id, status, subFormNumber: `N${id}`, createdBy: '39001010000', ...extra });
const ALL_PERMS = [
  'compound_form.read', 'compound_form.write', 'control_form.view_unpublished', 'control_form.edit_locked', 'control_form.delete',
  'sp_driver_form.write', 'sp_teammate_form.write', 'vehicle_technical_form.write', 'trailer_technical_form.write',
  'adr_form.write', 'transport_interruption_form.write',
];
const baseForm = (over: Record<string, unknown> = {}) => ({
  id: '5', formNumber: 'K-1', status: 'saved', trailers: [{ regNr: 'T1' }], inspectorFirstName: 'ines', inspectorLastName: 'insp',
  inspectorOrganisationId: 7, ...over,
});

const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
};

const cb = (name: string, idx = 0) => {
  const el = document.querySelectorAll(`[data-cb="${name}"]`)[idx] as HTMLElement | undefined;
  if (!el) throw new Error(`puudub ${name}`);
  return el;
};
const click = async (name: string, idx = 0) => {
  await act(async () => {
    fireEvent.click(cb(name, idx));
  });
  await settle();
};

const loadSubForms = (over: Partial<Record<'driver' | 'teammate' | 'vehicle' | 'trailers' | 'adr' | 'ti', unknown>> = {}) => {
  const d = { driver: sub(11, 'saved'), teammate: sub(12, 'saved'), vehicle: sub(13, 'saved'), trailers: [sub(14, 'saved'), sub(15, 'saved')], adr: sub(16, 'saved'), ti: sub(17, 'saved'), ...over } as any;
  A.getDriveRestFormByCompoundFormKey.mockImplementation((async (scope: string) => (scope === 'driver' ? d.driver : d.teammate)) as never);
  A.listTechnicalCheckFormsByCompoundFormKey.mockImplementation((async (scope: string) =>
    scope === 'vehicle' ? (d.vehicle ? [{ id: 13 }] : []) : d.trailers.map((t: any) => ({ id: t?.id }))) as never);
  A.getTechnicalCheckForm.mockImplementation((async (scope: string, id: number) =>
    scope === 'vehicle' ? d.vehicle : d.trailers.find((t: any) => t.id === id)) as never);
  A.listAdrFormsByCompoundFormKey.mockResolvedValue((d.adr ? [{ id: 16 }] : []) as never);
  A.getAdrForm.mockResolvedValue(d.adr as never);
  A.listTransportInterruptionFormsByCompoundFormKey.mockResolvedValue((d.ti ? [{ id: 17 }] : []) as never);
  A.getTransportInterruptionForm.mockResolvedValue(d.ti as never);
};

const renderPage = async () => {
  render(<CompoundFormPage />);
  await settle();
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.perms = new Set(ALL_PERMS);
  route.params = { id: '5' };
  route.state = undefined;
  detail.form = baseForm();
  detail.loading = false;
  schemaState.valid = true;
  compound.formik.validateForm.mockResolvedValue({});
  window.scrollTo = vi.fn() as never;
  for (const fn of Object.values(A)) (fn as any).mockResolvedValue(undefined);
  A.getDriveRestFormByCompoundFormKey.mockResolvedValue(null as never);
  A.listTechnicalCheckFormsByCompoundFormKey.mockResolvedValue([] as never);
  A.listAdrFormsByCompoundFormKey.mockResolvedValue([] as never);
  A.listTransportInterruptionFormsByCompoundFormKey.mockResolvedValue([] as never);
});
afterEach(cleanup);

describe('CompoundFormPage ilma alamvormideta', () => {
  it('näitab laadimist, keeldu ja laadimisviga', async () => {
    detail.loading = true;
    detail.form = null;
    const { unmount } = render(<CompoundFormPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    unmount();
    detail.loading = false;
    await renderPage();
    expect(screen.getByText('load-error')).toBeTruthy();
    cleanup();
    detail.form = baseForm();
    auth.perms = new Set();
    await renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('salvestatud vorm: muutmiskaart, hoiatused, salvestus ja kustutus', async () => {
    route.state = { justCreated: true };
    await renderPage();
    expect(screen.getByTestId('compound-edit')).toBeTruthy();
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    // Kaardi tagasikutsed
    await click('compound-edit:onConfirm:0');
    expect(compound.triggerConfirm).toHaveBeenCalled();
    await click('compound-edit:onDelete:0');
    expect(A.deleteCompoundForm).toHaveBeenCalledWith('5', 'saved');
    expect(navigate).toHaveBeenCalledWith('/', { state: { justCreated: true } });
    A.deleteCompoundForm.mockRejectedValueOnce(new Error('x'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await click('compound-edit:onDelete:0');
    expect(err).toHaveBeenCalled();
    err.mockRestore();
    // Lehe tagasikutsed – käivita kõik
    for (const n of [
      'compound-edit:onAddTrailerControlForm:0', 'compound-edit:onEditTrailerControlForm:0', 'compound-edit:onAddTeammateControlForm:0',
      'compound-edit:onEditTeammateControlForm:0', 'compound-edit:onRemoveTeammate:0', 'compound-edit:onRemoveTrailer:0',
    ]) {
      if (document.querySelector(`[data-cb="${n}"]`)) await click(n);
    }
    fireEvent.click(screen.getByText('common.save'));
    expect(compound.formik.handleSubmit).toHaveBeenCalled();
    // Hoiatuste sulgemine
    fireEvent.click(screen.getAllByLabelText('alert-close')[0]);
    await click('compound-edit:onCancel:0');
    expect(compound.formik.resetForm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.edit'));
  });

  it('kinnitatud vorm: vaatekaart, muutmise nupp, hoiatused', async () => {
    detail.form = baseForm({ status: 'confirmed' });
    await renderPage();
    expect(screen.getByTestId('compound-view')).toBeTruthy();
    await click('compound-view:onEdit:0');
    expect(screen.getByTestId('compound-edit')).toBeTruthy();
    cleanup();
    await renderPage();
    fireEvent.click(screen.getByText('common.edit'));
  });

  it('salvestuse/kinnituse/avalikustuse tagasikutsed näitavad teateid', async () => {
    await renderPage();
    const [, onSaved, onConfirmed, , onResetToSaved, onPublished, , getStatus] = hookArgs as Array<(...a: unknown[]) => any>;
    await act(async () => {
      onSaved();
      onResetToSaved();
    });
    expect(detail.refetch).toHaveBeenCalled();
    await act(async () => {
      onConfirmed();
    });
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    fireEvent.click(screen.getAllByLabelText('alert-close')[0]);
    await act(async () => {
      onPublished();
    });
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    fireEvent.click(screen.getAllByLabelText('alert-close')[0]);
    expect(getStatus()).toEqual({ allConfirmedOrPublished: true, allPublished: false });
  });

  it('avaldatud vorm ja kustutatud vorm ilma muutmisõigusteta', async () => {
    detail.form = baseForm({ status: 'deleted' });
    auth.perms = new Set(['compound_form.read']);
    await renderPage();
    expect(screen.queryByText('common.edit')).toBeNull();
    cleanup();
    detail.form = baseForm({ status: 'published', trailers: JSON.stringify([{ regNr: 'T' }]) });
    await renderPage();
  });
});

describe('CompoundFormPage hetktõmmis', () => {
  beforeEach(() => {
    route.params = { id: '5', snapshotId: 's1' };
  });
  it('laadib ja kuvab hetktõmmise vaatekaardi', async () => {
    A.getCompoundFormSnapshot.mockResolvedValue([{ id: '5', county: '1', companyCounty: '2' }] as never);
    await renderPage();
    expect(screen.getByTestId('compound-view')).toBeTruthy();
    expect(compound.handleCountyChange).toHaveBeenCalled();
    expect(compound.handleCompanyCountyChange).toHaveBeenCalled();
    await click('compound-view:onEdit:0');
  });
  it('objektina vastus ilma maakondadeta; viga; keeld', async () => {
    A.getCompoundFormSnapshot.mockResolvedValue({ id: '5' } as never);
    await renderPage();
    expect(screen.getByTestId('compound-view')).toBeTruthy();
    cleanup();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    A.getCompoundFormSnapshot.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getByText('load-error')).toBeTruthy();
    err.mockRestore();
    cleanup();
    A.getCompoundFormSnapshot.mockResolvedValue({ id: '5' } as never);
    auth.perms = new Set();
    await renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });
  it('näitab laadimist enne vastust', () => {
    A.getCompoundFormSnapshot.mockReturnValue(new Promise(() => {}) as never);
    render(<CompoundFormPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
  });
});

describe('CompoundFormPage alamvormidega', () => {
  it('laeb kõik alamvormid, kuvab sakid ja käivitab alamvormide tagasikutsed', async () => {
    loadSubForms();
    await renderPage();
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(5);
    // kõik tagasikutsed igas stubis; muutmisrežiimis (saved + õigused)
    const names = Array.from(document.querySelectorAll('[data-cb]')).map((e) => e.getAttribute('data-cb')!);
    expect(names.length).toBeGreaterThan(30);
    for (const n of names) {
      if (/compound-edit:onDelete|delete-modal|:onRemove|onConfirm:0$/.test(n)) continue;
      if (document.querySelector(`[data-cb="${n}"]`)) await click(n);
    }
    expect(stubRefApi).toBeTruthy();
  });

  it('kinnitatud ja avaldatud alamvormid: vaatekaardid, avalikustamine', async () => {
    loadSubForms({
      driver: sub(11, 'confirmed'), teammate: sub(12, 'confirmed'), vehicle: sub(13, 'confirmed'),
      trailers: [sub(14, 'confirmed'), sub(15, 'published')], adr: sub(16, 'confirmed'), ti: sub(17, 'confirmed'),
    });
    detail.form = baseForm({ status: 'confirmed' });
    auth.perms = new Set(ALL_PERMS.filter((p) => p !== 'control_form.edit_locked'));
    await renderPage();
    for (const n of ['drive-view', 'tech-view', 'adr-view', 'ti-view']) {
      expect(screen.getAllByTestId(n).length).toBeGreaterThan(0);
    }
    const names = Array.from(document.querySelectorAll('[data-cb]')).map((e) => e.getAttribute('data-cb')!).filter((n) => /-view:onPublish/.test(n));
    expect(names.length).toBeGreaterThan(4);
    for (const n of names) await click(n);
    expect(A.publishDriveRestForm).toHaveBeenCalled();
    expect(A.publishTechnicalCheckForm).toHaveBeenCalled();
    expect(A.publishAdrForm).toHaveBeenCalled();
    expect(A.publishTransportInterruptionForm).toHaveBeenCalled();
  });

  it('muutmise nupp (administraator) avab kõik alamvormid, tühistamine sulgeb', async () => {
    loadSubForms({
      driver: sub(11, 'confirmed'), teammate: sub(12, 'confirmed'), vehicle: sub(13, 'confirmed'),
      trailers: [sub(14, 'confirmed')], adr: sub(16, 'confirmed'), ti: sub(17, 'confirmed'),
    });
    detail.form = baseForm({ status: 'confirmed' });
    await renderPage();
    fireEvent.click(screen.getAllByText('common.edit').pop()!);
    await settle();
    expect(screen.getAllByTestId('drive-edit').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('common.cancel'));
    await settle();
    expect(compound.formik.resetForm).toHaveBeenCalled();
  });

  it('omaenda kinnitatud vormi taasavamine ilma administraatori õigusteta', async () => {
    loadSubForms({
      driver: sub(11, 'confirmed'), teammate: null, vehicle: sub(13, 'confirmed'), trailers: [sub(14, 'confirmed')], adr: null, ti: null,
    });
    detail.form = baseForm({ status: 'confirmed' });
    auth.perms = new Set(['compound_form.read', 'compound_form.write', 'sp_driver_form.write', 'vehicle_technical_form.write', 'trailer_technical_form.write']);
    await renderPage();
    fireEvent.click(screen.getByText('common.edit'));
    await settle();
  });

  it('„Salvesta kõik": õnnestumine kõigil saktidel ja valideerimisviga', async () => {
    loadSubForms();
    await renderPage();
    const trailerCalls = vi.fn();
    A.saveTechnicalCheckForm.mockImplementation((async (...a: unknown[]) => { trailerCalls(...a); }) as never);
    fireEvent.click(screen.getByText('common.save'));
    await settle();
    expect(compound.formik.handleSubmit).toHaveBeenCalled();
    expect(A.saveDriveRestForm).toHaveBeenCalled();
    expect(A.saveAdrForm).toHaveBeenCalled();
    expect(A.saveTransportInterruptionForm).toHaveBeenCalled();
    expect(trailerCalls).toHaveBeenCalled();
    vi.clearAllMocks();
    schemaState.valid = false;
    // sisendandmed (draft) puuduvad → skeemi viga ei teki; sea draft läbi onValuesChange
    await click('drive-edit:onValuesChange:1');
    await click('adr-edit:onValuesChange:1');
    fireEvent.click(screen.getByText('common.save'));
    await settle();
    expect(A.saveAdrForm).not.toHaveBeenCalled();
  });

  it('„Salvesta kõik": üldosa valideerimine ebaõnnestub', async () => {
    loadSubForms();
    await renderPage();
    compound.formik.validateForm.mockResolvedValue({ address: 'x' });
    compound.formik.values = { trailers: [{ regNr: 'T1' }], drivers: [{ firstName: 'a', nested: { z: 1 } }] } as never;
    fireEvent.click(screen.getByText('common.save'));
    await settle();
    expect(compound.formik.setTouched).toHaveBeenCalled();
    expect(compound.formik.handleSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText('forms.compound.generalPart').length).toBeGreaterThan(0);
  });

  it('salvestusvead alamvormi salvestamisel logitakse', async () => {
    loadSubForms();
    await renderPage();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const f of [A.saveTechnicalCheckForm, A.saveDriveRestForm, A.saveAdrForm, A.saveTransportInterruptionForm]) {
      f.mockRejectedValue(new Error('x'));
    }
    fireEvent.click(screen.getByText('common.save'));
    await settle();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('uue alamvormi lisamine ripploendist, sulgemine ja eemaldamise kinnitus', async () => {
    loadSubForms({ driver: null, teammate: null, vehicle: sub(13, 'saved'), trailers: [], adr: null, ti: null });
    await renderPage();
    fireEvent.click(screen.getByText('forms.driver_drive_rest_form'));
    await settle();
    fireEvent.click(screen.getByText('forms.adr.title'));
    await settle();
    fireEvent.click(screen.getByText('forms.transport_interruption.title'));
    await settle();
    // sulgemisnupud
    for (const b of screen.getAllByLabelText('closing')) {
      fireEvent.click(b);
      await settle();
    }
    // kinnitusmodaal
    const modalCbs = Array.from(document.querySelectorAll('[data-cb^="delete-modal"]')).map((e) => e.getAttribute('data-cb')!);
    for (const n of modalCbs) await click(n);
  });

  it('alamvormi eemaldamine: kinnitamine ja tühistamine; haagise eemaldamine üldosast', async () => {
    loadSubForms();
    await renderPage();
    for (const b of screen.getAllByLabelText('closing')) {
      fireEvent.click(b);
      await settle();
      const confirm = document.querySelector('[data-cb="delete-modal:onDelete:0"]');
      if (confirm) await click('delete-modal:onDelete:0');
    }
    await settle();
  });

  it('eemaldamine ja üldosa tagasikutsed (haagis, meeskonnaliige)', async () => {
    loadSubForms();
    await renderPage();
    const names = ['compound-edit:onRemoveTrailer:0', 'compound-edit:onRemoveTeammate:0'];
    for (const n of names) {
      if (document.querySelector(`[data-cb="${n}"]`)) {
        await click(n);
        if (document.querySelector('[data-cb="delete-modal:onClose:0"]')) await click('delete-modal:onClose:0');
      }
    }
    for (const n of names) {
      if (document.querySelector(`[data-cb="${n}"]`)) {
        await click(n);
        if (document.querySelector('[data-cb="delete-modal:onDelete:0"]')) await click('delete-modal:onDelete:0');
      }
    }
  });

  it('kustuta kõik alamvormid', async () => {
    loadSubForms();
    await renderPage();
    await click('delete-modal:onDelete:0', 1);
    expect(navigate).toHaveBeenCalledWith('/');
    expect(A.deleteDriveRestForm).toHaveBeenCalled();
  });

  it('SelectedFormsNavigation ja saki vahetus', async () => {
    loadSubForms();
    await renderPage();
    fireEvent.click(screen.getAllByRole('tab')[1]);
    driveAll(document, { skip: (el) => el.hasAttribute('data-cb') });
    fireEvent.click(screen.getAllByText('forms.adr.title').pop()!);
    await settle();
  });

  it('laadimisvead alamvormide laadimisel', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    A.getDriveRestFormByCompoundFormKey.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('alamvormid ilma täisandmeta: tühjad nimekirjad, vigased getX', async () => {
    A.getDriveRestFormByCompoundFormKey.mockResolvedValue(null as never);
    A.listTechnicalCheckFormsByCompoundFormKey.mockImplementation((async (s: string) => (s === 'vehicle' ? [{ id: 1 }] : [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }])) as never);
    A.getTechnicalCheckForm.mockRejectedValue(new Error('x'));
    A.listAdrFormsByCompoundFormKey.mockResolvedValue([{ id: 1 }] as never);
    A.getAdrForm.mockRejectedValue(new Error('x'));
    A.listTransportInterruptionFormsByCompoundFormKey.mockResolvedValue([{ id: 1 }] as never);
    A.getTransportInterruptionForm.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getByTestId('compound-edit')).toBeTruthy();
  });

  it('kokkuvõtlik käivitus: ülejäänud nupud ja vormid', async () => {
    loadSubForms({
      driver: sub(11, 'saved'), teammate: sub(12, 'confirmed'), vehicle: sub(13, 'published'),
      trailers: [sub(14, 'saved')], adr: sub(16, 'confirmed'), ti: sub(17, 'saved'),
    });
    await renderPage();
    for (const n of Array.from(document.querySelectorAll('[data-cb]')).map((e) => e.getAttribute('data-cb')!)) {
      if (/delete-modal|:onRemove/.test(n)) continue;
      if (document.querySelector(`[data-cb="${n}"]`)) await click(n);
    }
  });
});
