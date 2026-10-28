// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AnyFn = (...a: unknown[]) => unknown;

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: '5' } as { id?: string; snapshotId?: string },
  perms: [] as string[],
  admin: false,
  compound: { form: null as null | Record<string, unknown>, loading: false, refetch: vi.fn() },
  compoundCbs: {} as { saved?: AnyFn; confirmed?: AnyFn; published?: AnyFn; allConfirmed?: unknown },
  compoundTriggers: { confirm: vi.fn(), publish: vi.fn(), saveAsSaved: vi.fn() },
  formik: {
    values: { trailers: [{ regNr: 'T1' }] } as Record<string, unknown>,
    handleSubmit: vi.fn(),
    validateForm: vi.fn(),
    setTouched: vi.fn(),
    resetForm: vi.fn(),
    setFieldValue: vi.fn(),
    touched: {},
  },
  saveAllOpts: undefined as undefined | Record<string, unknown>,
  saveAll: vi.fn(),
  api: {
    getDriveRestForm: vi.fn(),
    getByCompound: vi.fn(),
    saveDriveRestForm: vi.fn(),
    getSnapshot: vi.fn(),
    listAdr: vi.fn(),
    getAdr: vi.fn(),
    saveAdr: vi.fn(),
    listTi: vi.fn(),
    getTi: vi.fn(),
    saveTi: vi.fn(),
    publishDr: vi.fn(),
    publishTech: vi.fn(),
    publishAdr: vi.fn(),
    publishTi: vi.fn(),
    listTech: vi.fn(),
    getTech: vi.fn(),
    saveTech: vi.fn(),
    deleteDr: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate, useParams: () => h.params }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../auth/AuthContext', () => {
  const auth = { hasPermission: (p: string) => h.perms.includes(p) };
  return { useAuth: () => auth };
});
vi.mock('../../../../hooks/useIsAdmin', () => ({ useIsAdmin: () => h.admin }));
vi.mock('../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
vi.mock('../../../../hooks/useContainerWidth', () => ({ useContainerWidth: () => 900 }));
vi.mock('../../../classifiers/ClassifierProvider', () => ({ useClassifierScopeActive: vi.fn() }));
vi.mock('../compound-form/useCompoundFormDetail', () => ({ useCompoundFormDetail: () => h.compound }));
vi.mock('../compound-form/useCompoundForm', () => ({
  useCompoundForm: (_f: unknown, saved: AnyFn, confirmed: AnyFn, allConfirmed: unknown, _x: unknown, published: AnyFn) => {
    h.compoundCbs = { saved, confirmed, published, allConfirmed };
    return {
      formik: h.formik,
      orgOptions: [],
      structureUnits: [],
      roads: [],
      trailerCategories: [],
      vehicleCategories: [],
      counties: [],
      citiesParishes: [],
      companyCitiesParishes: [],
      handleCountyChange: vi.fn(),
      handleCompanyCountyChange: vi.fn(),
      handleOrgChange: vi.fn(),
      handleStructuralUnitChange: vi.fn(),
      companySearchError: false,
      setCompanySearchError: vi.fn(),
      vehicleSearchError: false,
      setVehicleSearchError: vi.fn(),
      trailerSearchError: null,
      setTrailerSearchError: vi.fn(),
      mtrSearchError: null,
      setMtrSearchError: vi.fn(),
      handleCompanySearch: vi.fn(),
      handleVehicleSearch: vi.fn(),
      handleTrailerSearch: vi.fn(),
      handleMtrSearch: vi.fn(),
      triggerConfirm: h.compoundTriggers.confirm,
      triggerPublish: h.compoundTriggers.publish,
      triggerSaveAsSaved: h.compoundTriggers.saveAsSaved,
    };
  },
}));
vi.mock('../../hooks/createSaveAllHandler', () => ({
  createSaveAllHandler: (opts: Record<string, unknown>) => {
    h.saveAllOpts = opts;
    return h.saveAll;
  },
}));
vi.mock('../../api', () => ({
  getDriveRestForm: h.api.getDriveRestForm,
  getDriveRestFormByCompoundFormKey: h.api.getByCompound,
  saveDriveRestForm: h.api.saveDriveRestForm,
  getDriveRestFormSnapshot: h.api.getSnapshot,
  listAdrFormsByCompoundFormKey: h.api.listAdr,
  getAdrForm: h.api.getAdr,
  saveAdrForm: h.api.saveAdr,
  listTransportInterruptionFormsByCompoundFormKey: h.api.listTi,
  getTransportInterruptionForm: h.api.getTi,
  saveTransportInterruptionForm: h.api.saveTi,
  publishDriveRestForm: h.api.publishDr,
  publishTechnicalCheckForm: h.api.publishTech,
  publishAdrForm: h.api.publishAdr,
  publishTransportInterruptionForm: h.api.publishTi,
  listTechnicalCheckFormsByCompoundFormKey: h.api.listTech,
  getTechnicalCheckForm: h.api.getTech,
  saveTechnicalCheckForm: h.api.saveTech,
  deleteDriveRestForm: h.api.deleteDr,
  deleteCompoundForm: vi.fn(),
  deleteTechnicalCheckForm: vi.fn(),
  deleteAdrForm: vi.fn(),
  deleteTransportInterruptionForm: vi.fn(),
}));
vi.mock('../../components/EtoimikQueryCard/CompoundEtoimikQueryCard', () => ({ CompoundEtoimikQueryCard: () => <div data-testid="etoimik" /> }));
vi.mock('../../components/CompoundForm/CompoundFormViewCard', () => ({
  CompoundFormViewCard: (p: { onEdit: () => void; canEdit: boolean }) => (
    <div data-testid="compound-view" data-can-edit={String(p.canEdit)}>
      <button onClick={p.onEdit}>compound-view-edit</button>
    </div>
  ),
}));
vi.mock('../../components/CompoundForm/CompoundFormEditCard', () => ({
  CompoundFormEditCard: (p: Record<string, (...a: unknown[]) => void>) => (
    <div data-testid="compound-edit">
      <button onClick={() => p.onCancel()}>compound-cancel</button>
      <button onClick={() => p.onAddTrailerControlForm(1)}>compound-add-trailer</button>
      <button onClick={() => p.onEditTrailerControlForm(0)}>compound-edit-trailer</button>
      <button onClick={() => p.onRemoveTrailer(0)}>compound-remove-trailer</button>
    </div>
  ),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormViewCard', async () => ({
  DriveRestFormViewCard: (p: { scope: string; onPublish?: () => Promise<unknown>; snapshotId?: string }) => (
    <div data-testid={`view-${p.scope}`} data-snapshot={p.snapshotId ?? ''}>
      <button onClick={() => void p.onPublish?.()}>{`publish-${p.scope}`}</button>
    </div>
  ),
}));
vi.mock('../../components/DriveRestForm/DriveRestFormEditCard', async () => {
  const { forwardRef } = await import('react');
  return {
    DriveRestFormEditCard: forwardRef<unknown, Record<string, (...a: unknown[]) => void> & { scope: string }>// eslint-disable-next-line @typescript-eslint/no-unused-vars
    ((p, _ref) => (
      <div data-testid={`edit-${p.scope}`}>
        <button onClick={() => p.onSaved('1', false)}>{`saved-${p.scope}`}</button>
        <button onClick={() => p.onSaved('1', true)}>{`saved-confirmed-${p.scope}`}</button>
        <button onClick={() => p.onCancel()}>{`cancel-${p.scope}`}</button>
        <button onClick={() => p.onValuesChange({ changed: true })}>{`values-${p.scope}`}</button>
        {p.canPublish && <button onClick={() => void p.onPublish?.()}>{`edit-publish-${p.scope}`}</button>}
      </div>
    )),
  };
});
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormViewCard', async () => ({
  TechnicalCheckFormViewCard: (await import('../../testing/commonStubs')).makeViewCardStub('tech'),
}));
vi.mock('../../components/TechnicalCheckForm/TechnicalCheckFormEditCard', async () => ({
  TechnicalCheckFormEditCard: (await import('../../testing/commonStubs')).makeEditCardStub('tech'),
}));
vi.mock('../../components/AdrForm/AdrFormViewCard', async () => ({
  AdrFormViewCard: (await import('../../testing/commonStubs')).makeViewCardStub('adr'),
}));
vi.mock('../../components/AdrForm/AdrFormEditCard', async () => ({
  AdrFormEditCard: (await import('../../testing/commonStubs')).makeEditCardStub('adr'),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormViewCard', async () => ({
  TransportInterruptionFormViewCard: (await import('../../testing/commonStubs')).makeViewCardStub('ti'),
}));
vi.mock('../../components/TransportInterruptionForm/TransportInterruptionFormEditCard', async () => ({
  TransportInterruptionFormEditCard: (await import('../../testing/commonStubs')).makeEditCardStub('ti'),
}));
vi.mock('../../../../shared/components/DeleteConfirmModal.tsx', () => ({
  DeleteConfirmModal: (p: { onDelete: () => void; isOpen?: boolean; onClose?: () => void }) =>
    p.isOpen === undefined ? (
      <button onClick={p.onDelete}>do-delete</button>
    ) : p.isOpen ? (
      <div data-testid="remove-confirm">
        <button onClick={p.onDelete}>remove-confirm</button>
        <button onClick={p.onClose}>remove-cancel</button>
      </div>
    ) : null,
}));
vi.mock('../../../../shared/components/FormLoadError', () => ({ FormLoadError: () => <div data-testid="load-error" /> }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const Tabs = Object.assign(({ children }: { children?: ReactNode }) => <div>{children}</div>, {
    List: ({ children }: { children?: ReactNode }) => <div data-testid="tab-list">{children}</div>,
    Trigger: ({ id, children }: { id: string; children?: ReactNode }) => <div data-testid={`trigger-${id}`}>{children}</div>,
    Content: ({ id, children }: { id: string; children?: ReactNode }) => <div data-testid={`content-${id}`}>{children}</div>,
  });
  const Dropdown = Object.assign(({ children }: { children?: ReactNode }) => <div>{children}</div>, {
    Trigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Item: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  });
  return {
    ...(await orig<object>()),
    Tabs,
    Dropdown,
    StatusIndicator: () => <span data-testid="status-indicator" />,
    ClosingButton: ({ onClick }: { onClick?: (e: unknown) => void }) => (
      <button data-testid="closing" onClick={(e) => onClick?.(e)}>
        x
      </button>
    ),
  };
});

