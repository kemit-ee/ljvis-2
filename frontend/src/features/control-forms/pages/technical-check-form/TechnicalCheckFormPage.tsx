import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert, Tabs, Dropdown, ClosingButton, StatusIndicator } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import type { TechnicalCheckVariant, TechnicalCheckForm, DriveRestForm, AdrForm } from '../../types';
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
} from '../../api';
import { useCompoundForm } from '../compound-form/useCompoundForm';
import { useCompoundFormDetail } from '../compound-form/useCompoundFormDetail';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE, ALL_FORM_TABS } from '../../../../constants/constants';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { TechnicalCheckFormViewCard } from '../../components/TechnicalCheckForm/TechnicalCheckFormViewCard';
import { TechnicalCheckFormEditCard, type TechnicalCheckFormEditCardRef } from '../../components/TechnicalCheckForm/TechnicalCheckFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard.tsx';
import { DriveRestFormEditCard, type DriveRestFormEditCardRef } from '../../components/DriveRestForm/DriveRestFormEditCard.tsx';
import { AdrFormViewCard } from '../../components/AdrForm/AdrFormViewCard';
import { AdrFormEditCard, type AdrFormEditCardRef } from '../../components/AdrForm/AdrFormEditCard';
import { useSubForm, type SubFormHandle } from '../../hooks/useSubForm';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { createDriveRestValidationSchema, serializeDriveRestFormValues } from '../drive-rest-form/useDriveRestForm';
import { createTechnicalCheckValidationSchema } from './useTechnicalCheckForm';
import { createSaveAllHandler } from '../../hooks/createSaveAllHandler';
import { createAdrValidationSchema } from '../adr-form/useAdrForm';
import { useSubFormEditActive, makeCheckAndAutoConfirm, useSubFormPermissions, subFormsAllConfirmed as getSubFormsStatus, addTab, useDeleteAllSubForms, useRemoveSubFormTab } from '../../hooks/useSubFormEditActive';

interface TechnicalCheckFormPageProps {
  variant: TechnicalCheckVariant;
}

