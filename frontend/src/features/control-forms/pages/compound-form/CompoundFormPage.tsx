import { useState, useEffect, useRef } from 'react';
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
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import {
  deleteCompoundForm,
  getCompoundFormSnapshot,
  getDriveRestFormByCompoundFormKey,
  deleteDriveRestForm,
  updateDriveRestForm,
  listTechnicalCheckFormsByCompoundFormKey,
  listTransportInterruptionFormsByCompoundFormKey,
  listAdrFormsByCompoundFormKey,
} from '../../api';
import type {
  DriveRestForm,
  TechnicalCheckFormListItem,
  TechnicalCheckVariant,
  TransportInterruptionFormListItem,
  AdrFormListItem, } from '../../types';
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

/**
 * LJVIS2-72: minimal navigation into the vehicle/trailer technical-check
 * sub-forms of this compound form. Full tab-bar sub-form management
 * ("Koondvormi alamvormide haldamine") is a separate, not-yet-built piece of
 * infrastructure — this list is a stopgap that makes the feature reachable.
 */
function TechnicalCheckFormsSection({
  compoundFormKey,
  canEdit,
}: {
  compoundFormKey: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const [lists, setLists] = useState<
    Record<TechnicalCheckVariant, TechnicalCheckFormListItem[]>
  >({ vehicle: [], trailer: [] });

  useEffect(() => {
    listTechnicalCheckFormsByCompoundFormKey('vehicle', compoundFormKey)
      .then((data) => setLists((prev) => ({ ...prev, vehicle: Array.isArray(data) ? data : [] })))
      .catch(() => setLists((prev) => ({ ...prev, vehicle: [] })));
    listTechnicalCheckFormsByCompoundFormKey('trailer', compoundFormKey)
      .then((data) => setLists((prev) => ({ ...prev, trailer: Array.isArray(data) ? data : [] })))
      .catch(() => setLists((prev) => ({ ...prev, trailer: [] })));
  }, [compoundFormKey]);

  const renderVariant = (variant: TechnicalCheckVariant) => {
    const items = Array.isArray(lists[variant]) ? lists[variant] : [];
    return (
    <div className="mb-1" key={variant}>
      <Heading element="h4">
        {t(
          variant === 'vehicle'
            ? 'forms.technical_check.vehicleTitle'
            : 'forms.technical_check.trailerTitle',
        )}
      </Heading>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/control-forms/${variant}-technical/${item.id}`}>
              {item.subFormNumber}/{item.version}
            </Link>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Link to={`/control-forms/${variant}-technical/new/${compoundFormKey}`}>
          {t('forms.technical_check.addNew')}
        </Link>
      )}
    </div>
  );
  };

  return (
    <div className="mb-1">
      <Heading element="h3">{t('forms.technical_check.sectionTitle')}</Heading>
      {renderVariant('vehicle')}
      {renderVariant('trailer')}
    </div>
  );
}

/**
 * LJVIS2-74: minimal navigation into the transport-interruption sub-form of
 * this compound form. Same stopgap pattern as TechnicalCheckFormsSection above
 * pending the real "Koondvormi alamvormide haldamine" tab-bar infrastructure.
 */
function TransportInterruptionSection({
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
function AdrFormSection({
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

  const [driverForm, setDriverForm] = useState<DriveRestForm | null>(null);
  const [teammateForm, setTeammateForm] = useState<DriveRestForm | null>(null);
  const [subFormsLoaded, setSubFormsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-compound');
  const [driverEditActive, setDriverEditActive] = useState(false);
  const [teammateEditActive, setTeammateEditActive] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [driverDraft, setDriverDraft] = useState<DriveRestForm | null>(null);
  const [teammateDraft, setTeammateDraft] = useState<DriveRestForm | null>(
    null,
  );
  const driverDraftRef = useRef<DriveRestForm | null>(null);
  const teammateDraftRef = useRef<DriveRestForm | null>(null);
  const driverEditCardRef = useRef<DriveRestFormEditCardRef | null>(null);
  const teammateEditCardRef = useRef<DriveRestFormEditCardRef | null>(null);
  const [tabErrors, setTabErrors] = useState<Record<string, boolean>>({});
  const [validatedTabs, setValidatedTabs] = useState<Set<string>>(new Set());
  const [removeConfirmTab, setRemoveConfirmTab] = useState<'tab-driver' | 'tab-teammate' | null>(null);

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

  useEffect(() => {
    if (!form?.id) return;
    const compoundFormKey = Number(form.id);
    Promise.all([
      getDriveRestFormByCompoundFormKey('driver', compoundFormKey),
      getDriveRestFormByCompoundFormKey('teammate', compoundFormKey),
    ])
      .then(([driver, teammate]) => {
        setDriverForm(driver);
        setTeammateForm(teammate);
        const anySubFormSaved =
          driver?.status === 'saved' || teammate?.status === 'saved';
        if (anySubFormSaved) {
          if (driver) setDriverEditActive(hasPermission('sp_driver_form.write'));
          if (teammate) setTeammateEditActive(hasPermission('sp_teammate_form.write'));
        }
      })
      .catch(console.error)
      .finally(() => setSubFormsLoaded(true));
  }, [form?.id]);

  const checkAndAutoConfirmCompound = (
    latestDriver: DriveRestForm | null,
    latestTeammate: DriveRestForm | null,
  ) => {
    if (!form || form.status === 'confirmed') return;
    const forms = [latestDriver, latestTeammate].filter(
      Boolean,
    ) as DriveRestForm[];
    if (forms.length === 0) return;
    const allConfirmed = forms.every((f) => f.status === 'confirmed');
    if (allConfirmed) {
      triggerConfirm();
    }
  };

  const refetchSubForm = (scope: 'driver' | 'teammate', onDone?: () => void) => {
    if (!form?.id) return;
    const siblingScope = scope === 'driver' ? 'teammate' : 'driver';
    getDriveRestFormByCompoundFormKey(scope, Number(form.id))
      .then((res) => {
        if (scope === 'driver') setDriverForm(res);
        else setTeammateForm(res);
        getDriveRestFormByCompoundFormKey(siblingScope, Number(form.id))
          .then((sibling) => {
            const driver = scope === 'driver' ? res : sibling;
            const teammate = scope === 'teammate' ? res : sibling;
            const anySubFormSaved =
              driver?.status === 'saved' || teammate?.status === 'saved';
            if (anySubFormSaved) {
              if (driver) setDriverEditActive(true);
              if (teammate) setTeammateEditActive(true);
            } else {
              if (scope === 'driver') setDriverEditActive(res?.status === 'saved');
              else setTeammateEditActive(res?.status === 'saved');
            }
            checkAndAutoConfirmCompound(driver, teammate);
          })
          .catch(console.error);
        onDone?.();
      })
      .catch(console.error);
  };

  const handleSubFormSaveAll = async () => {
    const driveRestSchema = createDriveRestValidationSchema(t);
    const newTabErrors: Record<string, boolean> = {};
    const editableTabs: string[] = [];

    if (driverEditActive) {
      editableTabs.push('tab-driver');
      const data = driverDraftRef.current ?? driverForm ?? {};
      newTabErrors['tab-driver'] = !(await driveRestSchema.isValid(data));
    }
    if (teammateEditActive) {
      editableTabs.push('tab-teammate');
      const data = teammateDraftRef.current ?? teammateForm ?? {};
      newTabErrors['tab-teammate'] = !(await driveRestSchema.isValid(data));
    }

    setTabErrors(newTabErrors);
    setValidatedTabs((prev) => {
      const next = new Set(prev);
      editableTabs.forEach((tabId) => next.add(tabId));
      return next;
    });

    if (activeTab === 'tab-driver') driverEditCardRef.current?.validateForm?.();
    if (activeTab === 'tab-teammate')
      teammateEditCardRef.current?.validateForm?.();

    const anySubFormHasErrors = Object.values(newTabErrors).some(Boolean);
    if (anySubFormHasErrors) return;

    if (isEditActive) formik.handleSubmit();
    if (driverEditActive) {
      const driverIsNew = !driverForm;
      const driverIsChanged = driverDraft !== null;
      if (driverEditCardRef.current && (driverIsNew || driverIsChanged)) {
        driverEditCardRef.current.save();
      } else if (
        !driverEditCardRef.current &&
        driverDraftRef.current &&
        (driverIsNew || driverIsChanged)
      ) {
        const serialized = serializeDriveRestFormValues(
          driverDraftRef.current as Partial<DriveRestForm> &
            Record<string, unknown>,
          driverForm?.status === 'confirmed' ? 'confirmed' : 'saved',
        );
        updateDriveRestForm('driver', serialized as unknown as DriveRestForm)
          .then(() => {
            setShowSavedAlert(true);
            window.scrollTo(0, 0);
            refetchSubForm('driver', () => {
              driverDraftRef.current = null;
              setDriverDraft(null);
            });
          })
          .catch(console.error);
      }
    }
    if (teammateEditActive) {
      const teammateIsNew = !teammateForm;
      const teammateIsChanged = teammateDraft !== null;
      if (teammateEditCardRef.current && (teammateIsNew || teammateIsChanged)) {
        teammateEditCardRef.current.save();
      } else if (
        !teammateEditCardRef.current &&
        teammateDraftRef.current &&
        (teammateIsNew || teammateIsChanged)
      ) {
        const serialized = serializeDriveRestFormValues(
          teammateDraftRef.current as Partial<DriveRestForm> &
            Record<string, unknown>,
          teammateForm?.status === 'confirmed' ? 'confirmed' : 'saved',
        );
        updateDriveRestForm('teammate', serialized as unknown as DriveRestForm)
          .then(() => {
            setShowSavedAlert(true);
            window.scrollTo(0, 0);
            refetchSubForm('teammate', () => {
              teammateDraftRef.current = null;
              setTeammateDraft(null);
            });
          })
          .catch(console.error);
      }
    }
  };

  const canEdit =
    hasPermission('foreign_violation_form.write') && form?.status !== 'deleted';

  const addableTabs: {
    tabId: 'tab-driver' | 'tab-teammate';
    labelKey: string;
  }[] = [
    ...(!driverForm && !driverEditActive
      ? [
          {
            tabId: 'tab-driver' as const,
            labelKey: 'forms.driver_drive_rest_form',
          },
        ]
      : []),
    ...(!teammateForm && !teammateEditActive
      ? [
          {
            tabId: 'tab-teammate' as const,
            labelKey: 'forms.teammate_drive_rest_form',
          },
        ]
      : []),
  ];

  const addTab = (tabId: 'tab-driver' | 'tab-teammate') => {
    if (tabId === 'tab-driver') setDriverEditActive(true);
    if (tabId === 'tab-teammate') setTeammateEditActive(true);
    setActiveTab(tabId);
  };

  const subFormCount =
    (driverForm && (driverForm.status === 'saved' || driverForm.status === 'confirmed') ? 1 : 0) +
    (teammateForm && (teammateForm.status === 'saved' || teammateForm.status === 'confirmed') ? 1 : 0);

  const handleRemove = (tabId: 'tab-driver' | 'tab-teammate') => {
    const subForm = tabId === 'tab-driver' ? driverForm : teammateForm;
    if (!subForm || subForm.status === undefined) {
      if (tabId === 'tab-driver') { setDriverForm(null); setDriverEditActive(false); }
      if (tabId === 'tab-teammate') { setTeammateForm(null); setTeammateEditActive(false); }
      setActiveTab('tab-compound');
      return;
    }
    setRemoveConfirmTab(tabId);
  };

  const handleRemoveConfirmed = async () => {
    if (!removeConfirmTab) return;
    const subForm = removeConfirmTab === 'tab-driver' ? driverForm : teammateForm;
    const scope = removeConfirmTab === 'tab-driver' ? 'driver' : 'teammate';
    setRemoveConfirmTab(null);
    if (subForm?.id && subForm?.subFormNumber) {
      try {
        await deleteDriveRestForm(scope, String(subForm.id), subForm.subFormNumber, subForm.status ?? '');
      } catch (e) {
        console.error('Delete sub-form failed', e);
        return;
      }
    }
    if (scope === 'driver') { setDriverForm(null); setDriverEditActive(false); }
    if (scope === 'teammate') { setTeammateForm(null); setTeammateEditActive(false); }
    setActiveTab('tab-compound');
    navigate(`/control-forms/compound/${id}`);
  };

  const subFormsAllConfirmed = [driverForm, teammateForm]
    .filter(Boolean)
    .every((f) => f?.status === 'confirmed');
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
    setDriverEditActive(false);
    setTeammateEditActive(false);
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
    () => {
      refetch();
    },
  );

  const resetCompoundFormToSaved = () => {
    if (!form || form.status !== 'confirmed') return;
    triggerSaveAsSaved();
  };

  useEffect(() => {
    if (!snapshotId) return;
    setSnapshotLoading(true);
    getCompoundFormSnapshot(snapshotId, id!)
      .then((res) => {
        const data = Array.isArray(res) ? res[0] : res;
        setSnapshot(data);
        if (data?.county) handleCountyChange();
        if (data?.companyCounty)
          handleCompanyCountyChange();
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

  const handleDeleteAll = async () => {
    try {
      if (driverForm?.id && driverForm?.subFormNumber) {
        await deleteDriveRestForm(
          'driver',
          String(driverForm.id),
          driverForm.subFormNumber,
          driverForm.status ?? '',
        );
      }
      if (teammateForm?.id && teammateForm?.subFormNumber) {
        await deleteDriveRestForm(
          'teammate',
          String(teammateForm.id),
          teammateForm.subFormNumber,
          teammateForm.status ?? '',
        );
      }
      await handleDelete();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

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

  const canEditSubForms = hasPermission('foreign_violation_form.write');
  const canConfirmDriver =
    hasPermission('sp_driver_form.write') &&
    hasPermission('control_form.view_unpublished') &&
    driverForm?.status === 'saved';
  const canConfirmTeammate =
    hasPermission('sp_teammate_form.write') &&
    hasPermission('control_form.view_unpublished') &&
    teammateForm?.status === 'saved';
  const canDeleteAll =
    hasPermission('control_form.delete') &&
    ((driverForm != null && driverForm.status !== 'deleted') ||
      (teammateForm != null && teammateForm.status !== 'deleted') ||
      form?.status !== 'deleted');
  const hasSubForms = driverForm !== null || teammateForm !== null;
  const anyEditActive = isEditActive || driverEditActive || teammateEditActive;

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

  if (!subFormsLoaded) return <Text>{t('common.loading')}</Text>;

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

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.compound_form')}>
          <Tabs.Trigger id="tab-compound">
            {t('forms.compound.generalPart')}
          </Tabs.Trigger>
          {(driverForm || driverEditActive) && (
            <Tabs.Trigger id="tab-driver">
              <span style={{ position: 'relative' }}>
                {t('forms.sp_driver_form')}
                {hasTabErrors('tab-driver') && (
                  <StatusIndicator type="danger" position="top-right" />
                )}
              </span>
              {driverEditActive && subFormCount > 1 && (
                <ClosingButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove('tab-driver');
                  }}
                />
              )}
            </Tabs.Trigger>
          )}
          {(teammateForm || teammateEditActive) && (
            <Tabs.Trigger id="tab-teammate">
              <span style={{ position: 'relative' }}>
                {t('forms.sp_teammate_form')}
                {hasTabErrors('tab-teammate') && (
                  <StatusIndicator type="danger" position="top-right" />
                )}
              </span>
              {teammateEditActive && subFormCount > 1 && (
                <ClosingButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove('tab-teammate');
                  }}
                />
              )}
            </Tabs.Trigger>
          )}
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

        {(driverForm || driverEditActive) && (
          <Tabs.Content id="tab-driver" className="p-1">
            {driverForm && !driverEditActive ? (
              <DriveRestFormViewCard
                scope="driver"
                form={driverForm}
                canEdit={canEditSubForms && driverForm.status !== 'deleted'}
                onEdit={() => setDriverEditActive(true)}
                formType={FORM_TYPE.DRIVER}
              />
            ) : (
              <DriveRestFormEditCard
                ref={driverEditCardRef}
                scope="driver"
                form={driverForm ?? {}}
                compoundFormKey={Number(form.id)}
                onSaved={() => {
                  setTabErrors((p) => ({ ...p, 'tab-driver': false }));
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  if (!driverForm) resetCompoundFormToSaved();
                  refetchSubForm('driver', () => {
                    driverDraftRef.current = null;
                    setDriverDraft(null);
                  });
                }}
                onCancel={() => {
                  setDriverEditActive(false);
                  driverDraftRef.current = null;
                  setDriverDraft(null);
                }}
                canConfirm={canConfirmDriver}
                onConfirm={() => {
                  refetchSubForm('driver', () => {
                    setDriverEditActive(false);
                    driverDraftRef.current = null;
                    setDriverDraft(null);
                  });
                }}
                formType={FORM_TYPE.DRIVER}
                onValuesChange={(v) => {
                  const next = {
                    ...(driverDraftRef.current ?? driverForm ?? {}),
                    ...v,
                  } as DriveRestForm;
                  driverDraftRef.current = next;
                  setDriverDraft(next);
                }}
                initialValidate={validatedTabs.has('tab-driver')}
              />
            )}
          </Tabs.Content>
        )}

        {(teammateForm || teammateEditActive) && (
          <Tabs.Content id="tab-teammate" className="p-1">
            {teammateForm && !teammateEditActive ? (
              <DriveRestFormViewCard
                scope="teammate"
                form={teammateForm}
                canEdit={canEditSubForms && teammateForm.status !== 'deleted'}
                onEdit={() => setTeammateEditActive(true)}
                formType={FORM_TYPE.TEAMMATE}
              />
            ) : (
              <DriveRestFormEditCard
                ref={teammateEditCardRef}
                scope="teammate"
                form={teammateForm ?? {}}
                compoundFormKey={Number(form.id)}
                onSaved={() => {
                  setTabErrors((p) => ({ ...p, 'tab-teammate': false }));
                  setShowSavedAlert(true);
                  window.scrollTo(0, 0);
                  if (!teammateForm) resetCompoundFormToSaved();
                  refetchSubForm('teammate', () => {
                    teammateDraftRef.current = null;
                    setTeammateDraft(null);
                  });
                }}
                onCancel={() => {
                  setTeammateEditActive(false);
                  teammateDraftRef.current = null;
                  setTeammateDraft(null);
                }}
                canConfirm={canConfirmTeammate}
                onConfirm={() => {
                  refetchSubForm('teammate', () => {
                    setTeammateEditActive(false);
                    teammateDraftRef.current = null;
                    setTeammateDraft(null);
                  });
                }}
                formType={FORM_TYPE.TEAMMATE}
                onValuesChange={(v) => {
                  const next = {
                    ...(teammateDraftRef.current ?? teammateForm ?? {}),
                    ...v,
                  } as DriveRestForm;
                  teammateDraftRef.current = next;
                  setTeammateDraft(next);
                }}
                initialValidate={validatedTabs.has('tab-teammate')}
              />
            )}
          </Tabs.Content>
        )}
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
                  if (driverForm) setDriverEditActive(true);
                  if (teammateForm) setTeammateEditActive(true);
                }}
              >
                {t('common.edit')}
              </Button>
            )}
          {anyEditActive && (
            <Button type="button" onClick={handleSubFormSaveAll}>
              {t('common.save')}
            </Button>
          )}
          {canDeleteAll && <DeleteConfirmModal onDelete={handleDeleteAll} />}
        </div>
      </div>
    </div>
  );
}