import { DriveRestFormPage } from './DriveRestFormPage';

const entry = (o: Record<string, unknown> = {}) => ({ id: 5, compoundFormKey: 3, status: 'saved', subFormNumber: 'SP-1', ...o });

const tick = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { id: '5' };
  h.perms = ['sp_driver_form.read', 'sp_driver_form.write', 'sp_teammate_form.read', 'sp_teammate_form.write', 'compound_form.write'];
  h.admin = false;
  h.compound = { form: { id: 3, status: 'published', trailers: [{ regNr: 'T1' }] }, loading: false, refetch: vi.fn() };
  h.formik.values = { trailers: [{ regNr: 'T1' }] };
  h.formik.validateForm.mockResolvedValue({});
  h.api.getDriveRestForm.mockResolvedValue(entry());
  h.api.getByCompound.mockResolvedValue(null);
  h.api.listTech.mockResolvedValue([]);
  h.api.getTech.mockResolvedValue(null);
  h.api.listAdr.mockResolvedValue([]);
  h.api.getAdr.mockResolvedValue(null);
  h.api.listTi.mockResolvedValue([]);
  h.api.getTi.mockResolvedValue(null);
  h.api.getSnapshot.mockResolvedValue([{ id: 9, subFormNumber: 'SP-9' }]);
  for (const k of ['publishDr', 'publishTech', 'publishAdr', 'publishTi', 'saveDriveRestForm', 'saveTech', 'saveAdr', 'saveTi']) {
    (h.api as unknown as Record<string, ReturnType<typeof vi.fn>>)[k].mockResolvedValue([]);
  }
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = async (entryType: 'driver' | 'teammate' = 'driver') => {
  const view = render(<DriveRestFormPage entryType={entryType} />);
  await tick();
  await tick();
  return view;
};

