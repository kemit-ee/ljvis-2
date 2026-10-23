/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components */
// Jagatud testivahendid alamvormi lehtede (ADR, tehniline kontroll, veo katkestamine)
// testidele. Neid lehti ühendab sama koondvormi-/alamvormitabide raam; kaardid, päringud
// ja koondvormi hookid asendatakse siin lihtsate varjudega, mille nuppudest saab kutsuda
// iga kaardile antud tagasikutse.
import { createContext, forwardRef, useContext, type ReactNode } from 'react';
import { vi } from 'vitest';

export const h = {
  params: {} as Record<string, string | undefined>,
  locationState: null as unknown,
  perms: new Set<string>(),
  isAdmin: false,
  navigate: vi.fn(),
  compoundArgs: [] as any[],
  compoundDetail: { form: null as any, loading: false, refetch: vi.fn() },
  compoundHook: {} as Record<string, any>,
  formik: {} as Record<string, any>,
  saveCfg: undefined as any,
  handleSaveAll: vi.fn(),
  removeArgs: undefined as any,
  edit: {} as Record<string, any>,
};

export function resetHarness() {
  h.params = {};
  h.locationState = null;
  h.perms = new Set();
  h.isAdmin = false;
  h.navigate = vi.fn();
  h.compoundArgs = [];
  h.compoundDetail = { form: null, loading: false, refetch: vi.fn() };
  h.formik = {
    values: { trailers: [] },
    resetForm: vi.fn(),
    handleSubmit: vi.fn(),
    validateForm: vi.fn().mockResolvedValue({}),
    setTouched: vi.fn(),
    setFieldValue: vi.fn(),
  };
  const fns = () => vi.fn();
  h.compoundHook = {
    formik: h.formik,
    orgOptions: [],
    structureUnits: [],
    roads: [],
    trailerCategories: [],
    vehicleCategories: [],
    counties: [],
    citiesParishes: [],
    companyCitiesParishes: [],
    handleCountyChange: fns(),
    handleCompanyCountyChange: fns(),
    handleOrgChange: fns(),
    handleStructuralUnitChange: fns(),
    companySearchError: null,
    setCompanySearchError: fns(),
    vehicleSearchError: null,
    setVehicleSearchError: fns(),
    trailerSearchError: null,
    setTrailerSearchError: fns(),
    mtrSearchError: null,
    setMtrSearchError: fns(),
    handleCompanySearch: fns(),
    handleVehicleSearch: fns(),
    handleTrailerSearch: fns(),
    handleMtrSearch: fns(),
    triggerConfirm: fns(),
    triggerPublish: fns(),
    triggerSaveAsSaved: fns(),
  };
  h.saveCfg = undefined;
  h.handleSaveAll = vi.fn().mockResolvedValue(undefined);
  h.removeArgs = undefined;
  h.edit = {
    handleSubformEditActive: vi.fn(),
    canPublish: true,
    canConfirm: true,
    allConfirmedOrPublished: false,
    removeConfirmTab: null as string | null,
    removeTrailerFromCompound: false,
    handleRemove: vi.fn(),
    handleRemoveTrailerFromCompound: vi.fn(),
    handleRemoveConfirmed: vi.fn(),
    handleRemoveCancel: vi.fn(),
    handleDelete: vi.fn(),
    checkAndAutoConfirm: vi.fn(),
    checkAndAutoPublish: vi.fn(),
    addTab: vi.fn((tabId: string, a: any) => {
      a.setOpenTabs((p: string[]) => (p.includes(tabId) ? p : [...p, tabId]));
      if (a.activate) a.setActiveTab(tabId);
    }),
    cancelAllEdits: vi.fn(),
  };
}
resetHarness();

// ---- moodulite varjud (kasutamiseks vi.mock fabrikates) ----

export const routerMock = () => ({
  useParams: () => h.params,
  useNavigate: () => h.navigate,
  useLocation: () => ({ state: h.locationState }),
});

export const authMock = () => ({
  useAuth: () => ({ hasPermission: (p: string) => h.perms.has(p), user: {} }),
});

export const isAdminMock = () => ({ useIsAdmin: () => h.isAdmin });
export const mediaQueryMock = () => ({ useMediaQuery: () => true });
export const containerWidthMock = () => ({ useContainerWidth: () => 800 });

export const compoundFormMock = () => ({
  useCompoundForm: (...args: any[]) => {
    h.compoundArgs = args;
    return h.compoundHook;
  },
});
export const compoundDetailMock = () => ({
  useCompoundFormDetail: () => h.compoundDetail,
});

export const saveAllMock = () => ({
  createSaveAllHandler: (cfg: any) => {
    h.saveCfg = cfg;
    return h.handleSaveAll;
  },
});

