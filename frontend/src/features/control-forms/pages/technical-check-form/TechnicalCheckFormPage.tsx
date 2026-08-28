import { useEffect, useState, useRef } from 'react';
import { useContainerWidth } from '../../../../hooks/useContainerWidth';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert, Tabs, Dropdown, ClosingButton, StatusIndicator } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import type { TechnicalCheckVariant, TechnicalCheckForm, DriveRestForm, AdrForm, TransportInterruptionForm, TransportInterruptionFormListItem, Driver, Trailer } from '../../types';
import {
  getTechnicalCheckForm,
  getTechnicalCheckFormSnapshot,
  listTechnicalCheckFormsByCompoundFormKey,
  getDriveRestFormByCompoundFormKey,
  saveDriveRestForm,
  saveTechnicalCheckForm,
  listAdrFormsByCompoundFormKey,
  getAdrForm,
  saveAdrForm,
  listTransportInterruptionFormsByCompoundFormKey,
  getTransportInterruptionForm,
  saveTransportInterruptionForm,
  publishTechnicalCheckForm,
  publishDriveRestForm,
  publishAdrForm,
  publishTransportInterruptionForm,
} from '../../api';
import { useCompoundForm } from '../compound-form/useCompoundForm';
import { useCompoundFormDetail } from '../compound-form/useCompoundFormDetail';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE, ALL_FORM_TABS } from '../../../../constants/constants';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { EtoimikQueryCard } from '../../components/EtoimikQueryCard/EtoimikQueryCard';
import { TechnicalCheckFormViewCard } from '../../components/TechnicalCheckForm/TechnicalCheckFormViewCard';
import { TechnicalCheckFormEditCard, type TechnicalCheckFormEditCardRef } from '../../components/TechnicalCheckForm/TechnicalCheckFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard.tsx';
import { DriveRestFormEditCard, type DriveRestFormEditCardRef } from '../../components/DriveRestForm/DriveRestFormEditCard.tsx';
import { AdrFormViewCard } from '../../components/AdrForm/AdrFormViewCard';
import { AdrFormEditCard, type AdrFormEditCardRef } from '../../components/AdrForm/AdrFormEditCard';
import { TransportInterruptionFormViewCard } from '../../components/TransportInterruptionForm/TransportInterruptionFormViewCard';
import { TransportInterruptionFormEditCard, type TransportInterruptionFormEditCardRef } from '../../components/TransportInterruptionForm/TransportInterruptionFormEditCard';
import { useSubForm, type SubFormHandle } from '../../hooks/useSubForm';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { createDriveRestValidationSchema, serializeDriveRestFormValues } from '../drive-rest-form/useDriveRestForm';
import { createTechnicalCheckValidationSchema } from './useTechnicalCheckForm';
import { createSaveAllHandler } from '../../hooks/createSaveAllHandler';
import { createAdrValidationSchema } from '../adr-form/useAdrForm';
import { useSubFormEditActive, makeCheckAndAutoConfirm, makeCheckAndAutoPublish, useSubFormPermissions, subFormsAllConfirmedOrPublished as getSubFormsStatus, addTab, useDeleteAllSubForms, useRemoveSubFormTab, cancelAllEdits } from '../../hooks/useSubFormEditActive';

interface TechnicalCheckFormPageProps {
  variant: TechnicalCheckVariant;
}