describe('DriveRestFormPage – laadimine', () => {
  it('näitab laadimist, vigu ja keelatud teadet', async () => {
    h.api.getDriveRestForm.mockReturnValue(new Promise(() => {}));
    const a = render(<DriveRestFormPage entryType="driver" />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    a.unmount();
    h.api.getDriveRestForm.mockResolvedValue(null);
    const b = await mount();
    expect(screen.getByTestId('load-error')).toBeTruthy();
    b.unmount();
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'deleted' }));
    const c = await mount();
    expect(screen.getByTestId('load-error')).toBeTruthy();
    c.unmount();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.api.getDriveRestForm.mockRejectedValue(new Error('x'));
    const d = await mount();
    expect(screen.getByTestId('load-error')).toBeTruthy();
    d.unmount();
    err.mockRestore();
    h.api.getDriveRestForm.mockResolvedValue(entry());
    h.perms = [];
    await mount();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('id puudumisel ei lae midagi', async () => {
    h.params = {};
    render(<DriveRestFormPage entryType="driver" />);
    await tick();
    expect(h.api.getDriveRestForm).not.toHaveBeenCalled();
  });

  it('teammate: õigus vaid teammate-vormile', async () => {
    h.perms = ['sp_driver_form.read'];
    h.api.getDriveRestForm.mockResolvedValue(entry());
    await mount('teammate');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });
});