export const editActiveMock = () => ({
  useSubFormEditActive: () => h.edit.handleSubformEditActive,
  makeCheckAndAutoConfirm: () => h.edit.checkAndAutoConfirm,
  makeCheckAndAutoPublish: () => h.edit.checkAndAutoPublish,
  useSubFormPermissions: () => ({
    canPublish: () => h.edit.canPublish,
    canConfirm: () => h.edit.canConfirm,
  }),
  subFormsAllConfirmedOrPublished: () => ({
    subFormsAllConfirmedOrPublished: h.edit.allConfirmedOrPublished,
  }),
  addTab: (...args: any[]) => h.edit.addTab(...args),
  useDeleteAllSubForms: () => h.edit.handleDelete,
  useRemoveSubFormTab: (args: any) => {
    h.removeArgs = args;
    return {
      removeConfirmTab: h.edit.removeConfirmTab,
      handleRemove: h.edit.handleRemove,
      handleRemoveTrailerFromCompound: h.edit.handleRemoveTrailerFromCompound,
      handleRemoveConfirmed: h.edit.handleRemoveConfirmed,
      handleRemoveCancel: h.edit.handleRemoveCancel,
      removeTrailerFromCompound: h.edit.removeTrailerFromCompound,
    };
  },
  cancelAllEdits: (...args: any[]) => h.edit.cancelAllEdits(...args),
});

export const classifierScopeMock = () => ({ useClassifierScopeActive: () => {} });

export const schemaMocks = {
  driveRest: () => ({
    serializeDriveRestFormValues: (v: any, status: string) => ({ ...v, status }),
    createDriveRestValidationSchema: () => ({ isValid: async () => true }),
  }),
  technical: () => ({
    createTechnicalCheckValidationSchema: () => ({ isValid: async () => true }),
  }),
  adr: () => ({
    createAdrValidationSchema: () => ({ isValid: async () => true }),
    serializeAdrFormPayload: (v: any) => ({ ...v, serialized: true }),
  }),
};

export const formNotFoundMock = () => ({
  FormNotFoundView: ({ title }: { title: string }) => <div>not-found:{title}</div>,
});
export const formLoadErrorMock = () => ({ FormLoadError: () => <div>load-error</div> });

// ---- kaardivarjud ----

const CALLBACK_ARGS: Record<string, unknown[]> = {
  onSaved: ['1', false],
  onValuesChange: [{ touched: 1 }],
  onDelete: [],
  onPublish: [],
  onCancel: [],
  onConfirm: [],
  onEdit: [],
};

export function cardStub(name: string) {
  const Stub = forwardRef<unknown, Record<string, any>>((props, ref) => (
    <div data-testid={name} data-draft={props.form ? 'form' : 'none'} data-ref={ref ? 'ref' : ''}>
      {Object.entries(props)
        .filter(([, v]) => typeof v === 'function')
        .flatMap(([key, fn]) => {
          const call = (extra?: unknown[]) => {
            Promise.resolve((fn as (...a: unknown[]) => unknown)(...(extra ?? CALLBACK_ARGS[key] ?? [0]))).catch(
              () => {},
            );
          };
          const buttons = [
            <button key={key} type="button" onClick={() => call()}>
              {`${name}.${key}`}
            </button>,
          ];
          if (key === 'onSaved') {
            buttons.push(
              <button key={`${key}-confirmed`} type="button" onClick={() => call(['1', true])}>
                {`${name}.onSaved.confirmed`}
              </button>,
            );
          }
          return buttons;
        })}
    </div>
  ));
  Stub.displayName = name;
  return Stub;
}

export const modalStub = () => ({
  DeleteConfirmModal: (props: Record<string, any>) => (
    <div data-testid="delete-modal">
      {Object.entries(props)
        .filter(([, v]) => typeof v === 'function')
        .map(([key, fn]) => (
          <button key={key} type="button" onClick={() => (fn as () => void)()}>
            {`DeleteConfirmModal.${key}${props.isOpen === undefined ? '.page' : ''}`}
          </button>
        ))}
    </div>
  ),
});

export const etoimikStub = () => ({
  CompoundEtoimikQueryCard: () => <div data-testid="etoimik" />,
});

// ---- TEDI Tabs/Dropdown lihtsustatud variandid: kogu sisu on alati DOM-is ----

const TabsCtx = createContext<(id: string) => void>(() => {});