export function TechnicalCheckFormPage({ variant }: TechnicalCheckFormPageProps) {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isAdmin = useIsAdmin();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const tabId = variant === 'vehicle' ? 'tab-vehicle-technical-check' : 'tab-trailer-technical-check-0';
  const titleKey = variant === 'vehicle' ? 'forms.technical_check.vehicleTitle' : 'forms.technical_check.trailerTitle';
  const formType = variant === 'vehicle' ? FORM_TYPE.VEHICLE_TECHNICAL_CHECK : FORM_TYPE.TRAILER_TECHNICAL_CHECK;

  const forbidden = !(
    ((formType == FORM_TYPE.VEHICLE_TECHNICAL_CHECK &&
      hasPermission('vehicle_technical_form.read')) ||
      (formType == FORM_TYPE.TRAILER_TECHNICAL_CHECK &&
        hasPermission('trailer_technical_form.read')) ||
      hasPermission('control_form.view_unpublished')) &&
    hasPermission('classifier.read')
  );

  const [compoundFormKey, setCompoundFormKey] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const isFetching = useRef(false);

  const [snapshot, setSnapshot] = useState<TechnicalCheckForm | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  const [activeTab, setActiveTab] = useState(variant === 'vehicle' ? tabId : '');
  const [compoundEditActive, setCompoundEditActive] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [compoundVersionsRefreshKey, setCompoundVersionsRefreshKey] = useState(0);
  const [openTabs, setOpenTabs] = useState<string[]>(variant === 'vehicle' ? [tabId] : []);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const hasTabErrors = (tid: string) => validatedTabs.has(tid) && (tabErrors[tid] ?? false);

  const vehicle = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'vehicle_technical_form' });
  const trailer0 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailer1 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailer2 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailers = [trailer0, trailer1, trailer2];
  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_driver_form' });
  const teammate = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({
    permPrefix: 'sp_teammate_form',
  });
  const adr = useSubForm<AdrForm, AdrFormEditCardRef>({ permPrefix: 'adr_form' });
  const transportInterruption = useSubForm<TransportInterruptionForm, TransportInterruptionFormEditCardRef>({ permPrefix: 'transport_interruption_form' });

  const handleSubformEditActive = useSubFormEditActive({ driver, teammate, vehicle, trailers, adr, transportInterruption, hasPermission });

  const containerWidth = useContainerWidth(isDesktop, openTabs);

  useEffect(() => {
    if (!snapshotId || !id) return;
    getTechnicalCheckFormSnapshot(variant, snapshotId, id)
      .then((res) => { setSnapshot(Array.isArray(res) ? res[0] : res); setSnapshotLoading(false); })
      .catch(() => setSnapshotLoading(false));
  }, [snapshotId, id, variant]);

  // Load the current variant's form to discover compound form key
  useEffect(() => {
    if (!id || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    getTechnicalCheckForm(variant, id)
      .then((res) => {
        if (!res || !res.compoundFormKey || res.status === 'deleted') { setLoadError(true); return; }
        setCompoundFormKey(Number(res.compoundFormKey));
        if (variant === 'vehicle') { vehicle.setForm(res); vehicle.setLoaded(true); }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, variant]);

  // Load the other technical check variant + driver/teammate once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    if (variant === 'vehicle') {
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
        .then(async (list) => {
          const items = Array.isArray(list) ? list.slice(0, 3) : [];
          const fulls = await Promise.all(items.map((item) => item?.id ? getTechnicalCheckForm('trailer', item.id).catch(() => null) : Promise.resolve(null)));
          fulls.forEach((full, idx) => {
            trailers[idx].setForm(full);
            if (full) setOpenTabs((prev) => prev.includes(`tab-trailer-technical-check-${idx}`) ? prev : [...prev, `tab-trailer-technical-check-${idx}`]);
          });
          trailers.forEach((t) => t.setLoaded(true));
        })
        .catch(console.error);
    } else {
      listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
        .then(async (list) => {
          const item = Array.isArray(list) ? list[0] : null;
          if (item?.id) {
            const full = await getTechnicalCheckForm('vehicle', item.id).catch(() => null);
            vehicle.setForm(full);
            if (full) setOpenTabs((prev) => prev.includes('tab-vehicle-technical-check') ? prev : [...prev, 'tab-vehicle-technical-check']);
          }
          vehicle.setLoaded(true);
        })
        .catch(console.error);
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
        .then(async (list) => {
          const items = Array.isArray(list) ? list.slice(0, 3) : [];
          const fulls = await Promise.all(items.map((item) => item?.id ? getTechnicalCheckForm('trailer', item.id).catch(() => null) : Promise.resolve(null)));
          fulls.forEach((full, idx) => {
            trailers[idx].setForm(full);
            if (full) setOpenTabs((prev) => prev.includes(`tab-trailer-technical-check-${idx}`) ? prev : [...prev, `tab-trailer-technical-check-${idx}`]);
            if (full && String(full.id) === String(id)) setActiveTab(`tab-trailer-technical-check-${idx}`);
          });
          trailers.forEach((t) => t.setLoaded(true));
        })
        .catch(console.error);
    }

    getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
      .then((res) => {
        driver.setForm(res ?? null);
        if (res) setOpenTabs((prev) => prev.includes('tab-driver') ? prev : [...prev, 'tab-driver']);
      })
      .finally(() => driver.setLoaded(true));

    getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
      .then((res) => {
        teammate.setForm(res ?? null);
        if (res) setOpenTabs((prev) => prev.includes('tab-teammate') ? prev : [...prev, 'tab-teammate']);
      })
      .finally(() => teammate.setLoaded(true));

    listAdrFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getAdrForm(item.id).catch(() => null) : null;
        adr.setForm(full);
        if (full) setOpenTabs((prev) => prev.includes('tab-adr') ? prev : [...prev, 'tab-adr']);
      })
      .catch(console.error)
      .finally(() => adr.setLoaded(true));

    listTransportInterruptionFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? (list as TransportInterruptionFormListItem[])[0] : null;
        const full = item?.id ? await getTransportInterruptionForm(item.id).catch(() => null) : null;
        transportInterruption.setForm(full ?? null);
        if (full) setOpenTabs((prev) => prev.includes('tab-transport-interruption') ? prev : [...prev, 'tab-transport-interruption']);
      })
      .catch(console.error)
      .finally(() => transportInterruption.setLoaded(true));
  }, [compoundFormKey]);

  const {
    form: compoundForm,
    loading: compoundLoading,
    refetch: refetchCompound,
  } = useCompoundFormDetail(
    compoundFormKey ? String(compoundFormKey) : undefined,
    id ? Number(id) : undefined,
  );

  const refetchCompoundRef = useRef(refetchCompound);
  useEffect(() => { refetchCompoundRef.current = refetchCompound; }, [refetchCompound]);

  const handleCompoundSaved = () => {
    setShowSavedAlert(true);
    setShowPublishedAlert(false);
    setTabErrors((p) => ({ ...p, 'tab-compound': false }));
    const openSubForms = [
      openTabs.includes('tab-vehicle-technical-check') ? vehicle.form : null,
      ...trailers.filter((_, i) => openTabs.includes(`tab-trailer-technical-check-${i}`)).map((tr) => tr.form),
      openTabs.includes('tab-driver') ? driver.form : null,
      openTabs.includes('tab-teammate') ? teammate.form : null,
    ].filter(Boolean);
    const allConfirmed = openSubForms.length > 0 && openSubForms.every((f) => f?.status === 'confirmed');
    if (allConfirmed) setCompoundEditActive(false);
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const handleCompoundConfirmed = () => {
    setShowConfirmedAlert(true);
    setCompoundEditActive(false);
    setShowPublishedAlert(false);
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const handleCompoundPublished = () => {
    setShowPublishedAlert(true);
    setCompoundEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(false);
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const handlePublished = (refetch: () => void) => {
    setShowPublishedAlert(true);
    setShowSavedAlert(false);
    setShowConfirmedAlert(false);
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    refetch();
    window.scrollTo(0, 0);
  };

  const { subFormsAllConfirmedOrPublished } = getSubFormsStatus({ openTabs, driver, teammate, vehicle, trailers, adr, transportInterruption });

  const {
    formik,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes,
    handleCountyChange,
    companyCitiesParishes,
    handleCompanyCountyChange,
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    triggerConfirm: triggerConfirmCompound,
    triggerPublish: triggerPublishCompound,
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
  } = useCompoundForm(
    compoundForm ?? undefined,
    handleCompoundSaved,
    handleCompoundConfirmed,
    subFormsAllConfirmedOrPublished,
    () => { refetchCompoundRef.current(); },
    handleCompoundPublished,
  );

  useEffect(() => {
    if (compoundForm?.status !== undefined) {
      setCompoundEditActive(compoundForm.status === 'saved' && hasPermission('compound_form.write'));
    }
  }, [compoundForm?.status]);

  const { canPublish: canPublishSubForms, canConfirm } = useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailers, adr, transportInterruption });

  const checkAndAutoConfirmCompound = makeCheckAndAutoConfirm({ compoundForm, triggerConfirm: triggerConfirmCompound });
  const checkAndAutoPublishCompound = makeCheckAndAutoPublish({ compoundForm, triggerPublish: triggerPublishCompound });

  const refetchTransportInterruption = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    listTransportInterruptionFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? (list as TransportInterruptionFormListItem[])[0] : null;
        const full = item?.id ? await getTransportInterruptionForm(item.id).catch(() => null) : null;
        transportInterruption.setForm(full ?? null);
        checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, trailers.map((t) => t.form), adr.form, full);
        checkAndAutoPublishCompound(driver.form, teammate.form, vehicle.form, trailers.map((t) => t.form), adr.form, full);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchAdr = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    listAdrFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getAdrForm(item.id).catch(() => null) : null;
        adr.setForm(full);
        checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, trailers.map((t) => t.form), full, transportInterruption.form);
        checkAndAutoPublishCompound(driver.form, teammate.form, vehicle.form, trailers.map((t) => t.form), full, transportInterruption.form);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTechCheck = (subForm: typeof vehicle | typeof trailers[0], scope: TechnicalCheckVariant, _trailerIdx?: number, onDone?: () => void) => {
    if (!compoundFormKey) return;
    if (scope === 'vehicle') {
      listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
        .then(async (list) => {
          const item = Array.isArray(list) ? list[0] : null;
          const full = item?.id ? await getTechnicalCheckForm('vehicle', item.id).catch(() => null) : null;
          subForm.setForm(full);
          checkAndAutoConfirmCompound(driver.form, teammate.form, full, trailers.map((t) => t.form), adr.form, transportInterruption.form);
          checkAndAutoPublishCompound(driver.form, teammate.form, full, trailers.map((t) => t.form), adr.form, transportInterruption.form);
          onDone?.();
        })
        .catch(console.error);
    } else {
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
        .then(async (list) => {
          const items = Array.isArray(list) ? list.slice(0, 3) : [];
          const fulls = await Promise.all(items.map((item) => item?.id ? getTechnicalCheckForm('trailer', item.id).catch(() => null) : Promise.resolve(null)));
          fulls.forEach((full, i) => trailers[i].setForm(full));
          const latestTrailerForms = trailers.map((t, i) => fulls[i] ?? t.form);
          checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, latestTrailerForms, adr.form, transportInterruption.form);
          checkAndAutoPublishCompound(driver.form, teammate.form, vehicle.form, latestTrailerForms, adr.form, transportInterruption.form);
          onDone?.();
        })
        .catch(console.error);
    }
  };

  const refetchDriveRest = (subForm: typeof driver, scope: 'driver' | 'teammate', onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey(scope, compoundFormKey)
      .then((res) => { subForm.setForm(res ?? null);
        const latestDriver = scope === 'driver' ? res : driver.form;
        const latestTeammate = scope === 'teammate' ? res : teammate.form;
        checkAndAutoConfirmCompound(latestDriver, latestTeammate, vehicle.form, trailers.map((t) => t.form), adr.form, transportInterruption.form);
        checkAndAutoPublishCompound(latestDriver, latestTeammate, vehicle.form, trailers.map((t) => t.form), adr.form, transportInterruption.form);
        onDone?.(); })
      .catch(console.error);
  };

  const handleSaveAll = createSaveAllHandler({
    activeTab,
    setTabErrors,
    setValidatedTabs,
    compoundEditActive,
    onCompoundSave: () => formik.handleSubmit(),
    onCompoundValidate: async () => { const errors = await formik.validateForm(); const hasErrors = Object.keys(errors).length > 0; setTabErrors((p) => ({ ...p, 'tab-compound': hasErrors })); setValidatedTabs((p) => { const n = new Set(p); n.add('tab-compound'); return n; }); if (hasErrors) { const dt = (v: unknown): unknown => Array.isArray(v) ? v.map(dt) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).map((k) => [k, dt((v as Record<string, unknown>)[k])])) : true; void formik.setTouched(dt(formik.values) as typeof formik.touched); } return !hasErrors; },
    subForms: [
      {
        tabId: 'tab-vehicle-technical-check',
        subForm: vehicle as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(vehicle, 'vehicle', undefined, () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); handleSubformEditActive(); }).catch(console.error);
        },
      },
      ...trailers.map((trailerHandle, idx) => ({
        tabId: `tab-trailer-technical-check-${idx}`,
        subForm: trailerHandle as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft: unknown) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(trailerHandle, 'trailer', idx, () => { trailerHandle.draftRef.current = null; trailerHandle.setDraft(null); }); handleSubformEditActive(); }).catch(console.error);
        },
      })),
      {
        tabId: 'tab-driver',
        subForm: driver as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(draft as Partial<DriveRestForm> & Record<string, unknown>, driver.form?.status === 'confirmed' ? 'confirmed' : 'saved');
          saveDriveRestForm('driver', serialized as unknown as DriveRestForm).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchDriveRest(driver, 'driver', () => { driver.draftRef.current = null; driver.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-teammate',
        subForm: teammate as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(draft as Partial<DriveRestForm> & Record<string, unknown>, teammate.form?.status === 'confirmed' ? 'confirmed' : 'saved');
          saveDriveRestForm('teammate', serialized as unknown as DriveRestForm).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchDriveRest(teammate, 'teammate', () => { teammate.draftRef.current = null; teammate.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-adr',
        subForm: adr as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createAdrValidationSchema(t) as ReturnType<typeof createAdrValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as AdrForm;
          const isBlank = (obj: Record<string, unknown>) => Object.values(obj).every((v) => v == null || v === '');
          const payload = { ...d, driverAssistant: d.driverAssistant && !isBlank(d.driverAssistant as Record<string, unknown>) ? JSON.stringify(d.driverAssistant) : '', lastLoadAddress: d.lastLoadAddress && !isBlank(d.lastLoadAddress as Record<string, unknown>) ? JSON.stringify(d.lastLoadAddress) : '', nextLoadAddress: d.nextLoadAddress && !isBlank(d.nextLoadAddress as Record<string, unknown>) ? JSON.stringify(d.nextLoadAddress) : '', dangerousGoods: JSON.stringify(d.dangerousGoods ?? []), infringements: JSON.stringify((d.infringements ?? []).filter((e) => !!(e as { checkStatus?: string }).checkStatus)), correctiveMeasures: JSON.stringify(d.correctiveMeasures ?? []) } as unknown as AdrForm;
          saveAdrForm(payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchAdr(() => { adr.draftRef.current = null; adr.setDraft(null); }); handleSubformEditActive(); }).catch(console.error);
        },
      },
      {
        tabId: 'tab-transport-interruption',
        subForm: transportInterruption as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        fallbackSave: (draft) => {
          const d = draft as TransportInterruptionForm;
          const payload = { ...d, legalBases: JSON.stringify(d.legalBases ?? []) } as unknown as TransportInterruptionForm;
          saveTransportInterruptionForm(payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTransportInterruption(() => { transportInterruption.draftRef.current = null; transportInterruption.setDraft(null); }); handleSubformEditActive(); }).catch(console.error);
        },
      },
    ],
  });

  const handleAddTab = (
    tabId:
      | 'tab-driver'
      | 'tab-teammate'
      | 'tab-vehicle-technical-check'
      | `tab-trailer-technical-check-${number}`
      | 'tab-adr'
      | 'tab-transport-interruption',
  ) =>
    addTab(tabId, {
      driver,
      teammate,
      vehicle,
      trailers,
      adr,
      transportInterruption,
      setOpenTabs,
      setActiveTab,
    });

  const anyEditActive =
    vehicle.editActive ||
    trailers.some((t) => t.editActive) ||
    driver.editActive ||
    teammate.editActive ||
    adr.editActive ||
    transportInterruption.editActive ||
    compoundEditActive;

  const handleCancelAllEdits = () =>
    cancelAllEdits({ setCompoundEditActive, driver, teammate, vehicle, trailers, adr, transportInterruption });

  const canEdit = isAdmin;

  const addableTabs = ALL_FORM_TABS.filter((tab) => !openTabs.includes(tab.tabId));

  const addFormDropdown =
    canEdit && addableTabs.length > 0 && anyEditActive ? (
      <Dropdown width="max-content">
        <Dropdown.Trigger>
          <Button iconRight="keyboard_arrow_down" visualType="secondary" disabled={addableTabs.length === 0}>
            {t('desktop.addForm')}
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {addableTabs.map((tab, index) => (
            <Dropdown.Item key={tab.tabId} index={index} onClick={() => handleAddTab(tab.tabId)}>
              {t(tab.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown>
    ) : null;

  const canDelete =
    isAdmin &&
    ((vehicle.form != null && vehicle.form.status !== 'deleted') ||
      trailers.some((t) => t.form != null && t.form.status !== 'deleted') ||
      (driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (transportInterruption.form != null && transportInterruption.form.status !== 'deleted') ||
      (compoundForm != null && compoundForm.status !== 'deleted'));

  // LJVIS2-56: e-Toimik query card data — driver identification already lives
  // on compoundForm.drivers[], reference numbers on whichever loaded
  // sub-form(s) have one set. No new data-fetching needed (see plan §3/§5).
  const compoundFormDrivers: Driver[] = Array.isArray(compoundForm?.drivers)
    ? compoundForm.drivers
    : typeof compoundForm?.drivers === 'string'
      ? JSON.parse(compoundForm.drivers)
      : [];

  const etoimikReferenceOptions = (
    [
      vehicle.form && { label: t('forms.technical_check.vehicleTitle'), form: vehicle.form },
      trailers[0].form && { label: t('forms.technical_check.trailerTitle'), form: trailers[0].form },
      driver.form && { label: t('forms.driver_drive_rest_form'), form: driver.form },
      teammate.form && { label: t('forms.teammate_drive_rest_form'), form: teammate.form },
      adr.form && { label: t('forms.adr.title'), form: adr.form },
    ] as ({ label: string; form: { subFormNumber?: string; proceedingReferenceNumber?: string } } | null)[]
  )
    .filter((entry): entry is { label: string; form: { subFormNumber?: string; proceedingReferenceNumber?: string } } =>
      !!entry && !!entry.form.proceedingReferenceNumber,
    )
    .map((entry) => ({
      label: `${entry.label} ${entry.form.subFormNumber ?? ''} — ${entry.form.proceedingReferenceNumber}`,
      value: entry.form.proceedingReferenceNumber as string,
    }));

  const handleDelete = useDeleteAllSubForms({ driver, teammate, vehicle, trailers, adr, transportInterruption, compoundForm });

  const { removeConfirmTab, handleRemove, handleRemoveTrailerFromCompound, handleRemoveConfirmed, handleRemoveCancel, removeTrailerFromCompound } = useRemoveSubFormTab({
    driver,
    teammate,
    vehicle,
    trailers,
    adr,
    transportInterruption,
    setOpenTabs,
    setActiveTab,
    checkAndAutoConfirm: checkAndAutoConfirmCompound,
    navigateAfterRemove: () => navigate(`/control-forms/compound/${compoundFormKey}`),
    onTrailerRemoved: (index: number) => formik.setFieldValue('trailers', formik.values.trailers.filter((_: unknown, i: number) => i !== index)),
  });

  const sharedCompoundProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes,
    companyCitiesParishes,
  };

  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!snapshot) return <FormNotFoundView title={t(titleKey)} />;
    return (
      <div>
        <Button visualType="link" onClick={() => navigate(-1)} iconLeft="arrow_back">
          {t('common.back')}
        </Button>
        <TechnicalCheckFormViewCard scope={variant} form={snapshot} formType={formType} />
      </div>
    );
  }

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (loadError || !compoundFormKey) return <Text>{t('common.error')}</Text>;
  const currentForm = variant === 'vehicle' ? vehicle.form : trailers[0].form;
  if (id && !currentForm) return <FormNotFoundView title={t(titleKey)} />;

  return (
    <div style={{ maxWidth: containerWidth }}>
      <DeleteConfirmModal
        subForm={!removeTrailerFromCompound}
        trailerSubForm={removeTrailerFromCompound}
        isOpen={removeConfirmTab !== null}
        onClose={handleRemoveCancel}
        onDelete={handleRemoveConfirmed}
      />
      {showSavedAlert && !showConfirmedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowSavedAlert(false)}
          type="success"
          size="small"
        >
          {t('forms.savedNote')}
        </Alert>
      )}
      {showConfirmedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => {
            setShowConfirmedAlert(false);
            setShowSavedAlert(false);
          }}
          type="success"
          size="small"
        >
          {t('forms.confirmedNote')}
        </Alert>
      )}
      {showPublishedAlert && (
        <Alert
          icon="check_circle"
          className="mb-1"
          onClose={() => setShowPublishedAlert(false)}
          type="success"
          size="small"
        >
          {t('forms.publishedNote')}
        </Alert>
      )}

      <Button
        visualType="link"
        onClick={() => navigate('/')}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

      {!isDesktop && addFormDropdown}

      {compoundForm && compoundFormKey && (
        <EtoimikQueryCard
          drivers={compoundFormDrivers}
          referenceNumberOptions={etoimikReferenceOptions}
          compoundFormKey={compoundFormKey}
        />
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.compound_form')} overflowMode="scroll">
          <Tabs.Trigger id="tab-compound">
            <span style={{ position: 'relative' }}>
              {t('forms.compound.generalPart')}
              {hasTabErrors('tab-compound') && <StatusIndicator type="danger" position="top-right" />}
            </span>
          </Tabs.Trigger>
          {(() => {
            const tabSubForms: Record<
              string,
              { form: unknown; editActive: boolean }
            > = {
              'tab-driver': driver,
              'tab-teammate': teammate,
              'tab-vehicle-technical-check': vehicle,
              'tab-adr': adr,
              'tab-transport-interruption': transportInterruption,
            };
            trailers.forEach((tr, idx) => { tabSubForms[`tab-trailer-technical-check-${idx}`] = tr; });
            const compoundTrailersList: Trailer[] = Array.isArray(formik.values.trailers) && (formik.values.trailers as Trailer[]).length > 0 ? (formik.values.trailers as Trailer[]) : Array.isArray(compoundForm?.trailers) ? (compoundForm.trailers as Trailer[]) : typeof compoundForm?.trailers === 'string' ? JSON.parse(compoundForm.trailers) : [];
            const compoundTrailerRegNrs = compoundTrailersList.map((tr) => tr.regNr ?? '');
            const tabsWithStatus = openTabs.filter(
              (tid) => tid !== 'tab-compound' && tabSubForms[tid]?.form != null,
            ).length;
            const staticTabs = ['tab-driver', 'tab-teammate', 'tab-vehicle-technical-check', 'tab-adr', 'tab-transport-interruption'] as const;
            const trailerTabIds = openTabs.filter((t) => t.startsWith('tab-trailer-technical-check-'));
            const allTabIds = [...staticTabs.filter((tid) => openTabs.includes(tid)), ...trailerTabIds];
            return allTabIds.map((tid) => {
              const subForm = tabSubForms[tid];
              const label =
                tid === 'tab-driver'
                  ? t('forms.driver_drive_rest_form')
                  : tid === 'tab-teammate'
                    ? t('forms.teammate_drive_rest_form')
                    : tid === 'tab-vehicle-technical-check'
                      ? t('forms.technical_check.vehicleTitle')
                      : tid === 'tab-adr'
                        ? t('forms.adr.title')
                        : tid === 'tab-transport-interruption'
                          ? t('forms.transport_interruption.title')
                          : (() => { const idx = Number(tid.replace('tab-trailer-technical-check-', '')); const regNr = compoundTrailerRegNrs[idx] || (trailers[idx]?.form as TechnicalCheckForm | null)?.trailerRegNr; return regNr ? `${t('forms.technical_check.trailerTitle')} (${regNr})` : t('forms.technical_check.trailerTitle'); })();
              const canClose =
                subForm?.editActive && (tabsWithStatus > 1 || !subForm.form);
              return (
                <Tabs.Trigger key={tid} id={tid}>
                  <span style={{ position: 'relative' }}>
                    {label}
                    {hasTabErrors(tid) && (
                      <StatusIndicator type="danger" position="top-right" />
                    )}
                  </span>
                  {canClose && (
                    <ClosingButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(tid as Parameters<typeof handleRemove>[0]);
                      }}
                    />
                  )}
                </Tabs.Trigger>
              );
            });
          })()}
          {isDesktop && addFormDropdown && (
            <div
              style={{
                marginLeft: 'auto',
                paddingLeft: '1rem',
                display: 'flex',
                alignItems: 'center',
                marginRight: '1rem',
              }}
            >
              {addFormDropdown}
            </div>
          )}
        </Tabs.List>

        <Tabs.Content id="tab-compound" className="p-1">
          {compoundLoading || !compoundForm ? (
            <Text>{t('common.loading')}</Text>
          ) : compoundEditActive ? (
            <CompoundFormEditCard
              formik={formik}
              {...sharedCompoundProps}
              canConfirm={false}
              canDelete={false}
              companySearchError={companySearchError}
              setCompanySearchError={setCompanySearchError}
              vehicleSearchError={vehicleSearchError}
              setVehicleSearchError={setVehicleSearchError}
              trailerSearchError={trailerSearchError}
              setTrailerSearchError={setTrailerSearchError}
              mtrSearchError={mtrSearchError}
              setMtrSearchError={setMtrSearchError}
              handleOrgChange={handleOrgChange}
              handleStructuralUnitChange={handleStructuralUnitChange}
              handleCountyChange={handleCountyChange}
              handleCompanyCountyChange={handleCompanyCountyChange}
              handleCompanySearch={handleCompanySearch}
              handleVehicleSearch={handleVehicleSearch}
              handleTrailerSearch={handleTrailerSearch}
              handleMtrSearch={handleMtrSearch}
              onCancel={() => {
                formik.resetForm();
                setCompoundEditActive(false);
              }}
              onConfirm={() => {}}
              onDelete={() => {}}
              formType={FORM_TYPE.COMPOUND}
              versionsRefreshKey={compoundVersionsRefreshKey}
              trailerFormRegNrs={trailers.map((tr) => tr.form?.trailerRegNr ?? null)}
              onAddTrailerControlForm={(index) => handleAddTab(`tab-trailer-technical-check-${index}`)}
              onEditTrailerControlForm={(index) => setActiveTab(`tab-trailer-technical-check-${index}`)}
              onRemoveTrailer={(index) => handleRemoveTrailerFromCompound(`tab-trailer-technical-check-${index}` as Parameters<typeof handleRemove>[0])}
            />
          ) : (
            <CompoundFormViewCard
              form={compoundForm}
              {...sharedCompoundProps}
              canEdit={
                canEdit &&
                (compoundForm.status === 'saved' ||
                  compoundForm.status === 'published')
              }
              onEdit={() => setCompoundEditActive(true)}
              formType={FORM_TYPE.COMPOUND}
            />
          )}
        </Tabs.Content>

        <SubFormTab
          id="tab-driver"
          open={openTabs.includes('tab-driver')}
          subForm={driver}
          renderView={(form) => (
            <DriveRestFormViewCard
              scope="driver"
              form={form}
              formType={FORM_TYPE.DRIVER}
              canPublish={canPublishSubForms()}
              onPublish={() => publishDriveRestForm('driver', form.id!).then(() => handlePublished(() => refetchDriveRest(driver, 'driver')))}
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              form={driver.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                setTabErrors((p) => ({ ...p, 'tab-driver': false }));
                refetchDriveRest(driver, 'driver', () => {
                  driver.draftRef.current = null;
                  driver.setDraft(null);
                });
              }}
              onCancel={() => {
                driver.setEditActive(false);
                driver.draftRef.current = null;
                driver.setDraft(null);
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.DRIVER}
              onValuesChange={(v) => {
                const next = {
                  ...(driver.draftRef.current ?? form),
                  ...v,
                } as DriveRestForm;
                driver.draftRef.current = next;
                driver.setDraft(next);
              }}
              initialValidate={validatedTabs.has('tab-driver')}
            />
          )}
        />

        <SubFormTab
          id="tab-teammate"
          open={openTabs.includes('tab-teammate')}
          subForm={teammate}
          renderView={(form) => (
            <DriveRestFormViewCard
              scope="teammate"
              form={form}
              formType={FORM_TYPE.TEAMMATE}
              canPublish={canPublishSubForms()}
              onPublish={() => publishDriveRestForm('teammate', form.id!).then(() => handlePublished(() => refetchDriveRest(teammate, 'teammate')))}
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="teammate"
              form={teammate.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                setTabErrors((p) => ({ ...p, 'tab-teammate': false }));
                refetchDriveRest(teammate, 'teammate', () => {
                  teammate.draftRef.current = null;
                  teammate.setDraft(null);
                });
              }}
              onCancel={() => {
                teammate.setEditActive(false);
                teammate.draftRef.current = null;
                teammate.setDraft(null);
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TEAMMATE}
              onValuesChange={(v) => {
                const next = {
                  ...(teammate.draftRef.current ?? form),
                  ...v,
                } as DriveRestForm;
                teammate.draftRef.current = next;
                teammate.setDraft(next);
              }}
              initialValidate={validatedTabs.has('tab-teammate')}
            />
          )}
        />

        <SubFormTab
          id="tab-vehicle-technical-check"
          open={openTabs.includes('tab-vehicle-technical-check')}
          subForm={vehicle}
          renderView={(form) => (
            <TechnicalCheckFormViewCard
              scope="vehicle"
              form={form}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
              canPublish={canPublishSubForms()}
              onPublish={() => publishTechnicalCheckForm('vehicle', form.id!).then(() => handlePublished(() => refetchTechCheck(vehicle, 'vehicle', undefined)))}
            />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="vehicle"
              form={vehicle.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                refetchTechCheck(vehicle, 'vehicle', undefined, () => {
                  vehicle.draftRef.current = null;
                  vehicle.setDraft(null);
                });
              }}
              onCancel={() => {
                vehicle.setEditActive(false);
                vehicle.draftRef.current = null;
                vehicle.setDraft(null);
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
              onValuesChange={(v) => {
                const next = {
                  ...(vehicle.draftRef.current ?? form),
                  ...v,
                } as TechnicalCheckForm;
                vehicle.draftRef.current = next;
                vehicle.setDraft(next);
              }}
              initialValidate={false}
            />
          )}
        />

        {trailers.map((trailerHandle, idx) => (
          <SubFormTab
            key={`tab-trailer-technical-check-${idx}`}
            id={`tab-trailer-technical-check-${idx}`}
            open={openTabs.includes(`tab-trailer-technical-check-${idx}`)}
            subForm={trailerHandle}
            renderView={(form) => (
              <TechnicalCheckFormViewCard
                scope="trailer"
                form={form}
                formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
                canPublish={canPublishSubForms()}
                onPublish={() => publishTechnicalCheckForm('trailer', form.id!).then(() => handlePublished(() => refetchTechCheck(trailerHandle, 'trailer', idx)))}
              />
            )}
            renderEdit={(form, ref) => (
              <TechnicalCheckFormEditCard
                ref={ref}
                scope="trailer"
                form={trailerHandle.draft ?? form}
                compoundFormKey={compoundFormKey!}
                trailerIndex={idx}
                compoundTrailers={
                  Array.isArray(formik.values.trailers) && (formik.values.trailers as Trailer[]).length > 0
                    ? (formik.values.trailers as Trailer[])
                    : Array.isArray(compoundForm?.trailers)
                      ? compoundForm.trailers
                      : typeof compoundForm?.trailers === 'string'
                        ? JSON.parse(compoundForm.trailers)
                        : []
                }
                onSaved={() => {
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  refetchTechCheck(trailerHandle, 'trailer', idx, () => {
                    trailerHandle.draftRef.current = null;
                    trailerHandle.setDraft(null);
                  });
                }}
                onCancel={() => {
                  trailerHandle.setEditActive(false);
                  trailerHandle.draftRef.current = null;
                  trailerHandle.setDraft(null);
                }}
                canConfirm={canConfirm()}
                onConfirm={() => {}}
                formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
                onValuesChange={(v) => {
                  const next = { ...(trailerHandle.draftRef.current ?? form), ...v } as TechnicalCheckForm;
                  trailerHandle.draftRef.current = next;
                  trailerHandle.setDraft(next);
                }}
                initialValidate={false}
              />
            )}
          />
        ))}

        <SubFormTab
          id="tab-adr"
          open={openTabs.includes('tab-adr')}
          subForm={adr}
          renderView={(form) => (
            <AdrFormViewCard
              form={form}
              formType={FORM_TYPE.ADR}
              canPublish={canPublishSubForms()}
              onPublish={() => publishAdrForm(form.id!).then(() => handlePublished(() => refetchAdr()))}
            />
          )}
          renderEdit={(form, ref) => (
            <AdrFormEditCard
              ref={ref}
              form={adr.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                refetchAdr(() => {
                  adr.draftRef.current = null;
                  adr.setDraft(null);
                });
              }}
              onCancel={() => {
                adr.setEditActive(false);
                adr.resetDraft();
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.ADR}
              onValuesChange={(v) => {
                const next = {
                  ...(adr.draftRef.current ?? form),
                  ...v,
                } as AdrForm;
                adr.draftRef.current = next;
                adr.setDraft(next);
              }}
              initialValidate={false}
            />
          )}
        />

        <SubFormTab
          id="tab-transport-interruption"
          open={openTabs.includes('tab-transport-interruption')}
          subForm={transportInterruption}
          renderView={(form) => (
            <TransportInterruptionFormViewCard
              form={form}
              formType={FORM_TYPE.TRANSPORT_INTERRUPTION}
              canPublish={canPublishSubForms()}
              onPublish={() => publishTransportInterruptionForm(form.id!).then(() => handlePublished(() => refetchTransportInterruption()))}
            />
          )}
          renderEdit={(form, ref) => (
            <TransportInterruptionFormEditCard
              ref={ref}
              form={transportInterruption.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setTabErrors((p) => ({
                  ...p,
                  'tab-transport-interruption': false,
                }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                refetchTransportInterruption(() => {
                  transportInterruption.draftRef.current = null;
                  transportInterruption.setDraft(null);
                });
              }}
              onCancel={() => {
                transportInterruption.setEditActive(false);
                transportInterruption.resetDraft();
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TRANSPORT_INTERRUPTION}
              onValuesChange={(v) => {
                const next = {
                  ...(transportInterruption.draftRef.current ?? form),
                  ...v,
                } as TransportInterruptionForm;
                transportInterruption.draftRef.current = next;
                transportInterruption.setDraft(next);
              }}
              initialValidate={validatedTabs.has('tab-transport-interruption')}
            />
          )}
        />
      </Tabs>

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {isAdmin &&
            !anyEditActive &&
            compoundForm?.status !== 'deleted' && (
              <Button
                iconLeft="edit"
                type="button"
                visualType="secondary"
                onClick={() => {
                  setCompoundEditActive(true);
                  if (vehicle.form) vehicle.setEditActive(true);
                  trailers.forEach((tr) => { if (tr.form) tr.setEditActive(true); });
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                  if (adr.form) adr.setEditActive(true);
                  if (transportInterruption.form)
                    transportInterruption.setEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {anyEditActive && subFormsAllConfirmedOrPublished && (
            <Button
              type="button"
              visualType="secondary"
              onClick={() => {
                formik.resetForm();
                handleCancelAllEdits();
              }}
            >
              {t('common.cancel')}
            </Button>
          )}
          {anyEditActive && (
            <AsyncButton type="button" onClick={handleSaveAll}>
              {t('common.save')}
            </AsyncButton>
          )}
          {anyEditActive && canDelete && (
            <DeleteConfirmModal onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