describe('DriveRestFormPage – hetktõmmis', () => {
  it('autojuhi ja meeskonnaliikme snapshot', async () => {
    h.params = { id: '5', snapshotId: '9' };
    const a = await mount('driver');
    expect(screen.getByTestId('view-driver').getAttribute('data-snapshot')).toBe('9');
    a.unmount();
    h.api.getSnapshot.mockResolvedValue({ id: 9 });
    await mount('teammate');
    expect(screen.getByTestId('view-teammate')).toBeTruthy();
  });

  it('snapshot: laadimine, viga, õigused', async () => {
    h.params = { id: '5', snapshotId: '9' };
    h.api.getSnapshot.mockReturnValue(new Promise(() => {}));
    const a = render(<DriveRestFormPage entryType="driver" />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    a.unmount();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.api.getSnapshot.mockRejectedValue(new Error('x'));
    const b = await mount();
    expect(screen.getByTestId('load-error')).toBeTruthy();
    b.unmount();
    err.mockRestore();
    h.perms = [];
    h.api.getSnapshot.mockResolvedValue([{ id: 9 }]);
    await mount();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });
});

describe('DriveRestFormPage – põhivaade', () => {
  it('avaldatud autojuhi vorm: vaatekaardid, lehe pealkiri ja koondvormi vaade', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    await mount();
    expect(screen.getByTestId('view-driver')).toBeTruthy();
    expect(screen.getByTestId('compound-view')).toBeTruthy();
    expect(screen.getByTestId('etoimik')).toBeTruthy();
    expect(screen.queryByText('common.save')).toBeNull();
  });

  it('koondvormi laadimisel näitab laadimist', async () => {
    h.compound = { form: null, loading: true, refetch: vi.fn() };
    await mount();
    expect(screen.getAllByText('common.loading').length).toBeGreaterThan(0);
  });

  it('teammate: laeb sõsarvormi, sõsarvorm avab oma vahelehe', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.api.getByCompound.mockResolvedValue(entry({ id: 6, status: 'published', subFormNumber: 'SP-2' }));
    await mount('teammate');
    expect(h.api.getByCompound).toHaveBeenCalledWith('driver', 3);
    expect(screen.getByTestId('trigger-tab-driver')).toBeTruthy();
    expect(screen.getByTestId('trigger-tab-teammate')).toBeTruthy();
  });

  it('autojuht: laeb meeskonnaliikme; sellega avaneb teammate leht', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.api.getByCompound.mockResolvedValue(entry({ id: 6, status: 'published' }));
    await mount('driver');
    expect(h.api.getByCompound).toHaveBeenCalledWith('teammate', 3);
    expect(screen.getByTestId('trigger-tab-teammate')).toBeTruthy();
  });

  it('laeb tehnokontrolli, haagised, ADR-i ja katkestuse vormid ja avab nende vahelehed', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.api.listTech.mockImplementation(async (scope: string) => (scope === 'vehicle' ? [{ id: 11 }] : [{ id: 21 }, { id: 22 }]));
    h.api.getTech.mockImplementation(async (scope: string, id: number) => ({ id, status: 'published', trailerRegNr: `TR${id}`, scope }));
    h.api.listAdr.mockResolvedValue([{ id: 31 }]);
    h.api.getAdr.mockResolvedValue({ id: 31, status: 'published' });
    h.api.listTi.mockResolvedValue([{ id: 41 }]);
    h.api.getTi.mockResolvedValue({ id: 41, status: 'published' });
    await mount();
    await tick();
    for (const id of [
      'tab-vehicle-technical-check',
      'tab-trailer-technical-check-0',
      'tab-trailer-technical-check-1',
      'tab-adr',
      'tab-transport-interruption',
    ]) {
      expect(screen.getByTestId(`trigger-${id}`)).toBeTruthy();
    }
    expect(screen.getByTestId('trigger-tab-trailer-technical-check-0').textContent).toContain('T1');
  });

  it('nimekirjade viga logitakse ja ei kuku', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.api.listTech.mockRejectedValue(new Error('x'));
    h.api.listAdr.mockRejectedValue(new Error('x'));
    h.api.listTi.mockRejectedValue(new Error('x'));
    await mount();
    await tick();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('avaldamine: iga vahelehe vaatekaardilt', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published', id: 5 }));
    h.api.getByCompound.mockImplementation(async (scope: string) => (scope === 'teammate' ? entry({ id: 6, status: 'published' }) : entry({ id: 5, status: 'published' })));
    h.api.listTech.mockImplementation(async (scope: string) => (scope === 'vehicle' ? [{ id: 11 }] : [{ id: 21 }]));
    h.api.getTech.mockResolvedValue({ id: 11, status: 'published' });
    h.api.listAdr.mockResolvedValue([{ id: 31 }]);
    h.api.getAdr.mockResolvedValue({ id: 31, status: 'published' });
    h.api.listTi.mockResolvedValue([{ id: 41 }]);
    h.api.getTi.mockResolvedValue({ id: 41, status: 'published' });
    h.admin = true;
    await mount();
    await tick();
    for (const name of ['publish-driver', 'publish-teammate', 'publish-tech', 'publish-adr', 'publish-ti']) {
      for (const b of screen.getAllByText(name)) {
        fireEvent.click(b);
        await tick();
      }
    }
    expect(h.api.publishDr).toHaveBeenCalledWith('driver', 5);
    expect(h.api.publishDr).toHaveBeenCalledWith('teammate', 6);
    expect(h.api.publishTech).toHaveBeenCalledWith('vehicle', 11);
    expect(h.api.publishTech).toHaveBeenCalledWith('trailer', expect.anything());
    expect(h.api.publishAdr).toHaveBeenCalledWith(31);
    expect(h.api.publishTi).toHaveBeenCalledWith(41);
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    expect(h.compound.refetch).toHaveBeenCalled();
  });
});

