import { useEffect, useState, useRef } from 'react';
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
  deleteDriveRestForm,
  deleteCompoundForm,
  updateDriveRestForm,
  getDriveRestFormSnapshot,
  deleteTechnicalCheckForm,
} from '../../api';
import {
  serializeDriveRestFormValues,
  createDriveRestValidationSchema,
} from './useDriveRestForm';
import type { DriveRestForm, TechnicalCheckForm } from '../../types';
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
import { listTechnicalCheckFormsByCompoundFormKey, getTechnicalCheckForm, saveTechnicalCheckForm } from '../../api';
import { createTechnicalCheckValidationSchema } from '../technical-check-form/useTechnicalCheckForm';

interface DriveRestFormPageProps {
  entryType: 'driver' | 'teammate';
}

export function DriveRestFormPage({ entryType }: DriveRestFormPageProps) {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const canEdit = hasPermission('foreign_violation_form.write');

  const [compoundFormKey, setCompoundFormKey] = useState<number | undefined>(
    undefined,
  );
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const isFetching = useRef(false);
  const [removeConfirmTab, setRemoveConfirmTab] = useState<'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check' | null>(null);

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

  const forbidden = !(
    ((entryType === 'driver' && hasPermission('sp_driver_form.read')) ||
      (entryType === 'teammate' && hasPermission('sp_teammate_form.read'))) &&
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

  useEffect(() => {
    const anySubFormSaved =
      driver.form?.status === 'saved' || teammate.form?.status === 'saved';
    if (anySubFormSaved) {
      if (driver.form)
        driver.setEditActive(
          hasPermission('sp_driver_form.write') ||
            !hasPermission('sp_driver_form.read')
        );
      if (teammate.form)
        teammate.setEditActive(
          hasPermission('sp_teammate_form.write') ||
            !hasPermission('sp_teammate_form.read')
        );
    } else {
      if (driver.form?.status !== undefined)
        driver.setEditActive(driver.form.status === 'saved');
      if (teammate.form?.status !== undefined)
        teammate.setEditActive(teammate.form.status === 'saved');
    }
  }, [driver.form?.status, teammate.form?.status]);

  const addTab = (tabId: 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check') => {
    setOpenTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
    if (tabId === 'tab-driver') { driver.setLoaded(true); driver.setEditActive(true); }
    if (tabId === 'tab-teammate') { teammate.setLoaded(true); teammate.setEditActive(true); }
    if (tabId === 'tab-vehicle-technical-check') { vehicle.setLoaded(true); vehicle.setEditActive(true); }
    if (tabId === 'tab-trailer-technical-check') { trailer.setLoaded(true); trailer.setEditActive(true); }
    setActiveTab(tabId);
  };

  // Load vehicle and trailer technical check forms once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm('vehicle', item.id).catch(() => null) : null;
        vehicle.setForm(full);
        if (full) setOpenTabs((prev) => prev.includes('tab-vehicle-technical-check') ? prev : [...prev, 'tab-vehicle-technical-check']);
        if (full?.status === 'saved') vehicle.setEditActive(true);
      })
      .catch(console.error)
      .finally(() => vehicle.setLoaded(true));

    listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm('trailer', item.id).catch(() => null) : null;
        trailer.setForm(full);
        if (full) setOpenTabs((prev) => prev.includes('tab-trailer-technical-check') ? prev : [...prev, 'tab-trailer-technical-check']);
        if (full?.status === 'saved') trailer.setEditActive(true);
      })
      .catch(console.error)
      .finally(() => trailer.setLoaded(true));
  }, [compoundFormKey]);

  const refetchTechCheck = (subForm: typeof vehicle, scope: 'vehicle' | 'trailer', onDone?: () => void) => {
    if (!compoundFormKey) return;
    listTechnicalCheckFormsByCompoundFormKey(scope, compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm(scope, item.id).catch(() => null) : null;
        subForm.setForm(full);
        if (full?.status === 'saved') subForm.setEditActive(true);
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

  const anyEditActive = vehicle.editActive || trailer.editActive || driver.editActive || teammate.editActive || compoundEditActive;

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
              onClick={() => addTab(tab.tabId)}
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
        if (!res || !res.compoundFormKey) {
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

  const subFormsAllConfirmed = [driver.form, teammate.form]
    .filter(Boolean)
    .every((f) => f?.status === 'confirmed');

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

  const handleRemove = (tabId: 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check') => {
    const subForm = tabId === 'tab-driver' ? driver : tabId === 'tab-teammate' ? teammate : tabId === 'tab-vehicle-technical-check' ? vehicle : trailer;
    if (!subForm.form || subForm.form.status === undefined) {
      setOpenTabs((prev) => prev.filter((t) => t !== tabId));
      subForm.setForm(null);
      subForm.setEditActive(false);
      setActiveTab('tab-compound');
      return;
    }
    setRemoveConfirmTab(tabId);
  };

  const handleRemoveConfirmed = async () => {
    if (!removeConfirmTab) return;
    const tab = removeConfirmTab;
    setRemoveConfirmTab(null);
    if (tab === 'tab-driver' || tab === 'tab-teammate') {
      const scope = tab === 'tab-driver' ? 'driver' : 'teammate';
      const subForm = tab === 'tab-driver' ? driver : teammate;
      if (subForm.form?.id && subForm.form?.subFormNumber) {
        try {
          await deleteDriveRestForm(scope, String(subForm.form.id), subForm.form.subFormNumber, subForm.form.status ?? '');
        } catch (e) {
          console.error('Delete sub-form failed', e);
          return;
        }
      }
      subForm.setForm(null);
      subForm.setEditActive(false);
    } else {
      const scope = tab === 'tab-vehicle-technical-check' ? 'vehicle' : 'trailer';
      const subForm = tab === 'tab-vehicle-technical-check' ? vehicle : trailer;
      if (subForm.form?.id && subForm.form?.subFormNumber) {
        try {
          await deleteTechnicalCheckForm(scope, String(subForm.form.id), subForm.form.subFormNumber, subForm.form.status ?? '');
        } catch (e) {
          console.error('Delete sub-form failed', e);
          return;
        }
      }
      subForm.setForm(null);
      subForm.setEditActive(false);
    }
    setOpenTabs((prev) => prev.filter((t) => t !== tab));
    setActiveTab('tab-compound');
    navigate(`/control-forms/compound/${compoundFormKey}`);
  };

  const canDelete =
    hasPermission('control_form.delete') &&
    ((driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (compoundForm != null && compoundForm.status !== 'deleted'));

  const handleDelete = async () => {
    try {
      if (driver.form?.id && driver.form?.subFormNumber) {
        await deleteDriveRestForm(
          'driver',
          String(driver.form.id),
          driver.form.subFormNumber,
          driver.form.status ?? '',
        );
      }
      if (teammate.form?.id && teammate.form?.subFormNumber) {
        await deleteDriveRestForm(
          'teammate',
          String(teammate.form.id),
          teammate.form.subFormNumber,
          teammate.form.status ?? '',
        );
      }
      if (vehicle.form?.id && vehicle.form?.subFormNumber) {
        await deleteTechnicalCheckForm('vehicle', String(vehicle.form.id), vehicle.form.subFormNumber, vehicle.form.status ?? '');
      }
      if (trailer.form?.id && trailer.form?.subFormNumber) {
        await deleteTechnicalCheckForm('trailer', String(trailer.form.id), trailer.form.subFormNumber, trailer.form.status ?? '');
      }
      if (compoundForm?.id && compoundForm.formNumber) {
        await deleteCompoundForm(
          String(compoundForm.id),
          compoundForm.formNumber,
          compoundForm.status ?? '',
        );
      }
      navigate('/');
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

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
          const payload = { ...d, id: vehicle.form?.id, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(vehicle, 'vehicle', () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); }).catch(console.error);
        },
      },
      {
        tabId: 'tab-trailer-technical-check',
        subForm: trailer as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, id: trailer.form?.id, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(trailer, 'trailer', () => { trailer.draftRef.current = null; trailer.setDraft(null); }); }).catch(console.error);
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
          updateDriveRestForm('driver', serialized as unknown as DriveRestForm)
            .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchDriver(() => { driver.draftRef.current = null; driver.setDraft(null); }); })
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
          updateDriveRestForm('teammate', serialized as unknown as DriveRestForm)
            .then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTeammate(() => { teammate.draftRef.current = null; teammate.setDraft(null); }); })
            .catch(console.error);
        },
      },
    ],
  });

  const canConfirm = () => {
    const form = activeTab === 'tab-driver' ? driver.form : teammate.form;
    const writePermission =
      entryType === 'driver'
        ? 'sp_driver_form.write'
        : 'sp_teammate_form.write';
    return (
      hasPermission(writePermission) &&
      hasPermission('control_form.view_unpublished') &&
      form?.status === 'saved'
    );
  };

  const checkAndAutoConfirmCompound = (
    latestDriver: DriveRestForm | null,
    latestTeammate: DriveRestForm | null,
  ) => {
    if (!compoundForm || compoundForm.status === 'confirmed') return;
    const forms = [latestDriver, latestTeammate].filter(
      Boolean,
    ) as DriveRestForm[];
    if (forms.length === 0) return;
    const allConfirmed = forms.every((f) => f.status === 'confirmed');
    if (allConfirmed) {
      triggerConfirmCompound();
    }
  };

  const refetchDriver = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey('driver', compoundFormKey)
      .then((res) => {
        driver.setForm(res);
        getDriveRestFormByCompoundFormKey('teammate', compoundFormKey)
          .then((tm) => {
            const anySubFormSaved =
              res?.status === 'saved' || tm?.status === 'saved';
            if (anySubFormSaved) {
              if (res) driver.setEditActive(true);
              if (tm) teammate.setEditActive(true);
            } else {
              driver.setEditActive(res?.status === 'saved');
            }
            checkAndAutoConfirmCompound(res, tm);
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
            const anySubFormSaved =
              dr?.status === 'saved' || res?.status === 'saved';
            if (anySubFormSaved) {
              if (dr) driver.setEditActive(true);
              if (res) teammate.setEditActive(true);
            } else {
              teammate.setEditActive(res?.status === 'saved');
            }
            checkAndAutoConfirmCompound(dr, res);
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
    <div>
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
        <Tabs.List aria-label={t('forms.compound_form')}>
          <Tabs.Trigger id="tab-compound">
            {t('forms.compound.generalPart')}
          </Tabs.Trigger>
          {(() => {
            const tabSubForms = { 'tab-driver': driver, 'tab-teammate': teammate, 'tab-vehicle-technical-check': vehicle, 'tab-trailer-technical-check': trailer } as const;
            const tabsWithStatus = openTabs.filter((tid) => tid !== 'tab-compound' && (tabSubForms as Record<string, typeof driver>)[tid]?.form != null).length;
            return (['tab-driver', 'tab-teammate', 'tab-vehicle-technical-check', 'tab-trailer-technical-check'] as const).map((tid) => {
              if (!openTabs.includes(tid)) return null;
              const subForm = tid === 'tab-driver' ? driver : tid === 'tab-teammate' ? teammate : tid === 'tab-vehicle-technical-check' ? vehicle : trailer;
              const label =
                tid === 'tab-driver'
                  ? t('forms.sp_driver_form')
                  : tid === 'tab-teammate'
                    ? t('forms.sp_teammate_form')
                    : tid === 'tab-vehicle-technical-check'
                      ? t('forms.technical_check.vehicleTitle')
                      : t('forms.technical_check.trailerTitle');
              return (
                <Tabs.Trigger key={tid} id={tid}>
                  <span style={{ position: 'relative' }}>
                    {label}
                    {hasTabErrors(tid) && <StatusIndicator type="danger" position="top-right" />}
                  </span>
                  {subForm.editActive && (tabsWithStatus > 1 || !subForm.form) && (
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
            <DriveRestFormViewCard scope="driver" form={form} canEdit={canEdit && form.status !== 'deleted'} onEdit={() => driver.setEditActive(true)} formType={FORM_TYPE.DRIVER} />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              form={driver.draft ?? form}
              compoundFormKey={compoundFormKey}
              onSaved={() => { setTabErrors((p) => ({ ...p, 'tab-driver': false })); setShowSavedAlert(true); window.scrollTo(0, 0); if (!driver.form) resetCompoundFormToSaved(); refetchDriver(() => { driver.draftRef.current = null; driver.setDraft(null); }); }}
              onCancel={() => { driver.setEditActive(false); driver.draftRef.current = null; driver.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.DRIVER}
              onValuesChange={(v) => { const next = { ...(driver.draftRef.current ?? form ?? {}), ...v } as DriveRestForm; driver.draftRef.current = next; driver.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-driver')}
            />
          )}
        />

        <SubFormTab
          id="tab-teammate"
          open={openTabs.includes('tab-teammate')}
          subForm={teammate}
          renderView={(form) => (
            <DriveRestFormViewCard scope="teammate" form={form} canEdit={canEdit && form.status !== 'deleted'} onEdit={() => teammate.setEditActive(true)} formType={FORM_TYPE.TEAMMATE} />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="teammate"
              form={teammate.draft ?? form}
              compoundFormKey={compoundFormKey}
              onSaved={() => { setTabErrors((p) => ({ ...p, 'tab-teammate': false })); setShowSavedAlert(true); window.scrollTo(0, 0); if (!teammate.form) resetCompoundFormToSaved(); refetchTeammate(() => { teammate.draftRef.current = null; teammate.setDraft(null); }); }}
              onCancel={() => { teammate.setEditActive(false); teammate.draftRef.current = null; teammate.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TEAMMATE}
              onValuesChange={(v) => { const next = { ...(teammate.draftRef.current ?? form ?? {}), ...v } as DriveRestForm; teammate.draftRef.current = next; teammate.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-teammate')}
            />
          )}
        />

        <SubFormTab
          id="tab-vehicle-technical-check"
          open={openTabs.includes('tab-vehicle-technical-check')}
          subForm={vehicle}
          renderView={(form) => (
            <TechnicalCheckFormViewCard scope="vehicle" form={form} canEdit={canEdit && form.status !== 'deleted'} onEdit={() => vehicle.setEditActive(true)} formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK} />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="vehicle"
              form={vehicle.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); setTabErrors((p) => ({ ...p, 'tab-vehicle-technical-check': false })); refetchTechCheck(vehicle, 'vehicle', () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); }}
              onCancel={() => { vehicle.setEditActive(false); vehicle.draftRef.current = null; vehicle.setDraft(null); }}
              canConfirm={false}
              onConfirm={() => {}}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
              onValuesChange={(v) => { const next = { ...(vehicle.draftRef.current ?? form), ...v } as TechnicalCheckForm; vehicle.draftRef.current = next; vehicle.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-vehicle-technical-check')}
            />
          )}
        />

        <SubFormTab
          id="tab-trailer-technical-check"
          open={openTabs.includes('tab-trailer-technical-check')}
          subForm={trailer}
          renderView={(form) => (
            <TechnicalCheckFormViewCard scope="trailer" form={form} canEdit={canEdit && form.status !== 'deleted'} onEdit={() => trailer.setEditActive(true)} formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK} />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="trailer"
              form={trailer.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); setTabErrors((p) => ({ ...p, 'tab-trailer-technical-check': false })); refetchTechCheck(trailer, 'trailer', () => { trailer.draftRef.current = null; trailer.setDraft(null); }); }}
              onCancel={() => { trailer.setEditActive(false); trailer.draftRef.current = null; trailer.setDraft(null); }}
              canConfirm={false}
              onConfirm={() => {}}
              formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
              onValuesChange={(v) => { const next = { ...(trailer.draftRef.current ?? form), ...v } as TechnicalCheckForm; trailer.draftRef.current = next; trailer.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-trailer-technical-check')}
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
                type="button"
                visualType="secondary"
                onClick={() => {
                  setCompoundEditActive(true);
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {anyEditActive && (
            <Button type="button" onClick={handleSaveAll}>
              {t('common.save')}
            </Button>
          )}
          {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
        </div>
      </div>
    </div>
  );
}