export function TechnicalCheckFormPage({ variant }: TechnicalCheckFormPageProps) {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const tabId = variant === 'vehicle' ? 'tab-vehicle-technical-check' : 'tab-trailer-technical-check';
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

  const [activeTab, setActiveTab] = useState(tabId);
  const [compoundEditActive, setCompoundEditActive] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [compoundVersionsRefreshKey, setCompoundVersionsRefreshKey] = useState(0);
  const [openTabs, setOpenTabs] = useState<string[]>([tabId]);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const hasTabErrors = (tid: string) => validatedTabs.has(tid) && (tabErrors[tid] ?? false);

  const vehicle = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'vehicle_technical_form' });
  const trailer = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });
  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_driver_form' });
  const teammate = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({
    permPrefix: 'sp_teammate_form',
  });
  const adr = useSubForm<AdrForm, AdrFormEditCardRef>({ permPrefix: 'adr_form' });

  const handleSubformEditActive = useSubFormEditActive({ driver, teammate, vehicle, trailer, adr, hasPermission });
  
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
        else { trailer.setForm(res); trailer.setLoaded(true); }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id, variant]);

  // Load the other technical check variant + driver/teammate once compoundFormKey is known
  useEffect(() => {
    if (!compoundFormKey) return;
    const otherVariant: TechnicalCheckVariant = variant === 'vehicle' ? 'trailer' : 'vehicle';
    const otherTabId = variant === 'vehicle' ? 'tab-trailer-technical-check' : 'tab-vehicle-technical-check';
    const otherSubForm = variant === 'vehicle' ? trailer : vehicle;
    listTechnicalCheckFormsByCompoundFormKey(otherVariant, compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        if (item?.id) {
          const full = await getTechnicalCheckForm(otherVariant, item.id).catch(() => null);
          otherSubForm.setForm(full);
          if (full) setOpenTabs((prev) => prev.includes(otherTabId) ? prev : [...prev, otherTabId]);
        }
        otherSubForm.setLoaded(true);
      })
      .catch(console.error);

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
    const openSubForms = [
      openTabs.includes('tab-vehicle-technical-check') ? vehicle.form : null,
      openTabs.includes('tab-trailer-technical-check') ? trailer.form : null,
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
    setCompoundVersionsRefreshKey((k) => k + 1);
    refetchCompoundRef.current();
    window.scrollTo(0, 0);
  };

  const { subFormsAllConfirmed } = getSubFormsStatus({ openTabs, driver, teammate, vehicle, trailer, adr });

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
    handleCompanySearch,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
  } = useCompoundForm(
    compoundForm ?? undefined,
    handleCompoundSaved,
    handleCompoundConfirmed,
    subFormsAllConfirmed,
    () => { refetchCompoundRef.current(); },
  );

  useEffect(() => {
    if (compoundForm?.status !== undefined) {
      setCompoundEditActive(compoundForm.status === 'saved' && hasPermission('compound_form.write'));
    }
  }, [compoundForm?.status]);

  const { canEdit: canEditSubForms, canConfirm } = useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailer, adr });

  const checkAndAutoConfirmCompound = makeCheckAndAutoConfirm({ compoundForm, triggerConfirm: triggerConfirmCompound });

  const refetchAdr = (onDone?: () => void) => {
    if (!compoundFormKey) return;
    listAdrFormsByCompoundFormKey(compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getAdrForm(item.id).catch(() => null) : null;
        adr.setForm(full);
        checkAndAutoConfirmCompound(driver.form, teammate.form, vehicle.form, trailer.form, full);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTechCheck = (subForm: typeof vehicle, scope: TechnicalCheckVariant, onDone?: () => void) => {
    if (!compoundFormKey) return;
    listTechnicalCheckFormsByCompoundFormKey(scope, compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm(scope, item.id).catch(() => null) : null;
        subForm.setForm(full);
        const latestVehicle = scope === 'vehicle' ? full : vehicle.form;
        const latestTrailer = scope === 'trailer' ? full : trailer.form;
        checkAndAutoConfirmCompound(
          driver.form,
          teammate.form,
          latestVehicle,
          latestTrailer,
          adr.form
        );
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchDriveRest = (subForm: typeof driver, scope: 'driver' | 'teammate', onDone?: () => void) => {
    if (!compoundFormKey) return;
    getDriveRestFormByCompoundFormKey(scope, compoundFormKey)
      .then((res) => { subForm.setForm(res ?? null);
        const latestDriver = scope === 'driver' ? res : driver.form;
        const latestTeammate = scope === 'teammate' ? res : teammate.form;
        checkAndAutoConfirmCompound(
          latestDriver,
          latestTeammate,
          vehicle.form,
          trailer.form,
          adr.form
        );
        onDone?.(); })
      .catch(console.error);
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
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(vehicle, 'vehicle', () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-trailer-technical-check',
        subForm: trailer as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, id: trailer.form?.id, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(trailer, 'trailer', () => { trailer.draftRef.current = null; trailer.setDraft(null); }); handleSubformEditActive();}).catch(console.error);
        },
      },
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
          const payload = { ...d, id: adr.form?.id, driverAssistant: d.driverAssistant && !isBlank(d.driverAssistant as Record<string, unknown>) ? JSON.stringify(d.driverAssistant) : '', lastLoadAddress: d.lastLoadAddress && !isBlank(d.lastLoadAddress as Record<string, unknown>) ? JSON.stringify(d.lastLoadAddress) : '', nextLoadAddress: d.nextLoadAddress && !isBlank(d.nextLoadAddress as Record<string, unknown>) ? JSON.stringify(d.nextLoadAddress) : '', dangerousGoods: JSON.stringify(d.dangerousGoods ?? []), infringements: JSON.stringify((d.infringements ?? []).filter((e) => !!(e as { checkStatus?: string }).checkStatus)), correctiveMeasures: JSON.stringify(d.correctiveMeasures ?? []) } as unknown as AdrForm;
          saveAdrForm(payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchAdr(() => { adr.draftRef.current = null; adr.setDraft(null); }); handleSubformEditActive(); }).catch(console.error);
        },
      },
    ],
  });

  const handleAddTab = (
    tabId:
      | 'tab-driver'
      | 'tab-teammate'
      | 'tab-vehicle-technical-check'
      | 'tab-trailer-technical-check'
      | 'tab-adr',
  ) =>
    addTab(tabId, {
      driver,
      teammate,
      vehicle,
      trailer,
      adr,
      setOpenTabs,
      setActiveTab,
    });

  const anyEditActive =
    vehicle.editActive ||
    trailer.editActive ||
    driver.editActive ||
    teammate.editActive ||
    adr.editActive ||
    compoundEditActive;
  const canEdit = hasPermission('compound_form.write');

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
    hasPermission('control_form.delete') &&
    ((vehicle.form != null && vehicle.form.status !== 'deleted') ||
      (trailer.form != null && trailer.form.status !== 'deleted') ||
      (driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (compoundForm != null && compoundForm.status !== 'deleted'));

  const handleDelete = useDeleteAllSubForms({ driver, teammate, vehicle, trailer, adr, compoundForm });

  const { removeConfirmTab, setRemoveConfirmTab, handleRemove, handleRemoveConfirmed } = useRemoveSubFormTab({
    driver,
    teammate,
    vehicle,
    trailer,
    adr,
    setOpenTabs,
    setActiveTab,
    checkAndAutoConfirm: checkAndAutoConfirmCompound,
    navigateAfterRemove: () => navigate(`/control-forms/compound/${compoundFormKey}`),
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
        <TechnicalCheckFormViewCard scope={variant} form={snapshot} canEdit={false} onEdit={() => {}} formType={formType} />
      </div>
    );
  }

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (loadError || !compoundFormKey) return <Text>{t('common.error')}</Text>;
  const currentForm = variant === 'vehicle' ? vehicle.form : trailer.form;
  if (id && !currentForm) return <FormNotFoundView title={t(titleKey)} />;

  return (
    <div>
      <DeleteConfirmModal subForm isOpen={removeConfirmTab !== null} onClose={() => setRemoveConfirmTab(null)} onDelete={handleRemoveConfirmed} />
      {showSavedAlert && !showConfirmedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowSavedAlert(false)} type="success" size="small">
          {t('forms.savedNote')}
        </Alert>
      )}
      {showConfirmedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => { setShowConfirmedAlert(false); setShowSavedAlert(false); }} type="success" size="small">
          {t('forms.confirmedNote')}
        </Alert>
      )}

      <Button visualType="link" onClick={() => navigate('/')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      {!isDesktop && addFormDropdown}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.compound_form')}>
          <Tabs.Trigger id="tab-compound">{t('forms.compound.generalPart')}</Tabs.Trigger>
          {(() => {
            const tabSubForms: Record<string, { form: unknown; editActive: boolean }> = { 'tab-driver': driver, 'tab-teammate': teammate, 'tab-vehicle-technical-check': vehicle, 'tab-trailer-technical-check': trailer, 'tab-adr': adr };
            const tabsWithStatus = openTabs.filter((tid) => tid !== 'tab-compound' && tabSubForms[tid]?.form != null).length;
            return (['tab-driver', 'tab-teammate', 'tab-vehicle-technical-check', 'tab-trailer-technical-check', 'tab-adr'] as const).map((tid) => {
            if (!openTabs.includes(tid)) return null;
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
                      : t('forms.technical_check.trailerTitle');
            const canClose = subForm.editActive && (tabsWithStatus > 1 || !subForm.form);
            return (
              <Tabs.Trigger key={tid} id={tid}>
                <span style={{ position: 'relative' }}>
                  {label}
                  {hasTabErrors(tid) && <StatusIndicator type="danger" position="top-right" />}
                </span>
                {canClose && (
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
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
              onCancel={() => { formik.resetForm(); setCompoundEditActive(false); }}
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
            <DriveRestFormViewCard scope="driver" form={form} canEdit={canEditSubForms() && form.status !== 'deleted'} onEdit={() => driver.setEditActive(true)} formType={FORM_TYPE.DRIVER} />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              form={driver.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); setTabErrors((p) => ({ ...p, 'tab-driver': false })); refetchDriveRest(driver, 'driver', () => { driver.draftRef.current = null; driver.setDraft(null); }); }}
              onCancel={() => { driver.setEditActive(false); driver.draftRef.current = null; driver.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.DRIVER}
              onValuesChange={(v) => { const next = { ...(driver.draftRef.current ?? form), ...v } as DriveRestForm; driver.draftRef.current = next; driver.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-driver')}
            />
          )}
        />

        <SubFormTab
          id="tab-teammate"
          open={openTabs.includes('tab-teammate')}
          subForm={teammate}
          renderView={(form) => (
            <DriveRestFormViewCard scope="teammate" form={form} canEdit={canEditSubForms() && form.status !== 'deleted'} onEdit={() => teammate.setEditActive(true)} formType={FORM_TYPE.TEAMMATE} />
          )}
          renderEdit={(form, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="teammate"
              form={teammate.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); setTabErrors((p) => ({ ...p, 'tab-teammate': false })); refetchDriveRest(teammate, 'teammate', () => { teammate.draftRef.current = null; teammate.setDraft(null); }); }}
              onCancel={() => { teammate.setEditActive(false); teammate.draftRef.current = null; teammate.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TEAMMATE}
              onValuesChange={(v) => { const next = { ...(teammate.draftRef.current ?? form), ...v } as DriveRestForm; teammate.draftRef.current = next; teammate.setDraft(next); }}
              initialValidate={validatedTabs.has('tab-teammate')}
            />
          )}
        />

        <SubFormTab
          id="tab-vehicle-technical-check"
          open={openTabs.includes('tab-vehicle-technical-check')}
          subForm={vehicle}
          renderView={(form) => (
            <TechnicalCheckFormViewCard scope="vehicle" form={form} canEdit={canEditSubForms() && form.status !== 'deleted'} onEdit={() => vehicle.setEditActive(true)} formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK} />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="vehicle"
              form={vehicle.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(vehicle, 'vehicle', () => { vehicle.draftRef.current = null; vehicle.setDraft(null); }); }}
              onCancel={() => { vehicle.setEditActive(false); vehicle.draftRef.current = null; vehicle.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.VEHICLE_TECHNICAL_CHECK}
              onValuesChange={(v) => { const next = { ...(vehicle.draftRef.current ?? form), ...v } as TechnicalCheckForm; vehicle.draftRef.current = next; vehicle.setDraft(next); }}
              initialValidate={false}
            />
          )}
        />

        <SubFormTab
          id="tab-trailer-technical-check"
          open={openTabs.includes('tab-trailer-technical-check')}
          subForm={trailer}
          renderView={(form) => (
            <TechnicalCheckFormViewCard scope="trailer" form={form} canEdit={canEditSubForms() && form.status !== 'deleted'} onEdit={() => trailer.setEditActive(true)} formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK} />
          )}
          renderEdit={(form, ref) => (
            <TechnicalCheckFormEditCard
              ref={ref}
              scope="trailer"
              form={trailer.draft ?? form}
              compoundFormKey={compoundFormKey!}
              onSaved={() => { setShowSavedAlert(true); window.scrollTo(0, 0); refetchTechCheck(trailer, 'trailer', () => { trailer.draftRef.current = null; trailer.setDraft(null); }); }}
              onCancel={() => { trailer.setEditActive(false); trailer.draftRef.current = null; trailer.setDraft(null); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
              onValuesChange={(v) => { const next = { ...(trailer.draftRef.current ?? form), ...v } as TechnicalCheckForm; trailer.draftRef.current = next; trailer.setDraft(next); }}
              initialValidate={false}
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
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                refetchAdr(() => { adr.draftRef.current = null; adr.setDraft(null); });
              }}
              onCancel={() => { adr.setEditActive(false); adr.resetDraft(); }}
              canConfirm={canConfirm()}
              onConfirm={() => {}}
              formType={FORM_TYPE.ADR}
              onValuesChange={(v) => { const next = { ...(adr.draftRef.current ?? form), ...v } as AdrForm; adr.draftRef.current = next; adr.setDraft(next); }}
              initialValidate={false}
            />
          )}
        />
      </Tabs>

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {hasPermission('control_form.edit_locked') &&
            !anyEditActive &&
            compoundForm?.status !== 'deleted' && (
              <Button
                type="button"
                visualType="secondary"
                onClick={() => {
                  setCompoundEditActive(true);
                  if (vehicle.form) vehicle.setEditActive(true);
                  if (trailer.form) trailer.setEditActive(true);
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                  if (adr.form) adr.setEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {anyEditActive && (
            <AsyncButton
              type="button"
              onClick={handleSaveAll}
            >
              {t('common.save')}
            </AsyncButton>
          )}
          {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
        </div>
      </div>
    </div>
  );
}