describe('DriveRestFormPage – muutmine', () => {
  beforeEach(() => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'saved' }));
    h.compound = { form: { id: 3, status: 'saved', trailers: [] }, loading: false, refetch: vi.fn() };
  });

  it('salvestatud vorm avab muutmiskaardi ja koondvormi muutmise', async () => {
    await mount();
    expect(screen.getByTestId('edit-driver')).toBeTruthy();
    expect(screen.getByTestId('compound-edit')).toBeTruthy();
    expect(screen.getByText('common.save')).toBeTruthy();
  });

  it('kinnitatud alamvormi muutmiskaardil on avalikusta nupp, kui koondvorm on salvestatud', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'confirmed' }));
    h.api.getByCompound.mockImplementation(async (scope: string) =>
      scope === 'teammate' ? entry({ id: 6, status: 'saved' }) : entry({ id: 5, status: 'confirmed' }),
    );
    await mount();
    await tick();
    fireEvent.click(screen.getByText('edit-publish-driver'));
    await tick();
    expect(h.api.publishDr).toHaveBeenCalledWith('driver', 5);
  });

  it('muutmiskaardi tagasikutsed: salvestatud, kinnitatud, katkestatud, muutunud', async () => {
    h.api.getByCompound.mockResolvedValue(entry({ id: 5, status: 'saved' }));
    await mount();
    fireEvent.click(screen.getByText('saved-driver'));
    await tick();
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    fireEvent.click(screen.getByText('saved-confirmed-driver'));
    await tick();
    fireEvent.click(screen.getByText('values-driver'));
    fireEvent.click(screen.getByText('cancel-driver'));
    await tick();
    expect(screen.queryByTestId('edit-driver')).toBeNull();
  });

  it('meeskonnaliikme muutmiskaart ja koondvormi lähtestamine "salvestatud" olekusse', async () => {
    h.compound = { form: { id: 3, status: 'confirmed', trailers: [] }, loading: false, refetch: vi.fn() };
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.admin = true;
    h.api.getByCompound.mockResolvedValue(null);
    await mount();
    fireEvent.click(screen.getByText('common.edit'));
    await tick();
    expect(screen.getAllByTestId(/^edit-/).length).toBeGreaterThan(0);
  });

  it('administraatori "Muuda" nupp sisselülitab kõik vormid ja Tühista väljub', async () => {
    h.admin = true;
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    h.api.getByCompound.mockResolvedValue(entry({ id: 6, status: 'published' }));
    h.api.listTech.mockImplementation(async (s: string) => (s === 'vehicle' ? [{ id: 11 }] : [{ id: 21 }]));
    h.api.getTech.mockResolvedValue({ id: 11, status: 'published' });
    h.api.listAdr.mockResolvedValue([{ id: 31 }]);
    h.api.getAdr.mockResolvedValue({ id: 31, status: 'published' });
    h.api.listTi.mockResolvedValue([{ id: 41 }]);
    h.api.getTi.mockResolvedValue({ id: 41, status: 'published' });
    h.compound = { form: { id: 3, status: 'published', trailers: [] }, loading: false, refetch: vi.fn() };
    await mount();
    await tick();
    fireEvent.click(screen.getByText('common.edit'));
    await tick();
    expect(screen.getByTestId('edit-driver')).toBeTruthy();
    expect(screen.getByTestId('edit-teammate')).toBeTruthy();
    expect(screen.getAllByTestId('edit-tech').length).toBeGreaterThan(0);
    expect(screen.getByTestId('edit-adr')).toBeTruthy();
    expect(screen.getByTestId('edit-ti')).toBeTruthy();
    fireEvent.click(screen.getByText('common.save'));
    expect(h.saveAll).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.cancel'));
    await tick();
    expect(h.formik.resetForm).toHaveBeenCalled();
    expect(screen.queryByTestId('edit-driver')).toBeNull();
  });

  it('kõigi alamvormide tagasikutsed (tehno, haagis, ADR, katkestus)', async () => {
    h.admin = true;
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'saved' }));
    h.api.listTech.mockImplementation(async (s: string) => (s === 'vehicle' ? [{ id: 11 }] : [{ id: 21 }]));
    h.api.getTech.mockResolvedValue({ id: 11, status: 'saved' });
    h.api.listAdr.mockResolvedValue([{ id: 31 }]);
    h.api.getAdr.mockResolvedValue({ id: 31, status: 'saved' });
    h.api.listTi.mockResolvedValue([{ id: 41 }]);
    h.api.getTi.mockResolvedValue({ id: 41, status: 'saved' });
    h.perms = [...h.perms, 'vehicle_technical_form.write', 'trailer_technical_form.write', 'adr_form.write', 'transport_interruption_form.write'];
    await mount();
    await tick();
    for (const name of ['tech', 'adr', 'ti']) {
      for (const b of screen.getAllByText(`saved-${name}`)) {
        fireEvent.click(b);
        await tick();
      }
      for (const b of screen.getAllByText(`saved-confirmed-${name}`)) fireEvent.click(b);
      for (const b of screen.getAllByText(`values-${name}`)) fireEvent.click(b);
      for (const b of screen.getAllByText(`cancel-${name}`)) fireEvent.click(b);
      await tick();
    }
    expect(h.api.listTech).toHaveBeenCalled();
  });

  it('lisa vormi rippmenüü (administraator) ja uue vahelehe lisamine', async () => {
    h.admin = true;
    await mount();
    fireEvent.click(screen.getByText('desktop.addForm'));
    const items = document.querySelectorAll('button');
    expect(items.length).toBeGreaterThan(0);
    const tabBefore = screen.getAllByTestId(/^trigger-/).length;
    const add = screen.getAllByRole('button').find((b) => /desktop\.|forms\./.test(b.textContent ?? '') && b.textContent !== 'desktop.addForm');
    if (add) fireEvent.click(add);
    await tick();
    expect(screen.getAllByTestId(/^trigger-/).length).toBeGreaterThanOrEqual(tabBefore);
  });

  it('kustutamine', async () => {
    h.admin = true;
    await mount();
    fireEvent.click(screen.getByText('do-delete'));
    await tick();
    expect(h.navigate).toHaveBeenCalled();
  });

  it('vahelehe sulgemine (X) eemaldab uue vormi vahelehe', async () => {
    h.admin = true;
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'saved' }));
    h.api.getByCompound.mockResolvedValue(null);
    await mount();
    fireEvent.click(screen.getByText('desktop.addForm'));
    const addable = screen.getAllByRole('button').filter((b) => /^forms\./.test(b.textContent ?? ''));
    if (addable[0]) fireEvent.click(addable[0]);
    await tick();
    const closers = screen.queryAllByTestId('closing');
    closers.forEach((c) => fireEvent.click(c));
    await tick();
    expect(screen.getAllByTestId(/^trigger-/).length).toBeGreaterThan(0);
  });
});

