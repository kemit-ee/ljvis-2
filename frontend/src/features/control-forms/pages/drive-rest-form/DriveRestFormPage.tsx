import { useEffect, useState, useRef } from 'react';
import { useContainerWidth } from '../../../../hooks/useContainerWidth';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useCompoundForm } from '../compound-form/useCompoundForm';
import { useCompoundFormDetail } from '../compound-form/useCompoundFormDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import {
  ALL_FORM_TABS,
  BREAKPOINTS,
  FORM_TYPE,
} from '../../../../constants/constants';
import {
  getDriveRestForm,
  getDriveRestFormByCompoundFormKey,
  saveDriveRestForm,
  getDriveRestFormSnapshot,
  listAdrFormsByCompoundFormKey,
  getAdrForm,
  saveAdrForm,
  listTransportInterruptionFormsByCompoundFormKey,
  getTransportInterruptionForm,
  saveTransportInterruptionForm,
} from '../../api';
import {
  serializeDriveRestFormValues,
  createDriveRestValidationSchema,
} from './useDriveRestForm';
import type { DriveRestForm, TechnicalCheckForm, AdrForm, TransportInterruptionForm, TransportInterruptionFormListItem } from '../../types';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard';
import {
  DriveRestFormEditCard,
  type DriveRestFormEditCardRef,
} from '../../components/DriveRestForm/DriveRestFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { createSaveAllHandler } from '../../hooks/createSaveAllHandler';
import { useSubForm, type SubFormHandle } from '../../hooks/useSubForm';
import { TechnicalCheckFormViewCard } from '../../components/TechnicalCheckForm/TechnicalCheckFormViewCard';
import { TechnicalCheckFormEditCard, type TechnicalCheckFormEditCardRef } from '../../components/TechnicalCheckForm/TechnicalCheckFormEditCard';
import { AdrFormViewCard } from '../../components/AdrForm/AdrFormViewCard';
import { AdrFormEditCard, type AdrFormEditCardRef } from '../../components/AdrForm/AdrFormEditCard';
import { TransportInterruptionFormViewCard } from '../../components/TransportInterruptionForm/TransportInterruptionFormViewCard';
import { TransportInterruptionFormEditCard, type TransportInterruptionFormEditCardRef } from '../../components/TransportInterruptionForm/TransportInterruptionFormEditCard';
import { listTechnicalCheckFormsByCompoundFormKey, getTechnicalCheckForm, saveTechnicalCheckForm } from '../../api';
import { createTechnicalCheckValidationSchema } from '../technical-check-form/useTechnicalCheckForm';
import { createAdrValidationSchema } from '../adr-form/useAdrForm';
import { useSubFormEditActive, makeCheckAndAutoConfirm, useSubFormPermissions, subFormsAllConfirmed as getSubFormsStatus, addTab, useDeleteAllSubForms, useRemoveSubFormTab, cancelAllEdits } from '../../hooks/useSubFormEditActive';
import { AsyncButton } from '../../../../shared/components/AsyncButton.tsx';

interface DriveRestFormPageProps {
  entryType: 'driver' | 'teammate';
}

