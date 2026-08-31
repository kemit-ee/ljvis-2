import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Alert,
  Tabs,
  Dropdown,
  StatusIndicator,
  ClosingButton,
} from '@tedi-design-system/react/tedi';
import { useCompoundForm } from './useCompoundForm';
import { useCompoundFormDetail } from './useCompoundFormDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE, ALL_FORM_TABS } from '../../../../constants/constants';
import {
  deleteCompoundForm,
  getCompoundFormSnapshot,
  getDriveRestFormByCompoundFormKey,
  saveDriveRestForm,
  listTechnicalCheckFormsByCompoundFormKey,
  getTechnicalCheckForm,
  listTransportInterruptionFormsByCompoundFormKey,
  getTransportInterruptionForm,
  listAdrFormsByCompoundFormKey,
  getAdrForm,
  saveAdrForm,
  saveTransportInterruptionForm,
  saveTechnicalCheckForm,
  publishDriveRestForm,
  publishTechnicalCheckForm,
  publishAdrForm,
  publishTransportInterruptionForm,
} from '../../api';
import type {
  DriveRestForm,
  AdrForm,
  TransportInterruptionForm,
  TransportInterruptionFormListItem,
  AdrFormListItem,
  TechnicalCheckForm,
  Trailer,
} from '../../types';
import { useContainerWidth } from '../../../../hooks/useContainerWidth';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard';
import {
  DriveRestFormEditCard,
  type DriveRestFormEditCardRef,
} from '../../components/DriveRestForm/DriveRestFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal';
import {
  serializeDriveRestFormValues,
  createDriveRestValidationSchema,
} from '../drive-rest-form/useDriveRestForm';
import { createTechnicalCheckValidationSchema } from '../technical-check-form/useTechnicalCheckForm.ts';
import { createAdrValidationSchema } from '../adr-form/useAdrForm';
import {
  TechnicalCheckFormEditCard,
  type TechnicalCheckFormEditCardRef,
} from '../../components/TechnicalCheckForm/TechnicalCheckFormEditCard.tsx';
import { TechnicalCheckFormViewCard } from '../../components/TechnicalCheckForm/TechnicalCheckFormViewCard.tsx';
import { AdrFormViewCard } from '../../components/AdrForm/AdrFormViewCard';
import {
  AdrFormEditCard,
  type AdrFormEditCardRef,
} from '../../components/AdrForm/AdrFormEditCard';
import { TransportInterruptionFormViewCard } from '../../components/TransportInterruptionForm/TransportInterruptionFormViewCard';
import {
  TransportInterruptionFormEditCard,
  type TransportInterruptionFormEditCardRef,
} from '../../components/TransportInterruptionForm/TransportInterruptionFormEditCard';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { useSubForm, type SubFormHandle } from '../../hooks/useSubForm';
import { createSaveAllHandler } from '../../hooks/createSaveAllHandler';
import { isAnySubFormSaved, useSubFormEditActive, makeCheckAndAutoConfirm, makeCheckAndAutoPublish, useSubFormPermissions, subFormsAllConfirmedOrPublished as getSubFormsStatus, addTab, useDeleteAllSubForms, useRemoveSubFormTab, cancelAllEdits } from '../../hooks/useSubFormEditActive';
import { AsyncButton } from '../../../../shared/components/AsyncButton.tsx';
import {useIsAdmin} from "../../../../hooks/useIsAdmin.ts";