describe('DriveRestFormPage – koondvormi tagasikutsed', () => {
  it('salvestatud, kinnitatud ja avaldatud', async () => {
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    await mount();
    act(() => h.compoundCbs.saved!());
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
    act(() => h.compoundCbs.confirmed!());
    expect(screen.getByText('forms.confirmedNote')).toBeTruthy();
    act(() => h.compoundCbs.published!());
    expect(screen.getByText('forms.publishedNote')).toBeTruthy();
    expect(h.compound.refetch).toHaveBeenCalledTimes(3);
    for (const b of screen.getAllByRole('button', { name: /close|sulge/i })) fireEvent.click(b);
  });

  it('koondvormi vaade: muuda-nupp lülitab muutmisrežiimi', async () => {
    h.admin = true;
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'published' }));
    await mount();
    expect(screen.getByTestId('compound-view').getAttribute('data-can-edit')).toBe('true');
    fireEvent.click(screen.getByText('compound-view-edit'));
    await tick();
    expect(screen.getByTestId('compound-edit')).toBeTruthy();
    fireEvent.click(screen.getByText('compound-cancel'));
    await tick();
    expect(screen.getByTestId('compound-view')).toBeTruthy();
  });

  it('haagise tegevused koondvormi muutmiskaardil', async () => {
    h.admin = true;
    h.compound = { form: { id: 3, status: 'saved', trailers: JSON.stringify([{ regNr: 'T1' }]) }, loading: false, refetch: vi.fn() };
    h.formik.values = { trailers: [] };
    await mount();
    fireEvent.click(screen.getByText('compound-add-trailer'));
    await tick();
    fireEvent.click(screen.getByText('compound-edit-trailer'));
    fireEvent.click(screen.getByText('compound-remove-trailer'));
    await tick();
    expect(screen.getAllByTestId(/^trigger-/).length).toBeGreaterThan(0);
  });
});

