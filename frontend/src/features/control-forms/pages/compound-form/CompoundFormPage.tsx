import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Text,
  Alert,
  Heading,
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
  listAdrFormsByCompoundFormKey,
  saveTechnicalCheckForm,
} from '../../api';
import type {
  DriveRestForm,
  TransportInterruptionFormListItem,
  AdrFormListItem,
  TechnicalCheckForm,
} from '../../types';
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
import {
  TechnicalCheckFormEditCard,
  type TechnicalCheckFormEditCardRef,
} from '../../components/TechnicalCheckForm/TechnicalCheckFormEditCard.tsx';
import { TechnicalCheckFormViewCard } from '../../components/TechnicalCheckForm/TechnicalCheckFormViewCard.tsx';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { useSubForm, type SubFormHandle } from '../../hooks/useSubForm';
import { createSaveAllHandler } from '../../hooks/createSaveAllHandler';
import { isAnySubFormSaved, useSubFormEditActive, makeCheckAndAutoConfirm, useSubFormPermissions, subFormsAllConfirmed as getSubFormsStatus, addTab, useDeleteAllSubForms, useRemoveSubFormTab } from '../../hooks/useSubFormEditActive';


/**
 * LJVIS2-74: minimal navigation into the transport-interruption sub-form of
 * this compound form. Same stopgap pattern as TechnicalCheckFormsSection above
 * pending the real "Koondvormi alamvormide haldamine" tab-bar infrastructure.
 */
export function TransportInterruptionSection({
  compoundFormKey,
  canEdit,
}: {
  compoundFormKey: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TransportInterruptionFormListItem[]>([]);

  useEffect(() => {
    listTransportInterruptionFormsByCompoundFormKey(compoundFormKey)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, [compoundFormKey]);

  return (
    <div className="mb-1">
      <Heading element="h3">{t('forms.transport_interruption.sectionTitle')}</Heading>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/control-forms/transport-interruption/${item.id}`}>
              {item.subFormNumber}/{item.version}
            </Link>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Link to={`/control-forms/transport-interruption/new/${compoundFormKey}`}>
          {t('forms.transport_interruption.addNew')}
        </Link>
      )}
    </div>
  );
}

/**
 * LJVIS2-141: minimal navigation into the ADR (ohtlik veos) sub-form of this
 * compound form. Same stopgap pattern as TechnicalCheckFormsSection above
 * pending the real "Koondvormi alamvormide haldamine" tab-bar infrastructure.
 */
export function AdrFormSection({
  compoundFormKey,
  canEdit,
}: {
  compoundFormKey: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AdrFormListItem[]>([]);

  useEffect(() => {
    listAdrFormsByCompoundFormKey(compoundFormKey)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, [compoundFormKey]);

  return (
    <div className="mb-1">
      <Heading element="h3">{t('forms.adr.sectionTitle')}</Heading>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/control-forms/adr/${item.id}`}>
              {item.subFormNumber}/{item.version}
            </Link>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Link to={`/control-forms/adr/new/${compoundFormKey}`}>
          {t('forms.adr.addNew')}
        </Link>
      )}
    </div>
  );
}