export function CompoundFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const isAdmin = useIsAdmin();

  const forbidden = !(
    (hasPermission('compound_form.read') ||
      hasPermission('control_form.view_unpublished')) &&
    hasPermission('classifier.read')
  );

  const [isEditActive, setIsEditActive] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('tab-compound');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_driver_form' });
  const teammate = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_teammate_form' });
  const vehicle = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'vehicle_technical_form' });
  const trailer0 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailer1 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailer2 = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const trailers = [trailer0, trailer1, trailer2];
  const adr = useSubForm<AdrForm, AdrFormEditCardRef>({ permPrefix: 'adr_form' });
  const transportInterruption = useSubForm<
    TransportInterruptionForm,
    TransportInterruptionFormEditCardRef
  >({ permPrefix: 'transport_interruption_form' });

  const containerWidth = useContainerWidth(isDesktop, openTabs);

  const hasTabErrors = (tabId: string) => {
    if (!validatedTabs.has(tabId)) return false;
    return tabErrors[tabId] ?? false;
  };

  const { form, loading, refetch } = useCompoundFormDetail(
    snapshotId ? undefined : id,
  );
  const [snapshot, setSnapshot] = useState<
    import('../../types').CompoundForm | null
  >(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (form?.status !== undefined) {
      setIsEditActive(
        form.status === 'saved' && hasPermission('compound_form.write'),
      );
      if (form.status === 'confirmed') setShowSavedAlert(false);
    }
  }, [form?.status]);

  const handleSubformEditActive = useSubFormEditActive({ driver, teammate, vehicle, trailers, adr, transportInterruption, hasPermission });

  useEffect(() => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    Promise.all([
      getDriveRestFormByCompoundFormKey('driver', compoundFormKey),
      getDriveRestFormByCompoundFormKey('teammate', compoundFormKey),
      listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey),
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey),
      listAdrFormsByCompoundFormKey(compoundFormKey),
      listTransportInterruptionFormsByCompoundFormKey(compoundFormKey),
    ])
      .then(async ([driverRes, teammateRes, vehicleList, trailerList, adrList, tiList]) => {
        driver.setForm(driverRes);
        teammate.setForm(teammateRes);
        const vehicleItem = Array.isArray(vehicleList) ? vehicleList[0] : null;
        const trailerItems = Array.isArray(trailerList) ? trailerList.slice(0, 3) : [];
        const vehicleFull = vehicleItem?.id
          ? await getTechnicalCheckForm('vehicle', vehicleItem.id).catch(() => null)
          : null;
        const trailerFulls = await Promise.all(
          trailerItems.map((item) =>
            item?.id ? getTechnicalCheckForm('trailer', item.id).catch(() => null) : Promise.resolve(null)
          )
        );
        const adrItem = Array.isArray(adrList) ? (adrList as AdrFormListItem[])[0] : null;
        const adrFull = adrItem?.id
          ? await getAdrForm(adrItem.id).catch(() => null)
          : null;
        const tiItem = Array.isArray(tiList) ? (tiList as TransportInterruptionFormListItem[])[0] : null;
        const tiFull = tiItem?.id
          ? await getTransportInterruptionForm(tiItem.id).catch(() => null)
          : null;
        vehicle.setForm(vehicleFull);
        trailerFulls.forEach((full, idx) => trailers[idx].setForm(full));
        adr.setForm(adrFull);
        transportInterruption.setForm(tiFull ?? null);
        const tabs: string[] = [];
        if (driverRes) tabs.push('tab-driver');
        if (teammateRes) tabs.push('tab-teammate');
        if (vehicleFull) tabs.push('tab-vehicle-technical-check');
        trailerFulls.forEach((full, idx) => { if (full) tabs.push(`tab-trailer-technical-check-${idx}`); });
        if (adrFull) tabs.push('tab-adr');
        if (tiFull) tabs.push('tab-transport-interruption');
        setOpenTabs(tabs);
        if (isAnySubFormSaved(driverRes, teammateRes, vehicleFull, trailerFulls, adrFull, tiFull)) {
          if (driverRes) driver.setEditActive(hasPermission('sp_driver_form.write'));
          if (teammateRes) teammate.setEditActive(hasPermission('sp_teammate_form.write'));
          if (vehicleFull) vehicle.setEditActive(hasPermission('vehicle_technical_form.write'));
          trailerFulls.forEach((full, idx) => { if (full) trailers[idx].setEditActive(hasPermission('trailer_technical_form.write')); });
          if (adrFull) adr.setEditActive(hasPermission('adr_form.write'));
          if (tiFull) transportInterruption.setEditActive(hasPermission('transport_interruption_form.write'));
        }
      })
      .catch(console.error)
      .finally(() => {
        driver.setLoaded(true);
        teammate.setLoaded(true);
        vehicle.setLoaded(true);
        trailers.forEach((t) => t.setLoaded(true));
        adr.setLoaded(true);
        transportInterruption.setLoaded(true);
      });
  }, [form?.id]);

  const refetchDriveRest = (scope: 'driver' | 'teammate', onDone?: () => void) => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    const subForm = scope === 'driver' ? driver : teammate;
    getDriveRestFormByCompoundFormKey(scope, compoundFormKey)
      .then((res) => {
        subForm.setForm(res);
        const latestDriver = scope === 'driver' ? res : driver.form;
        const latestTeammate = scope === 'teammate' ? res : teammate.form;
        checkAndAutoConfirmCompound(latestDriver, latestTeammate, vehicle.form, trailers.map((t) => t.form), adr.form, transportInterruption.form);
        checkAndAutoPublishCompound(latestDriver, latestTeammate, vehicle.form, trailers.map((t) => t.form), adr.form, transportInterruption.form);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTransportInterruption = (onDone?: () => void) => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    listTransportInterruptionFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? (list as TransportInterruptionFormListItem[])[0] : null;
        const full = item?.id
          ? await getTransportInterruptionForm(item.id).catch(() => null)
          : null;
        transportInterruption.setForm(full ?? null);
        checkAndAutoConfirmCompound(
          driver.form,
          teammate.form,
          vehicle.form,
          trailers.map((t) => t.form),
          adr.form,
          full
        );
        checkAndAutoPublishCompound(
          driver.form,
          teammate.form,
          vehicle.form,
          trailers.map((t) => t.form),
          adr.form,
          full
        );
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchAdr = (onDone?: () => void) => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    listAdrFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id
          ? await getAdrForm(item.id).catch(() => null)
          : null;
        adr.setForm(full);
        checkAndAutoConfirmCompound(
          driver.form,
          teammate.form,
          vehicle.form,
          trailers.map((t) => t.form),
          full,
          transportInterruption.form
        );
        checkAndAutoPublishCompound(
          driver.form,
          teammate.form,
          vehicle.form,
          trailers.map((t) => t.form),
          full,
          transportInterruption.form
        );
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTechCheck = (scope: 'vehicle' | 'trailer', _trailerIdx?: number, onDone?: () => void) => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    if (scope === 'vehicle') {
      listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
        .then(async (list) => {
          const item = Array.isArray(list) ? list[0] : null;
          const full = item?.id ? await getTechnicalCheckForm('vehicle', item.id).catch(() => null) : null;
          vehicle.setForm(full);
          checkAndAutoConfirmCompound(driver.form, teammate.form, full, trailers.map((t) => t.form), adr.form, transportInterruption.form);
          checkAndAutoPublishCompound(driver.form, teammate.form, full, trailers.map((t) => t.form), adr.form, transportInterruption.form);
          onDone?.();
        })
        .catch(console.error);
    } else {
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
        .then(async (list) => {
          const items = Array.isArray(list) ? list.slice(0, 3) : [];
          const fulls = await Promise.all(
            items.map((item) => item?.id ? getTechnicalCheckForm('trailer', item.id).catch(() => null) : Promise.resolve(null))
          );
          fulls.forEach((full, i) => trailers[i].setForm(full));
          const latestTrailerForms = trailers.map((t, i) => fulls[i] ?? t.form);
          checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, latestTrailerForms, adr.form, transportInterruption.form);
          checkAndAutoPublishCompound(driver.form, teammate.form, vehicle.form, latestTrailerForms, adr.form, transportInterruption.form);
          onDone?.();
        })
        .catch(console.error);
    }
  };

  const canEdit = isAdmin && form?.status !== 'deleted';

  const { subFormsAllConfirmedOrPublished } = getSubFormsStatus({ openTabs, driver, teammate, vehicle, trailers, adr, transportInterruption });
  const canDelete =
    hasPermission('control_form.delete') && form?.status !== 'deleted';
  const canConfirm =
    hasPermission('foreign_violation_form.write') &&
    hasPermission('control_form.view_unpublished') &&
    form?.status !== 'deleted' &&
    form?.status !== 'confirmed';

  const handleEditSaved = () => {
    setIsEditActive(true);
    setShowSavedAlert(true);
    setShowPublishedAlert(false);
    setTabErrors((p) => ({ ...p, 'tab-compound': false }));
    setShowConfirmedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    driver.setEditActive(false);
    teammate.setEditActive(false);
    vehicle.setEditActive(false);
    trailers.forEach((t) => t.setEditActive(false));
    adr.setEditActive(false);
    transportInterruption.setEditActive(false);
    setShowSavedAlert(false);
    setShowPublishedAlert(false);
    setShowConfirmedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handlePublished = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const {
    formik,
    structureUnits,
    orgOptions,
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
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    triggerConfirm,
    triggerPublish,
    triggerSaveAsSaved,
    triggerSaveWithCurrentStatus,
  } = useCompoundForm(
    form ?? undefined,
    handleEditSaved,
    handleConfirmed,
    subFormsAllConfirmedOrPublished,
    () => { setVersionsRefreshKey((k) => k + 1); refetch(); },
    handlePublished,
  );

  const checkAndAutoConfirmCompound = makeCheckAndAutoConfirm({ compoundForm: form, triggerConfirm });
  const checkAndAutoPublishCompound = makeCheckAndAutoPublish({ compoundForm: form, triggerPublish });

  const resetCompoundFormToSaved = () => {
    if (!form || form.status !== 'confirmed') return;
    if (isEditActive) return;
    triggerSaveAsSaved();
  };

  const addableTabs = ALL_FORM_TABS.filter((tab) => !openTabs.includes(tab.tabId));

  const handleAddTab = (tabId: 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | `tab-trailer-technical-check-${number}` | 'tab-adr' | 'tab-transport-interruption') =>
    addTab(tabId, { driver, teammate, vehicle, trailers, adr, transportInterruption, setOpenTabs, setActiveTab });

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
    navigateAfterRemove: () => navigate(`/control-forms/compound/${id}`),
    onEditActiveChange: setIsEditActive,
    onTrailerRemoved: (index: number) => formik.setFieldValue('trailers', formik.values.trailers.filter((_: Trailer, i: number) => i !== index)),
    onTrailerRemovedSave: () => triggerSaveWithCurrentStatus(),
  });

  const anyEditActive = isEditActive || driver.editActive || teammate.editActive || vehicle.editActive || trailers.some((t) => t.editActive) || adr.editActive || transportInterruption.editActive;

  const handleCancelAllEdits = () =>
    cancelAllEdits({ setCompoundEditActive: setIsEditActive, driver, teammate, vehicle, trailers, adr, transportInterruption });

  const handleSaveAll = createSaveAllHandler({
    activeTab,
    setTabErrors,
    setValidatedTabs,
    compoundEditActive: isEditActive,
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
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!vehicle.form) resetCompoundFormToSaved(); refetchTechCheck('vehicle', undefined, () => { vehicle.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      ...trailers.map((trailerHandle, idx) => ({
        tabId: `tab-trailer-technical-check-${idx}`,
        subForm: trailerHandle as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft: unknown) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!trailerHandle.form) resetCompoundFormToSaved(); refetchTechCheck('trailer', idx, () => { trailerHandle.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      })),
      {
        tabId: 'tab-driver',
        subForm: driver as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(draft as Partial<DriveRestForm> & Record<string, unknown>, driver.form?.status === 'confirmed' ? 'confirmed' : 'saved');
          saveDriveRestForm('driver', serialized as unknown as DriveRestForm).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!driver.form) resetCompoundFormToSaved(); refetchDriveRest('driver', () => { driver.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-teammate',
        subForm: teammate as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(draft as Partial<DriveRestForm> & Record<string, unknown>, teammate.form?.status === 'confirmed' ? 'confirmed' : 'saved');
          saveDriveRestForm('teammate', serialized as unknown as DriveRestForm).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!teammate.form) resetCompoundFormToSaved(); refetchDriveRest('teammate', () => { teammate.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-adr',
        subForm: adr as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createAdrValidationSchema(t) as ReturnType<typeof createAdrValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as AdrForm;
          const isBlank = (obj: Record<string, unknown>) => Object.values(obj).every((v) => v == null || v === '');
          const payload = {
            ...d,
            driverAssistant: d.driverAssistant && !isBlank(d.driverAssistant as Record<string, unknown>) ? JSON.stringify(d.driverAssistant) : '',
            lastLoadAddress: d.lastLoadAddress && !isBlank(d.lastLoadAddress as Record<string, unknown>) ? JSON.stringify(d.lastLoadAddress) : '',
            nextLoadAddress: d.nextLoadAddress && !isBlank(d.nextLoadAddress as Record<string, unknown>) ? JSON.stringify(d.nextLoadAddress) : '',
            dangerousGoods: JSON.stringify(d.dangerousGoods ?? []),
            infringements: JSON.stringify((d.infringements ?? []).filter((e) => !!(e as { checkStatus?: string }).checkStatus)),
            correctiveMeasures: JSON.stringify(d.correctiveMeasures ?? []),
          } as unknown as AdrForm;
          saveAdrForm(payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!adr.form) resetCompoundFormToSaved();
          refetchAdr(() => {
            adr.resetDraft();
          }); handleSubformEditActive(); }).catch(console.error);
        },
      },
      {
        tabId: 'tab-transport-interruption',
        subForm: transportInterruption as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: undefined,
        fallbackSave: (draft) => {
          const d = draft as TransportInterruptionForm;
          const payload = {
            ...d,
            legalBases: JSON.stringify(d.legalBases ?? [])
          } as unknown as TransportInterruptionForm;
          saveTransportInterruptionForm(payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!transportInterruption.form) resetCompoundFormToSaved(); refetchTransportInterruption(() => { transportInterruption.resetDraft(); }); handleSubformEditActive(); }).catch(console.error);
        },
      },
    ],
  });

  useEffect(() => {
    if (!snapshotId) return;
    setSnapshotLoading(true);
    getCompoundFormSnapshot(snapshotId, id!)
      .then((res) => {
        const data = Array.isArray(res) ? res[0] : res;
        setSnapshot(data);
        if (data?.county) handleCountyChange();
        if (data?.companyCounty) handleCompanyCountyChange();
      })
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteCompoundForm(id, form.formNumber, form.status ?? '');
      navigate('/', { state: { justCreated: true } });
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleDeleteAll = useDeleteAllSubForms({ driver, teammate, vehicle, trailers, adr, transportInterruption, compoundForm: form });

  const { canPublish: canPublishSubforms,  canConfirm: canConfirmSubform } = useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailers, adr, transportInterruption });

  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!snapshot) return <Text>{t('common.error')}</Text>;
    return (
      <div>
        <Button
          visualType="link"
          onClick={() => navigate(`/control-forms/compound/${id}`)}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>
        <CompoundFormViewCard
          form={snapshot}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          roads={roads}
          trailerCategories={trailerCategories}
          vehicleCategories={vehicleCategories}
          counties={counties}
          citiesParishes={citiesParishes}
          companyCitiesParishes={companyCitiesParishes}
          canEdit={false}
          onEdit={() => {}}
          isSnapshot
          formType={FORM_TYPE.COMPOUND}
        />
      </div>
    );
  }

  if (loading && !form) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!form) return <Text>{t('common.error')}</Text>;

  const sharedProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads: roads,
    trailerCategories: trailerCategories,
    vehicleCategories: vehicleCategories,
    counties: counties,
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as {
      id: number;
      name: string;
    }[],
  };

  const editCardProps = {
    formik,
    ...sharedProps,
    canConfirm,
    canDelete,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    handleOrgChange,
    handleStructuralUnitChange,
    handleCountyChange,
    handleCompanyCountyChange,
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    onCancel: () => { formik.resetForm(); setIsEditActive(false); },
    onConfirm: triggerConfirm,
    onDelete: handleDelete,
    formType: FORM_TYPE.COMPOUND,
    versionsRefreshKey,
    trailerFormRegNrs: trailers.map((t, i) => openTabs.includes(`tab-trailer-technical-check-${i}`) ? (t.form?.trailerRegNr ?? formik.values.trailers[i]?.regNr ?? '') : null),
    onAddTrailerControlForm: (index: number) => handleAddTab(`tab-trailer-technical-check-${index}`),
    onEditTrailerControlForm: (index: number) => setActiveTab(`tab-trailer-technical-check-${index}`),
    onRemoveTrailer: (index: number) => handleRemoveTrailerFromCompound(`tab-trailer-technical-check-${index}` as Parameters<typeof handleRemove>[0]),
  };

  const canDeleteAll =
    hasPermission('control_form.delete') &&
    ((driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (vehicle.form != null && vehicle.form.status !== 'deleted') ||
      trailers.some((t) => t.form != null && t.form.status !== 'deleted') ||
      (adr.form != null && adr.form.status !== 'deleted') ||
      (transportInterruption.form != null && transportInterruption.form.status !== 'deleted') ||
      form?.status !== 'deleted');
  const hasSubForms = openTabs.length > 0;

  const addFormDropdown =
    canEdit && addableTabs.length > 0 && anyEditActive ? (
      <Dropdown width="max-content">
        <Dropdown.Trigger>
          <Button
            iconRight="keyboard_arrow_down"
            visualType="secondary"
            disabled={addableTabs.length === 0}
          >
            {t('desktop.addForm')}
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          {addableTabs.map((tab, index) => (
            <Dropdown.Item
              key={tab.tabId}
              index={index}
              onClick={() => handleAddTab(tab.tabId)}
            >
              {t(tab.labelKey)}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown>
    ) : null;

  if (!driver.loaded || !teammate.loaded || !vehicle.loaded || !trailers[0].loaded || !adr.loaded) return <Text>{t('common.loading')}</Text>;

  if (!hasSubForms) {
    return (
      <div>
        {showSavedAlert && (
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
            onClose={() => setShowConfirmedAlert(false)}
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
        {isEditActive ? (
          <CompoundFormEditCard {...editCardProps} />
        ) : (
          <CompoundFormViewCard
            form={form}
            {...sharedProps}
            canEdit={canEdit}
            onEdit={() => setIsEditActive(true)}
            formType={FORM_TYPE.COMPOUND}
            versionsRefreshKey={versionsRefreshKey}
          />
        )}
        <div className="page-actions mt-1">
          <div className="page-actions-buttons">
            {hasPermission('control_form.edit_locked') &&
              !isEditActive &&
              form?.status !== 'deleted' && (
                <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => setIsEditActive(true)}
                >
                  {t('common.edit')}
                </Button>
              )}
            {isEditActive && (
              <Button type="button" onClick={() => formik.handleSubmit()}>
                {t('common.save')}
              </Button>
            )}
            {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: containerWidth }}>
      <DeleteConfirmModal
        subForm={!removeTrailerFromCompound}
        trailerSubForm={removeTrailerFromCompound}
        isOpen={removeConfirmTab !== null}
        onClose={handleRemoveCancel}
        onDelete={handleRemoveConfirmed}
      />
      {showSavedAlert && !showConfirmedAlert && !showPublishedAlert && (
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

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.compound_form')} overflowMode="scroll">
          <Tabs.Trigger id="tab-compound">
            <span style={{ position: 'relative' }}>
              {t('forms.compound.generalPart')}
              {hasTabErrors('tab-compound') && <StatusIndicator type="danger" position="top-right" />}
            </span>
          </Tabs.Trigger>
          {(() => {
            const savedTrailersList: Trailer[] = Array.isArray(form?.trailers) ? (form.trailers as Trailer[]) : typeof form?.trailers === 'string' ? JSON.parse(form.trailers) : [];
            const compoundTrailerRegNrs = formik.values.trailers.map((tr: Trailer, i: number) => tr.regNr || savedTrailersList[i]?.regNr || '');
            const staticTabSubForms: Record<string, { form: unknown; editActive: boolean }> = {
              'tab-driver': driver,
              'tab-teammate': teammate,
              'tab-vehicle-technical-check': vehicle,
              'tab-adr': adr,
              'tab-transport-interruption': transportInterruption,
            };
            trailers.forEach((t, idx) => {
              staticTabSubForms[`tab-trailer-technical-check-${idx}`] = t;
            });
            const tabsWithStatus = openTabs.filter(
              (tid) => tid !== 'tab-compound' && staticTabSubForms[tid]?.form != null,
            ).length;
            const staticTabs = [
              'tab-driver',
              'tab-teammate',
              'tab-vehicle-technical-check',
              'tab-adr',
              'tab-transport-interruption',
            ] as const;
            const trailerTabIds = openTabs.filter((t) => t.startsWith('tab-trailer-technical-check-'));
            const allTabIds = [...staticTabs.filter((tid) => openTabs.includes(tid)), ...trailerTabIds];
            return allTabIds.map((tid) => {
              const subForm = staticTabSubForms[tid];
              const label =
                tid === 'tab-driver'
                  ? t('forms.sp_driver_form')
                  : tid === 'tab-teammate'
                    ? t('forms.sp_teammate_form')
                    : tid === 'tab-vehicle-technical-check'
                      ? t('forms.technical_check.vehicleTitle')
                      : tid.startsWith('tab-trailer-technical-check-')
                        ? (() => { const idx = Number(tid.replace('tab-trailer-technical-check-', '')); const regNr = compoundTrailerRegNrs[idx] || (trailers[idx]?.form as TechnicalCheckForm | null)?.trailerRegNr; return regNr ? `${t('forms.technical_check.trailerTitle')} (${regNr})` : t('forms.technical_check.trailerTitle'); })()
                        : tid === 'tab-transport-interruption'
                          ? t('forms.transport_interruption.title')
                          : t('forms.adr.title');
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
                alignSelf: 'center',
                marginRight: '1rem',
                paddingLeft: '1rem',
              }}
            >
              {addFormDropdown}
            </div>
          )}
        </Tabs.List>

        <Tabs.Content id="tab-compound" className="p-1">
          {isEditActive ? (
            <CompoundFormEditCard {...editCardProps} />
          ) : (
            <CompoundFormViewCard
              form={form}
              {...sharedProps}
              canEdit={canEdit}
              onEdit={() => setIsEditActive(true)}
              formType={FORM_TYPE.COMPOUND}
              versionsRefreshKey={versionsRefreshKey}
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
              canPublish={canPublishSubforms()}
              onPublish={() =>
                publishDriveRestForm('driver', form.id!).then(() =>
                  refetchDriveRest('driver'),
                )
              }
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              form={driver.draft ?? form}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-driver': false }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!driver.form) resetCompoundFormToSaved();
                refetchDriveRest('driver', () => {
                  driver.resetDraft();
                });
              }}
              onCancel={() => {
                driver.setEditActive(false);
                driver.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchDriveRest('driver', () => {
                  driver.setEditActive(false);
                  driver.resetDraft();
                });
              }}
              formType={FORM_TYPE.DRIVER}
              onValuesChange={(v) => {
                driver.setDraftValue({
                  ...(driver.draftRef.current ?? form ?? {}),
                  ...v,
                } as DriveRestForm);
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
              canPublish={canPublishSubforms()}
              onPublish={() =>
                publishDriveRestForm('teammate', form.id!).then(() =>
                  refetchDriveRest('teammate'),
                )
              }
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="teammate"
              form={teammate.draft ?? form}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-teammate': false }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!teammate.form) resetCompoundFormToSaved();
                refetchDriveRest('teammate', () => {
                  teammate.resetDraft();
                });
              }}
              onCancel={() => {
                teammate.setEditActive(false);
                teammate.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchDriveRest('teammate', () => {
                  teammate.setEditActive(false);
                  teammate.resetDraft();
                });
              }}
              formType={FORM_TYPE.TEAMMATE}
              onValuesChange={(v) => {
                teammate.setDraftValue({
                  ...(teammate.draftRef.current ?? form ?? {}),
                  ...v,
                } as DriveRestForm);
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
              canPublish={canPublishSubforms()}
              onPublish={() =>
                publishTechnicalCheckForm('vehicle', form.id!).then(() =>
                  refetchTechCheck('vehicle', undefined),
                )
              }
            />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="vehicle"
              form={vehicle.draft ?? form}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({
                  ...p,
                  'tab-vehicle-technical-check': false,
                }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!vehicle.form) resetCompoundFormToSaved();
                refetchTechCheck('vehicle', undefined, () => {
                  vehicle.resetDraft();
                });
              }}
              onCancel={() => {
                vehicle.setEditActive(false);
                vehicle.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchTechCheck('vehicle', undefined, () => {
                  vehicle.setEditActive(false);
                  vehicle.resetDraft();
                });
              }}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
              onValuesChange={(v) => {
                vehicle.setDraftValue({
                  ...(vehicle.draftRef.current ?? form),
                  ...v,
                } as TechnicalCheckForm);
              }}
              initialValidate={validatedTabs.has('tab-vehicle-technical-check')}
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
                canPublish={canPublishSubforms()}
                onPublish={() =>
                  publishTechnicalCheckForm('trailer', form.id!).then(() =>
                    refetchTechCheck('trailer', idx),
                  )
                }
              />
            )}
            renderEdit={(form, ref) => (
              <TechnicalCheckFormEditCard
                ref={ref}
                scope="trailer"
                form={trailerHandle.draft ?? form}
                compoundFormKey={Number(id)}
                compoundTrailers={formik.values.trailers}
                trailerIndex={idx}
                onSaved={() => {
                  setTabErrors((p) => ({
                    ...p,
                    [`tab-trailer-technical-check-${idx}`]: false,
                  }));
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  if (!trailerHandle.form) resetCompoundFormToSaved();
                  refetchTechCheck('trailer', idx, () => {
                    trailerHandle.resetDraft();
                  });
                }}
                onCancel={() => {
                  trailerHandle.setEditActive(false);
                  trailerHandle.resetDraft();
                }}
                canConfirm={canConfirmSubform()}
                onConfirm={() => {
                  refetchTechCheck('trailer', idx, () => {
                    trailerHandle.setEditActive(false);
                    trailerHandle.resetDraft();
                  });
                }}
                formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
                onValuesChange={(v) => {
                  trailerHandle.setDraftValue({
                    ...(trailerHandle.draftRef.current ?? form),
                    ...v,
                  } as TechnicalCheckForm);
                }}
                initialValidate={validatedTabs.has(`tab-trailer-technical-check-${idx}`)}
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
              formType="adr-form"
              canPublish={canPublishSubforms()}
              onPublish={() =>
                publishAdrForm(form.id!).then(() => refetchAdr())
              }
            />
          )}
          renderEdit={(form, ref) => (
            <AdrFormEditCard
              ref={ref}
              form={adr.draft ?? form}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-adr': false }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!adr.form) resetCompoundFormToSaved();
                refetchAdr(() => {
                  adr.resetDraft();
                });
              }}
              onCancel={() => {
                adr.setEditActive(false);
                adr.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchAdr(() => {
                  adr.setEditActive(false);
                  adr.resetDraft();
                });
              }}
              formType="adr-form"
              onValuesChange={(v) => {
                adr.setDraftValue({
                  ...(adr.draftRef.current ?? form),
                  ...v,
                } as AdrForm);
              }}
              initialValidate={validatedTabs.has('tab-adr')}
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
              canPublish={canPublishSubforms()}
              onPublish={() =>
                publishTransportInterruptionForm(form.id!).then(() =>
                  refetchTransportInterruption(),
                )
              }
            />
          )}
          renderEdit={(form, ref) => (
            <TransportInterruptionFormEditCard
              ref={ref}
              form={transportInterruption.draft ?? form}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({
                  ...p,
                  'tab-transport-interruption': false,
                }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!transportInterruption.form) resetCompoundFormToSaved();
                refetchTransportInterruption(() => {
                  transportInterruption.resetDraft();
                });
              }}
              onCancel={() => {
                transportInterruption.setEditActive(false);
                transportInterruption.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchTransportInterruption(() => {
                  transportInterruption.setEditActive(false);
                  transportInterruption.resetDraft();
                });
              }}
              formType={FORM_TYPE.TRANSPORT_INTERRUPTION}
              onValuesChange={(v) => {
                transportInterruption.setDraftValue({
                  ...(transportInterruption.draftRef.current ?? form),
                  ...v,
                } as TransportInterruptionForm);
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
            form?.status !== 'deleted' && (
              <Button
                iconLeft="edit"
                type="button"
                visualType="secondary"
                onClick={() => {
                  setIsEditActive(true);
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                  if (vehicle.form) vehicle.setEditActive(true);
                  trailers.forEach((tr) => { if (tr.form) tr.setEditActive(true); });
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
          {anyEditActive && canDeleteAll && (
            <DeleteConfirmModal onDelete={handleDeleteAll} />
          )}
        </div>
      </div>
    </div>
  );
}