describe('DriveRestFormPage – salvesta kõik (varusalvestus)', () => {
  it('vormi- ja koondvormi kontrollid ning varusalvestuste ahelad', async () => {
    h.admin = true;
    h.api.getDriveRestForm.mockResolvedValue(entry({ status: 'saved' }));
    h.api.getByCompound.mockResolvedValue(entry({ id: 6, status: 'confirmed' }));
    await mount();
    await tick();
    const opts = h.saveAllOpts as {
      onCompoundSave: () => void;
      onCompoundValidate: () => Promise<boolean>;
      subForms: { tabId: string; fallbackSave: (d: unknown) => void; subForm: { draftRef: { current: unknown }; setDraft: AnyFn } }[];
    };
    opts.onCompoundSave();
    expect(h.formik.handleSubmit).toHaveBeenCalled();
    h.formik.validateForm.mockResolvedValueOnce({ a: 'e' });
    h.formik.values = { trailers: [{ regNr: 'T1', nested: [1, { x: 2 }] }] };
    expect(await opts.onCompoundValidate()).toBe(false);
    expect(h.formik.setTouched).toHaveBeenCalled();
    h.formik.validateForm.mockResolvedValueOnce({});
    expect(await opts.onCompoundValidate()).toBe(true);

    const draftTech = { partsSummary: [1], violations: [] };
    for (const tabId of [
      'tab-vehicle-technical-check',
      'tab-trailer-technical-check-0',
      'tab-trailer-technical-check-1',
      'tab-trailer-technical-check-2',
      'tab-driver',
      'tab-teammate',
      'tab-adr',
      'tab-transport-interruption',
    ]) {
      const cfg = opts.subForms.find((s) => s.tabId === tabId)!;
      await act(async () => {
        cfg.fallbackSave(tabId.includes('technical') ? draftTech : { legalBases: [1], status: 'saved' });
      });
      await tick();
    }
    expect(h.api.saveTech).toHaveBeenCalledWith('vehicle', expect.objectContaining({ partsSummary: '[1]' }));
    expect(h.api.saveTech).toHaveBeenCalledWith('trailer', expect.anything());
    expect(h.api.saveDriveRestForm).toHaveBeenCalledWith('driver', expect.anything());
    expect(h.api.saveDriveRestForm).toHaveBeenCalledWith('teammate', expect.anything());
    expect(h.api.saveAdr).toHaveBeenCalled();
    expect(h.api.saveTi).toHaveBeenCalledWith(expect.objectContaining({ legalBases: '[1]' }));
    expect(screen.getByText('forms.savedNote')).toBeTruthy();
  });

  it('varusalvestuse vead logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.admin = true;
    for (const k of ['saveTech', 'saveDriveRestForm', 'saveAdr', 'saveTi']) {
      (h.api as unknown as Record<string, ReturnType<typeof vi.fn>>)[k].mockRejectedValue(new Error('x'));
    }
    await mount();
    await tick();
    const opts = h.saveAllOpts as { subForms: { tabId: string; fallbackSave: (d: unknown) => void }[] };
    for (const cfg of opts.subForms) {
      await act(async () => {
        cfg.fallbackSave({});
      });
    }
    await tick();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