export function DriveRestFormPage({ entryType }: DriveRestFormPageProps) {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const canEdit = hasPermission('compound_form.write');

  const [compoundFormKey, setCompoundFormKey] = useState<number | undefined>(
    undefined,
  );
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const isFetching = useRef(false);

  const [activeTab, setActiveTab] = useState(
    entryType === 'driver' ? 'tab-driver' : 'tab-teammate',
  );
  const [openTabs, setOpenTabs] = useState<string[]>(
    entryType === 'driver' ? ['tab-driver'] : ['tab-teammate'],
  );
  const [compoundEditActive, setCompoundEditActive] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [compoundVersionsRefreshKey, setCompoundVersionsRefreshKey] =
    useState(0);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const vehicle = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'vehicle_technical_form' });
  const trailer = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_driver_form' });
  const teammate = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_teammate_form' });
  const adr = useSubForm<AdrForm, AdrFormEditCardRef>({ permPrefix: 'adr_form' });
  const transportInterruption = useSubForm<TransportInterruptionForm, TransportInterruptionFormEditCardRef>({ permPrefix: 'transport_interruption_form' });

  const { canEdit: canEditSubForms, canConfirm } = useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailer, adr, transportInterruption });

  const forbidden = !(
    ((entryType === 'driver' && hasPermission('sp_driver_form.read')) ||
      (entryType === 'teammate' && hasPermission('sp_teammate_form.read')) ||
      hasPermission('control_form.view_unpublished')) &&
    hasPermission('classifier.read')
  );

  const [snapshot, setSnapshot] = useState<
    import('../../types').DriveRestForm | null
  >(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  const hasTabErrors = (tabId: string) => {
    if (!validatedTabs.has(tabId)) return false;
    return tabErrors[tabId] ?? false;
  };

  const handleSubformEditActive = useSubFormEditActive({ driver, teammate, vehicle, trailer, adr, transportInterruption, hasPermission });

  const containerWidth = useContainerWidth(isDesktop, openTabs);

  useEffect(() => {
    if (!snapshotId) return;
    setSnapshotLoading(true);
    getDriveRestFormSnapshot(entryType, snapshotId, id!)
      .then((res) => {
        const data = Array.isArray(res) ? res[0] : res;
        setSnapshot(data);
      })
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  const handleAddTab = (tabId: 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check' | 'tab-adr' | 'tab-transport-interruption') =>
    addTab(tabId, { driver, teammate, vehicle, trailer, adr, transportInterruption, setOpenTabs, setActiveTab });

  // Load vehicle and trailer technical check forms once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm('vehicle', item.id).catch(() => null) : null;
        vehicle.setForm(full);
        if (full) setOpenTabs((prev) => prev.includes('tab-vehicle-technical-check') ? prev : [...prev, 'tab-vehicle-technical-check']);
      })
      .catch(console.error)
      .finally(() => vehicle.setLoaded(true));

    listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm('trailer', item.id).catch(() => null) : null;
        trailer.setForm(full);
        if (full) setOpenTabs((prev) => prev.includes('tab-trailer-technical-check') ? prev : [...prev, 'tab-trailer-technical-check']);
      })
      .catch(console.error)
      .finally(() => trailer.setLoaded(true));

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

  const refetchTransportInterruption = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    listTransportInterruptionFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? (list as TransportInterruptionFormListItem[])[0] : null;
        const full = item?.id ? await getTransportInterruptionForm(item.id).catch(() => null) : null;
        transportInterruption.setForm(full ?? null);
        checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, trailer.form, adr.form, full);
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
        checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, trailer.form, full, transportInterruption.form);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTechCheck = (subForm: typeof vehicle, scope: 'vehicle' | 'trailer', onDone?: () => void) => {
    if (!compoundFormKey) return;
    listTechnicalCheckFormsByCompoundFormKey(scope, compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm(scope, item.id).catch(() => null) : null;
        subForm.setForm(full);
        const latestVehicle = scope === 'vehicle' ? full : vehicle.form;
        const latestTrailer = scope === 'trailer' ? full : trailer.form;
        checkAndAutoConfirmCompound(driver.form, teammate.form, latestVehicle, latestTrailer, adr.form, transportInterruption.form);
        onDone?.();
      })
      .catch(console.error);
  };

  // Load the sibling sub-form (driver <-> teammate) once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    if (entryType === 'driver' && !teammate.loaded) {
      getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
        .then((res) => teammate.setForm(res))
        .finally(() => teammate.setLoaded(true));
    }
    if (entryType === 'teammate' && !driver.loaded) {
      getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
        .then((res) => driver.setForm(res))
        .finally(() => driver.setLoaded(true));
    }
  }, [compoundFormKey, entryType, driver.loaded, teammate.loaded]);

  // Once the sibling sub-form is loaded and exists, show its tab automatically
  useEffect(() => {
    if (entryType !== 'driver' && driver.form) {
      setOpenTabs((prev) =>
        prev.includes('tab-driver') ? prev : [...prev, 'tab-driver'],
      );
    }
    if (entryType !== 'teammate' && teammate.form) {
      setOpenTabs((prev) =>
        prev.includes('tab-teammate') ? prev : [...prev, 'tab-teammate'],
      );
    }
  }, [driver.form, teammate.form, entryType]);

  const addableTabs = ALL_FORM_TABS.filter((tab) => !openTabs.includes(tab.tabId));

  const anyEditActive = vehicle.editActive || trailer.editActive || driver.editActive || teammate.editActive || adr.editActive || transportInterruption.editActive || compoundEditActive;

  const handleCancelAllEdits = () =>
    cancelAllEdits({ setCompoundEditActive, driver, teammate, vehicle, trailer, adr, transportInterruption });

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

  // Load the entry sub-form first to discover the compound form key
  useEffect(() => {
    if (!id) return;
    if (isFetching.current) return;
    isFetching.current = true;
    setLoadingEntry(true);
    getDriveRestForm(entryType, Number(id))
      .then((res) => {
        if (!res || !res.compoundFormKey || res.status === 'deleted') {
          setLoadError(true);
          return;
        }
        setCompoundFormKey(Number(res.compoundFormKey));
        if (entryType === 'driver') {
          driver.setForm(res);
          driver.setLoaded(true);
        } else {
          teammate.setForm(res);
          teammate.setLoaded(true);
        }
      })
      .catch((e) => {
        console.error('Failed to load form', e);
        setLoadError(true);
      })
      .finally(() => setLoadingEntry(false));
  }, [id, entryType]);

  const {
    form: compoundForm,
    loading: compoundLoading,
    refetch: refetchCompound,
  } = useCompoundFormDetail(
    compoundFormKey ? String(compoundFormKey) : undefined,
    id ? Number(id) : undefined,
  );

  const refetchCompoundRef = useRef(refetchCompound);
  useEffect(() => {
    refetchCompoundRef.current = refetchCompound;
  }, [refetchCompound]);

  const handleCompoundSaved = () => {
    setShowSavedAlert(true);
    const openSubForms = [
      openTabs.includes('tab-driver') ? driver.form : null,
      openTabs.includes('tab-teammate') ? teammate.form : null,
      openTabs.includes('tab-vehicle-technical-check') ? vehicle.form : null,
      openTabs.includes('tab-trailer-technical-check') ? trailer.form : null,
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
    driver.setEditActive(driver.form?.status === 'saved');
    teammate.setEditActive(teammate.form?.status === 'saved');
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const resetCompoundFormToSaved = () => {
    if (!compoundForm || compoundForm.status !== 'confirmed') return;
    triggerCompoundSaveAsSaved();
  };

  const { subFormsAllConfirmed } = getSubFormsStatus({ openTabs, driver, teammate, vehicle, trailer, adr, transportInterruption });

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
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    triggerConfirm: triggerConfirmCompound,
    triggerSaveAsSaved: triggerCompoundSaveAsSaved,
  } = useCompoundForm(
    compoundForm ?? undefined,
    handleCompoundSaved,
    handleCompoundConfirmed,
    subFormsAllConfirmed,
    () => {
      refetchCompoundRef.current();
    },
  );

  useEffect(() => {
    if (compoundForm?.status !== undefined) {
      setCompoundEditActive(
        compoundForm.status === 'saved' &&
          hasPermission('compound_form.write'),
      );
    }
  }, [compoundForm?.status]);

  const checkAndAutoConfirmCompound = makeCheckAndAutoConfirm({ compoundForm, triggerConfirm: triggerConfirmCompound });

  const { removeConfirmTab, setRemoveConfirmTab, handleRemove, handleRemoveConfirmed } = useRemoveSubFormTab({
    driver,
    teammate,
    vehicle,
    trailer,
    adr,
    transportInterruption,
    setOpenTabs,
    setActiveTab,
    checkAndAutoConfirm: checkAndAutoConfirmCompound,
    navigateAfterRemove: () => navigate(`/control-forms/compound/${compoundFormKey}`),
  });

  const canDelete =
    hasPermission('control_form.delete') &&
    ((driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (compoundForm != null && compoundForm.status !== 'deleted') ||
      (vehicle.form != null && vehicle.form.status !== 'deleted') ||
      (trailer.form != null && trailer.form.status !== 'deleted') ||
      (transportInterruption.form != null && transportInterruption.form.status !== 'deleted')
    );

  const handleDelete = useDeleteAllSubForms({ driver, teammate, vehicle, trailer, adr, transportInterruption, compoundForm });

  const handleSaveAll = createSaveAllHandler({
    activeTab,
    setTabErrors,
    setValidatedTabs,
    compoundEditActive,
    onCompoundSave: () => formik.handleSubmit(),
    subForms: [
      {
        tabId: 'tab-vehicle-technical-check',
        subForm: vehicle as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(vehicle, 'vehicle', () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-trailer-technical-check',
        subForm: trailer as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(trailer, 'trailer', () => { trailer.draftRef.current = null; trailer.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-driver',
        subForm: driver as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(
            draft as Partial<DriveRestForm> & Record<string, unknown>,
            driver.form?.status === 'confirmed' ? 'confirmed' : 'saved',
          );
          saveDriveRestForm('driver', serialized as unknown as DriveRestForm)
            .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchDriver(() => { driver.draftRef.current = null; driver.setDraft(null); }); handleSubformEditActive();})
            .catch(console.error);
        },
      },
      {
        tabId: 'tab-teammate',
        subForm: teammate as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createDriveRestValidationSchema(t) as ReturnType<typeof createDriveRestValidationSchema>,
        fallbackSave: (draft) => {
          const serialized = serializeDriveRestFormValues(
            draft as Partial<DriveRestForm> & Record<string, unknown>,
            teammate.form?.status === 'confirmed' ? 'confirmed' : 'saved',
          );
          saveDriveRestForm('teammate', serialized as unknown as DriveRestForm)
            .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTeammate(() => { teammate.draftRef.current = null; teammate.setDraft(null); }); handleSubformEditActive();})
            .catch(console.error);
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


  const refetchDriver = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
      .then((res) => {
        driver.setForm(res);
        getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
          .then((tm) => {
            checkAndAutoConfirmCompound(res, tm, vehicle.form, trailer.form, adr.form, transportInterruption.form);
          })
          .catch(console.error);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTeammate = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
      .then((res) => {
        teammate.setForm(res);
        getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
          .then((dr) => {
            checkAndAutoConfirmCompound(dr, res, vehicle.form, trailer.form, adr.form, transportInterruption.form);
          })
          .catch(console.error);
        onDone?.();
      })
      .catch(console.error);
  };

  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!snapshot) return <Text>{t('common.error')}</Text>;
    return (
      <div>
        {entryType === 'driver' ? (
          <div>
            <Button
              visualType="link"
              onClick={() => navigate(`/control-forms/sp-driver/${id}`)}
              iconLeft="arrow_back"
            >
              {t('common.back')}
            </Button>
            <DriveRestFormViewCard
              scope="driver"
              form={snapshot}
              canEdit={false}
              onEdit={() => {}}
              formType={FORM_TYPE.DRIVER}
            />
          </div>
        ) : (
          <div>
            <Button
              visualType="link"
              onClick={() => navigate(`/control-forms/sp-teammate/${id}`)}
              iconLeft="arrow_back"
            >
              {t('common.back')}
            </Button>
            <DriveRestFormViewCard
              scope="teammate"
              form={snapshot}
              canEdit={false}
              onEdit={() => {}}
              formType={FORM_TYPE.TEAMMATE}
            />
          </div>
        )}
      </div>
    );
  }

  if (loadingEntry) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (loadError || !compoundFormKey) return <Text>{t('common.error')}</Text>;

  const sharedCompoundProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads: roads,
    trailerCategories: trailerCategories,
    vehicleCategories: vehicleCategories,
    counties: counties,
    citiesParishes: citiesParishes,
    companyCitiesParishes: companyCitiesParishes,
  };

  return (
    <div style={{ maxWidth: containerWidth }}>
      <DeleteConfirmModal
        subForm
        isOpen={removeConfirmTab !== null}
        onClose={() => setRemoveConfirmTab(null)}
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
            {t('forms.compound.generalPart')}
          </Tabs.Trigger>
          {(() => {
            const tabSubForms: Record<
              string,
              { form: unknown; editActive: boolean }
            > = {
              'tab-driver': driver,
              'tab-teammate': teammate,
              'tab-vehicle-technical-check': vehicle,
              'tab-trailer-technical-check': trailer,
              'tab-adr': adr,
              'tab-transport-interruption': transportInterruption,
            };
            const tabsWithStatus = openTabs.filter(
              (tid) => tid !== 'tab-compound' && tabSubForms[tid]?.form != null,
            ).length;
            return (
              [
                'tab-driver',
                'tab-teammate',
                'tab-vehicle-technical-check',
                'tab-trailer-technical-check',
                'tab-adr',
                'tab-transport-interruption',
              ] as const
            ).map((tid) => {
              if (!openTabs.includes(tid)) return null;
              const subForm = tabSubForms[tid];
              const label =
                tid === 'tab-driver'
                  ? t('forms.sp_driver_form')
                  : tid === 'tab-teammate'
                    ? t('forms.sp_teammate_form')
                    : tid === 'tab-vehicle-technical-check'
                      ? t('forms.technical_check.vehicleTitle')
                      : tid === 'tab-adr'
                        ? t('forms.adr.title')
                        : tid === 'tab-transport-interruption'
                          ? t('forms.transport_interruption.title')
                          : t('forms.technical_check.trailerTitle');
              return (
                <Tabs.Trigger key={tid} id={tid}>
                  <span style={{ position: 'relative' }}>
                    {label}
                    {hasTabErrors(tid) && (
                      <StatusIndicator type="danger" position="top-right" />
                    )}
                  </span>
                  {subForm.editActive &&
                    (tabsWithStatus > 1 || !subForm.form) && (
                      <ClosingButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(tid);
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
            />
          ) : (
            <CompoundFormViewCard
              form={compoundForm}
              {...sharedCompoundProps}
              canEdit={canEdit && compoundForm.status !== 'deleted'}
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
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => driver.setEditActive(true)}
              formType={FORM_TYPE.DRIVER}
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              form={driver.draft ?? form}
              compoundFormKey={compoundFormKey}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-driver': false }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!driver.form) resetCompoundFormToSaved();
                refetchDriver(() => {
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
                  ...(driver.draftRef.current ?? form ?? {}),
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
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => teammate.setEditActive(true)}
              formType={FORM_TYPE.TEAMMATE}
            />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="teammate"
              form={teammate.draft ?? form}
              compoundFormKey={compoundFormKey}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-teammate': false }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!teammate.form) resetCompoundFormToSaved();
                refetchTeammate(() => {
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
                  ...(teammate.draftRef.current ?? form ?? {}),
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
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => vehicle.setEditActive(true)}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
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
                setTabErrors((p) => ({
                  ...p,
                  'tab-vehicle-technical-check': false,
                }));
                refetchTechCheck(vehicle, 'vehicle', () => {
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
              initialValidate={validatedTabs.has('tab-vehicle-technical-check')}
            />
          )}
        />

        <SubFormTab
          id="tab-trailer-technical-check"
          open={openTabs.includes('tab-trailer-technical-check')}
          subForm={trailer}
          renderView={(form) => (
            <TechnicalCheckFormViewCard
              scope="trailer"
              form={form}
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => trailer.setEditActive(true)}
              formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
            />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="trailer"
              form={trailer.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                setTabErrors((p) => ({
                  ...p,
                  'tab-trailer-technical-check': false,
                }));
                refetchTechCheck(trailer, 'trailer', () => {
                  trailer.draftRef.current = null;
                  trailer.setDraft(null);
                });
              }}
              onCancel={() => {
                trailer.setEditActive(false);
                trailer.draftRef.current = null;
                trailer.setDraft(null);
              }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
              onValuesChange={(v) => {
                const next = {
                  ...(trailer.draftRef.current ?? form),
                  ...v,
                } as TechnicalCheckForm;
                trailer.draftRef.current = next;
                trailer.setDraft(next);
              }}
              initialValidate={validatedTabs.has('tab-trailer-technical-check')}
            />
          )}
        />

        <SubFormTab
          id="tab-adr"
          open={openTabs.includes('tab-adr')}
          subForm={adr}
          renderView={(form) => (
            <AdrFormViewCard
              form={form}
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => adr.setEditActive(true)}
              formType={FORM_TYPE.ADR}
            />
          )}
          renderEdit={(form, ref) => (
            <AdrFormEditCard
              ref={ref}
              form={adr.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => {
                setTabErrors((p) => ({ ...p, 'tab-adr': false }));
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
              canEdit={canEditSubForms() && form.status !== 'deleted'}
              onEdit={() => transportInterruption.setEditActive(true)}
              formType={FORM_TYPE.TRANSPORT_INTERRUPTION}
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
          {hasPermission('control_form.edit_locked') &&
            !compoundEditActive &&
            !driver.editActive &&
            !teammate.editActive &&
            compoundForm?.status !== 'deleted' && (
              <Button
                iconLeft="edit"
                type="button"
                visualType="secondary"
                onClick={() => {
                  setCompoundEditActive(true);
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                  if (vehicle.form) vehicle.setEditActive(true);
                  if (trailer.form) trailer.setEditActive(true);
                  if (adr.form) adr.setEditActive(true);
                  if (transportInterruption.form)
                    transportInterruption.setEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {anyEditActive && subFormsAllConfirmed && (
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