function StubTabs({ children, onChange }: { children: ReactNode; onChange: (id: string) => void }) {
  return (
    <TabsCtx.Provider value={onChange}>
      <div>{children}</div>
    </TabsCtx.Provider>
  );
}
function StubTabsList({ children }: { children: ReactNode }) {
  return <div role="tablist">{children}</div>;
}
function StubTabsTrigger({ id, children }: { id: string; children: ReactNode }) {
  const onChange = useContext(TabsCtx);
  return (
    <div role="tab" data-tab={id} onClick={() => onChange(id)}>
      {children}
    </div>
  );
}
function StubTabsContent({ id, children }: { id: string; children: ReactNode }) {
  return <section data-content={id}>{children}</section>;
}
function StubDropdown({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
function StubDropdownItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export const tediOverrides = () => ({
  Tabs: Object.assign(StubTabs, { List: StubTabsList, Trigger: StubTabsTrigger, Content: StubTabsContent }),
  Dropdown: Object.assign(StubDropdown, {
    Trigger: StubDropdown,
    Content: StubDropdown,
    Item: StubDropdownItem,
  }),
});

// ---- API ----

const API_NAMES = [
  'getTransportInterruptionForm',
  'getTransportInterruptionFormSnapshot',
  'saveTransportInterruptionForm',
  'listTransportInterruptionFormsByCompoundFormKey',
  'publishTransportInterruptionForm',
  'getDriveRestFormByCompoundFormKey',
  'saveDriveRestForm',
  'publishDriveRestForm',
  'listTechnicalCheckFormsByCompoundFormKey',
  'getTechnicalCheckForm',
  'getTechnicalCheckFormSnapshot',
  'saveTechnicalCheckForm',
  'publishTechnicalCheckForm',
  'listAdrFormsByCompoundFormKey',
  'getAdrForm',
  'getAdrFormSnapshot',
  'saveAdrForm',
  'publishAdrForm',
] as const;

export const api: Record<(typeof API_NAMES)[number], ReturnType<typeof vi.fn>> = Object.fromEntries(
  API_NAMES.map((n) => [n, vi.fn()]),
) as any;

export const apiMock = () => api;

export interface ApiData {
  vehicle?: any;
  trailers?: any[];
  driver?: any;
  teammate?: any;
  adr?: any;
  ti?: any;
}

/** Seadistab API vastused: iga alamvorm on kas objekt või puudub (null). */
export function applyApiData(data: ApiData = {}) {
  Object.values(api).forEach((fn) => fn.mockReset());
  const trailers = data.trailers ?? [];
  const techById = (id: string) =>
    [data.vehicle, ...trailers].find((f) => f && String(f.id) === String(id)) ?? null;
  api.listTechnicalCheckFormsByCompoundFormKey.mockImplementation(async (scope: string) =>
    scope === 'vehicle'
      ? data.vehicle ? [{ id: data.vehicle.id }] : []
      : trailers.map((t) => ({ id: t.id })),
  );
  api.getTechnicalCheckForm.mockImplementation(async (_scope: string, id: string) => techById(id));
  api.getTechnicalCheckFormSnapshot.mockResolvedValue(null);
  api.getDriveRestFormByCompoundFormKey.mockImplementation(async (scope: 'driver' | 'teammate') => data[scope] ?? null);
  api.listAdrFormsByCompoundFormKey.mockImplementation(async () => (data.adr ? [{ id: data.adr.id }] : []));
  api.getAdrForm.mockImplementation(async (id: string) =>
    data.adr && String(data.adr.id) === String(id) ? data.adr : null,
  );
  api.getAdrFormSnapshot.mockResolvedValue(null);
  api.listTransportInterruptionFormsByCompoundFormKey.mockImplementation(async () =>
    data.ti ? [{ id: data.ti.id }] : [],
  );
  api.getTransportInterruptionForm.mockImplementation(async (id: string) =>
    data.ti && String(data.ti.id) === String(id) ? data.ti : null,
  );
  api.getTransportInterruptionFormSnapshot.mockResolvedValue(null);
  for (const n of [
    'saveTransportInterruptionForm',
    'publishTransportInterruptionForm',
    'saveDriveRestForm',
    'publishDriveRestForm',
    'saveTechnicalCheckForm',
    'publishTechnicalCheckForm',
    'saveAdrForm',
    'publishAdrForm',
  ] as const) {
    api[n].mockResolvedValue(undefined);
  }
}

/** Tagasikutsete klikkimine: kõik nupud, mille tekst algab prefiksiga. */
export function labelsStartingWith(root: HTMLElement | Document, prefix: string): string[] {
  return Array.from(root.querySelectorAll('button'))
    .map((b) => b.textContent ?? '')
    .filter((t) => t.startsWith(prefix));
}

/** Klikib kõiki nuppe, mille tekst algab prefiksiga; "onCancel" viimasena, sest see eemaldab kaardi. */
export function clickableButtons(root: ParentNode, prefixes: string[]): HTMLButtonElement[] {
  const all = Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];
  const matched = all.filter((b) => prefixes.some((p) => (b.textContent ?? '').startsWith(p)));
  const rank = (b: HTMLButtonElement) => ((b.textContent ?? '').endsWith('.onCancel') ? 1 : 0);
  return matched.sort((a, b) => rank(a) - rank(b));
}

/** TEDI Select asendus natiivse <select>-iga (react-select jsdom-is ebamugav); "clear-<id>" nupp annab onChange(null). */
export const tediSelectOverride = () => ({
  Select: (p: any) => (
    <div>
      <select
        id={p.id}
        disabled={p.disabled}
        value={p.value?.value ?? ''}
        onChange={(e) => p.onChange(p.options.find((o: any) => o.value === e.target.value) ?? null)}
      >
        {!p.options.some((o: any) => o.value === '') && <option value="" />}
        {p.options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="button" data-testid={`clear-${p.id}`} onClick={() => p.onChange(null)} />
      {p.helper?.text && <span>{p.helper.text}</span>}
    </div>
  ),
});