export function CompoundFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

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
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('tab-compound');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());

  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_driver_form' });
  const teammate = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({ permPrefix: 'sp_teammate_form' });
  const vehicle = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'vehicle_technical_form' });
  const trailer = useSubForm<TechnicalCheckForm, TechnicalCheckFormEditCardRef>({ permPrefix: 'trailer_technical_form' });

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

  const handleSubformEditActive = useSubFormEditActive({ driver, teammate, vehicle, trailer, hasPermission });

  useEffect(() => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    Promise.all([
      getDriveRestFormByCompoundFormKey('driver', compoundFormKey),
      getDriveRestFormByCompoundFormKey('teammate', compoundFormKey),
      listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey),
      listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey),
    ])
      .then(async ([driverRes, teammateRes, vehicleList, trailerList]) => {
        driver.setForm(driverRes);
        teammate.setForm(teammateRes);
        const vehicleItem = Array.isArray(vehicleList) ? vehicleList[0] : null;
        const trailerItem = Array.isArray(trailerList) ? trailerList[0] : null;
        const vehicleFull = vehicleItem?.id
          ? await getTechnicalCheckForm('vehicle', vehicleItem.id).catch(() => null)
          : null;
        const trailerFull = trailerItem?.id
          ? await getTechnicalCheckForm('trailer', trailerItem.id).catch(() => null)
          : null;
        vehicle.setForm(vehicleFull);
        trailer.setForm(trailerFull);
        const tabs: string[] = [];
        if (driverRes) tabs.push('tab-driver');
        if (teammateRes) tabs.push('tab-teammate');
        if (vehicleFull) tabs.push('tab-vehicle-technical-check');
        if (trailerFull) tabs.push('tab-trailer-technical-check');
        setOpenTabs(tabs);
        if (isAnySubFormSaved(driverRes, teammateRes, vehicleFull, trailerFull)) {
          if (driverRes) driver.setEditActive(hasPermission('sp_driver_form.write'));
          if (teammateRes) teammate.setEditActive(hasPermission('sp_teammate_form.write'));
          if (vehicleFull) vehicle.setEditActive(hasPermission('vehicle_technical_form.write'));
          if (trailerFull) trailer.setEditActive(hasPermission('trailer_technical_form.write'));
        }
      })
      .catch(console.error)
      .finally(() => {
        driver.setLoaded(true);
        teammate.setLoaded(true);
        vehicle.setLoaded(true);
        trailer.setLoaded(true);
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
        checkAndAutoConfirmCompound(latestDriver, latestTeammate, vehicle.form, trailer.form);
        onDone?.();
      })
      .catch(console.error);
  };

  const refetchTechCheck = (scope: 'vehicle' | 'trailer', onDone?: () => void) => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    const subForm = scope === 'vehicle' ? vehicle : trailer;
    listTechnicalCheckFormsByCompoundFormKey(scope, compoundFormKey)
      .then(async (list) => {
        const item = Array.isArray(list) ? list[0] : null;
        const full = item?.id ? await getTechnicalCheckForm(scope, item.id).catch(() => null) : null;
        subForm.setForm(full);
        const latestVehicle = scope === 'vehicle' ? full : vehicle.form;
        const latestTrailer = scope === 'trailer' ? full : trailer.form;
        checkAndAutoConfirmCompound(driver.form, teammate.form, latestVehicle, latestTrailer);
        onDone?.();
      })
      .catch(console.error);
  };

  const canEdit =
    hasPermission('compound_form.write') && form?.status !== 'deleted';

  const { subFormsAllConfirmed } = getSubFormsStatus({ openTabs, driver, teammate, vehicle, trailer });
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
    setShowConfirmedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    driver.setEditActive(false);
    teammate.setEditActive(false);
    vehicle.setEditActive(false);
    trailer.setEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
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
    triggerSaveAsSaved,
  } = useCompoundForm(
    form ?? undefined,
    handleEditSaved,
    handleConfirmed,
    subFormsAllConfirmed,
    () => { refetch(); },
  );

  const checkAndAutoConfirmCompound = makeCheckAndAutoConfirm({ compoundForm: form, triggerConfirm });

  const resetCompoundFormToSaved = () => {
    if (!form || form.status !== 'confirmed') return;
    if (isEditActive) return;
    triggerSaveAsSaved();
  };

  const addableTabs = ALL_FORM_TABS.filter((tab) => !openTabs.includes(tab.tabId));

  const handleAddTab = (tabId: 'tab-driver' | 'tab-teammate' | 'tab-vehicle-technical-check' | 'tab-trailer-technical-check') =>
    addTab(tabId, { driver, teammate, vehicle, trailer, setOpenTabs, setActiveTab });

  const { removeConfirmTab, setRemoveConfirmTab, handleRemove, handleRemoveConfirmed } = useRemoveSubFormTab({
    driver,
    teammate,
    vehicle,
    trailer,
    setOpenTabs,
    setActiveTab,
    checkAndAutoConfirm: checkAndAutoConfirmCompound,
    navigateAfterRemove: () => navigate(`/control-forms/compound/${id}`),
    onEditActiveChange: setIsEditActive,
  });

  const anyEditActive = isEditActive || driver.editActive || teammate.editActive || vehicle.editActive || trailer.editActive;

  const handleSaveAll = createSaveAllHandler({
    activeTab,
    setTabErrors,
    setValidatedTabs,
    compoundEditActive: isEditActive,
    onCompoundSave: () => formik.handleSubmit(),
    subForms: [
      {
        tabId: 'tab-vehicle-technical-check',
        subForm: vehicle as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, id: vehicle.form?.id, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('vehicle', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!vehicle.form) resetCompoundFormToSaved(); refetchTechCheck('vehicle', () => { vehicle.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      },
      {
        tabId: 'tab-trailer-technical-check',
        subForm: trailer as SubFormHandle<unknown, { save: () => void; validateForm?: () => void }>,
        schema: createTechnicalCheckValidationSchema(t) as ReturnType<typeof createTechnicalCheckValidationSchema>,
        fallbackSave: (draft) => {
          const d = draft as TechnicalCheckForm;
          const payload = { ...d, id: trailer.form?.id, partsSummary: JSON.stringify(d.partsSummary ?? []), partsDefects: JSON.stringify(d.partsDefects ?? []), violations: JSON.stringify(d.violations ?? []) } as unknown as TechnicalCheckForm;
          saveTechnicalCheckForm('trailer', payload).then(() => { setShowSavedAlert(true); window.scrollTo(0, 0); if (!trailer.form) resetCompoundFormToSaved(); refetchTechCheck('trailer', () => { trailer.resetDraft(); }); handleSubformEditActive();}).catch(console.error);
        },
      },
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

  const handleDeleteAll = useDeleteAllSubForms({ driver, teammate, vehicle, trailer, compoundForm: form });

  const { canEdit: canEditSubForms, canConfirm: canConfirmSubform } = useSubFormPermissions({ activeTab, driver, teammate, vehicle, trailer });

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
  };

  const canDeleteAll =
    hasPermission('control_form.delete') &&
    ((driver.form != null && driver.form.status !== 'deleted') ||
      (teammate.form != null && teammate.form.status !== 'deleted') ||
      (vehicle.form != null && vehicle.form.status !== 'deleted') ||
      (trailer.form != null && trailer.form.status !== 'deleted') ||
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

  if (!driver.loaded || !teammate.loaded || !vehicle.loaded || !trailer.loaded) return <Text>{t('common.loading')}</Text>;

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
            const tabSubForms = {
              'tab-driver': driver,
              'tab-teammate': teammate,
              'tab-vehicle-technical-check': vehicle,
              'tab-trailer-technical-check': trailer,
            } as const;
            const tabsWithStatus = openTabs.filter(
              (tid) =>
                tid !== 'tab-compound' &&
                (tabSubForms as Record<string, typeof driver>)[tid]?.form !=
                  null,
            ).length;
            return (
              [
                'tab-driver',
                'tab-teammate',
                'tab-vehicle-technical-check',
                'tab-trailer-technical-check',
              ] as const
            ).map((tid) => {
              if (!openTabs.includes(tid)) return null;
              const subForm =
                tid === 'tab-driver'
                  ? driver
                  : tid === 'tab-teammate'
                    ? teammate
                    : tid === 'tab-vehicle-technical-check'
                      ? vehicle
                      : trailer;
              const label =
                tid === 'tab-driver'
                  ? t('forms.sp_driver_form')
                  : tid === 'tab-teammate'
                    ? t('forms.sp_teammate_form')
                    : tid === 'tab-vehicle-technical-check'
                      ? t('forms.technical_check.vehicleTitle')
                      : t('forms.technical_check.trailerTitle');
              const canClose =
                subForm.editActive && (tabsWithStatus > 1 || !subForm.form);
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
                alignSelf: 'center',
                marginRight: '1rem',
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
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({
                  ...p,
                  'tab-vehicle-technical-check': false,
                }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!vehicle.form) resetCompoundFormToSaved();
                refetchTechCheck('vehicle', () => {
                  vehicle.resetDraft();
                });
              }}
              onCancel={() => {
                vehicle.setEditActive(false);
                vehicle.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchTechCheck('vehicle', () => {
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
              compoundFormKey={Number(id)}
              onSaved={() => {
                setTabErrors((p) => ({
                  ...p,
                  'tab-trailer-technical-check': false,
                }));
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                if (!trailer.form) resetCompoundFormToSaved();
                refetchTechCheck('trailer', () => {
                  trailer.resetDraft();
                });
              }}
              onCancel={() => {
                trailer.setEditActive(false);
                trailer.resetDraft();
              }}
              canConfirm={canConfirmSubform()}
              onConfirm={() => {
                refetchTechCheck('trailer', () => {
                  trailer.setEditActive(false);
                  trailer.resetDraft();
                });
              }}
              formType={FORM_TYPE.TRAILER_TECHNICAL_CHECK}
              onValuesChange={(v) => {
                trailer.setDraftValue({
                  ...(trailer.draftRef.current ?? form),
                  ...v,
                } as TechnicalCheckForm);
              }}
              initialValidate={validatedTabs.has('tab-trailer-technical-check')}
            />
          )}
        />
      </Tabs>
      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {hasPermission('control_form.edit_locked') &&
            !anyEditActive &&
            form?.status !== 'deleted' && (
              <Button
                type="button"
                visualType="secondary"
                onClick={() => {
                  setIsEditActive(true);
                  if (driver.form) driver.setEditActive(true);
                  if (teammate.form) teammate.setEditActive(true);
                  if (vehicle.form) vehicle.setEditActive(true);
                  if (trailer.form) trailer.setEditActive(true);
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
          {canDeleteAll && <DeleteConfirmModal onDelete={handleDeleteAll} />}
        </div>
      </div>
    </div>
  );
}
