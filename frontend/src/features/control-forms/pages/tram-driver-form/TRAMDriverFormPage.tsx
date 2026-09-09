import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert, Tabs, StatusIndicator } from '@tedi-design-system/react/tedi';
import { useCompoundForm } from '../compound-form/useCompoundForm';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { useContainerWidth } from '../../../../hooks/useContainerWidth';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { BREAKPOINTS } from '../../../../constants/constants';
import {
  getTramForm,
  getTramFormSnapshot,
  getTramDriverFormByCompoundFormKey,
  deleteTramForm,
  publishTramDriverForm,
} from '../../api';
import type { CompoundForm, DriveRestForm, Driver } from '../../types';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { EtoimikQueryCard } from '../../components/EtoimikQueryCard/EtoimikQueryCard';
import { DriveRestFormViewCard } from '../../components/DriveRestForm/DriveRestFormViewCard';
import {
  DriveRestFormEditCard,
  type DriveRestFormEditCardRef,
} from '../../components/DriveRestForm/DriveRestFormEditCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal';
import { SubFormTab } from '../../components/SubFormTab/SubFormTab';
import { useSubForm } from '../../hooks/useSubForm';

const TRAM_FORM_TYPE = 'tram-form';
const TRAM_DRIVER_FORM_TYPE = 'tram-form/sp-driver';

/**
 * Transpordiameti (TRAM) autojuhi kontrollkaart — issue #180.
 *
 * Käitub nagu koondvorm + üks autojuhi alamvorm, aga eraldi endpointidel
 * (authority='TRAM') ja ilma teiste alamvormideta. Autojuht EI OLE
 * kohustuslik — kaardi saab salvestada ka ilma juhi andmeteta.
 *
 * Sama komponent teenindab:
 *   /control-forms/tram-driver/new            — uue kaardi loomine
 *   /control-forms/tram-driver/:id            — olemasoleva vaatamine/muutmine
 *   /control-forms/tram-driver/:id/:snapshotId — versiooniajaloo hetktõmmis
 */
export function TRAMDriverFormPage() {
  const { id: idParam, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const isNew = !idParam || idParam === 'new';
  const id = isNew ? undefined : idParam;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const isAdmin = useIsAdmin();

  const forbidden = !(
    (isNew
      ? hasPermission('tram_driver_form.write')
      : hasPermission('tram_driver_form.read')) && hasPermission('classifier.read')
  );

  const [form, setForm] = useState<CompoundForm | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [snapshot, setSnapshot] = useState<CompoundForm | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  const [isEditActive, setIsEditActive] = useState(isNew);
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('tab-compound');
  // P1: autojuhi alamvorm on TRAM kaardil alati nähtav (olemasoleval kaardil),
  // ilma et peaks „Lisa autojuht" nuppu vajutama. Uue kaardi puhul tuleb üldosa
  // esmalt salvestada (alamvorm vajab compoundFormKey'd).
  const [driverTabOpen, setDriverTabOpen] = useState(!isNew && !snapshotId);
  const [compoundTabError, setCompoundTabError] = useState(false);

  const driver = useSubForm<DriveRestForm, DriveRestFormEditCardRef>({
    permPrefix: 'tram_driver_form',
  });

  const containerWidth = useContainerWidth(isDesktop, driverTabOpen ? ['tab-driver'] : []);

  const refetchCompound = () => {
    if (!id) return;
    getTramForm(Number(id))
      .then((res) => setForm(res ?? null))
      .catch(console.error);
  };

  const refetchDriver = (onDone?: () => void) => {
    if (!id) return;
    getTramDriverFormByCompoundFormKey(Number(id))
      .then((res) => {
        driver.setForm(res);
        onDone?.();
      })
      .catch(console.error);
  };

  // Load the existing card + its driver sub-form
  useEffect(() => {
    if (isNew || snapshotId) {
      setLoading(false);
      driver.setLoaded(true);
      return;
    }
    setLoading(true);
    getTramForm(Number(id))
      .then(async (res) => {
        setForm(res ?? null);
        if (res?.status === 'saved' && hasPermission('tram_driver_form.write')) {
          setIsEditActive(true);
        }
        const driverRes = await getTramDriverFormByCompoundFormKey(Number(id)).catch(
          () => null,
        );
        driver.setForm(driverRes);
        setDriverTabOpen(true);
        if (driverRes) {
          if (driverRes.status === 'saved') {
            driver.setEditActive(hasPermission('tram_driver_form.write'));
          }
        } else if (hasPermission('tram_driver_form.write')) {
          // Alamvorm on veel salvestamata — ava kohe muutmisrežiimis.
          driver.setEditActive(true);
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        driver.setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, snapshotId]);

  // Snapshot view
  useEffect(() => {
    if (!snapshotId || !id) return;
    setSnapshotLoading(true);
    getTramFormSnapshot(snapshotId, id)
      .then((res) => setSnapshot(Array.isArray(res) ? res[0] : res))
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  const handleCompoundSaved = (savedId?: string) => {
    if (isNew && savedId) {
      navigate(`/control-forms/tram-driver/${savedId}`, {
        state: { justCreated: true },
      });
      return;
    }
    setIsEditActive(true);
    setShowSavedAlert(true);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(false);
    setCompoundTabError(false);
    setVersionsRefreshKey((k) => k + 1);
    refetchCompound();
  };

  const handleCompoundConfirmed = () => {
    setIsEditActive(false);
    driver.setEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetchCompound();
  };

  const handleCompoundPublished = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetchCompound();
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
    driverSearchError,
    setDriverSearchError,
    driverSearchNotFound,
    setDriverSearchNotFound,
    driverSearchLoading,
    handleCompanySearch,
    handleCompanyNameSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    handleDriverPersonSearch,
    triggerConfirm,
  } = useCompoundForm(
    form ?? undefined,
    handleCompoundSaved,
    handleCompoundConfirmed,
    true,
    () => {
      setVersionsRefreshKey((k) => k + 1);
      refetchCompound();
    },
    handleCompoundPublished,
    'TRAM',
  );

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteTramForm(id, form.formNumber, form.status ?? '');
      navigate('/', { state: { justCreated: true } });
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  // ── Snapshot view ────────────────────────────────────────────────
  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (!snapshot) return <Text>{t('common.error')}</Text>;
    return (
      <div>
        <CompoundFormViewCard
          form={snapshot}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          roads={roads}
          trailerCategories={trailerCategories}
          vehicleCategories={vehicleCategories}
          counties={counties}
          citiesParishes={citiesParishes as { id: number; name: string }[]}
          companyCitiesParishes={companyCitiesParishes as { id: number; name: string }[]}
          canEdit={false}
          onEdit={() => {}}
          isSnapshot
          formType={TRAM_FORM_TYPE}
        />
      </div>
    );
  }

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (!isNew && !form) return <Text>{t('common.error')}</Text>;

  const canEdit = isAdmin && form?.status !== 'deleted';
  const canDelete = hasPermission('control_form.delete') && form?.status !== 'deleted';

  // P1: e-toimiku kvalifikatsioonide päringu kaart (kirjutuskaitstud, midagi ei
  // salvestata). Juhi tuvastusandmed on juba compound_form.drivers[]-il,
  // menetluse viitenumber autojuhi alamvormil.
  const compoundFormDrivers: Driver[] = Array.isArray(form?.drivers)
    ? (form.drivers as Driver[])
    : typeof form?.drivers === 'string'
      ? (JSON.parse(form.drivers) as Driver[])
      : [];
  const etoimikReferenceOptions = driver.form?.proceedingReferenceNumber
    ? [
        {
          label: `${t('forms.sp_driver_form')} ${driver.form.subFormNumber ?? ''} — ${driver.form.proceedingReferenceNumber}`,
          value: driver.form.proceedingReferenceNumber,
        },
      ]
    : [];

  const sharedProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as { id: number; name: string }[],
  };

  const editCardProps = {
    formik,
    ...sharedProps,
    canConfirm: hasPermission('tram_driver_form.write'),
    canDelete,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    trailerSearchError,
    setTrailerSearchError,
    mtrSearchError,
    setMtrSearchError,
    driverSearchError,
    setDriverSearchError,
    driverSearchNotFound,
    setDriverSearchNotFound,
    driverSearchLoading,
    handleDriverPersonSearch,
    authority: 'TRAM' as const,
    handleOrgChange,
    handleStructuralUnitChange,
    handleCountyChange,
    handleCompanyCountyChange,
    handleCompanySearch,
    handleCompanyNameSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    handleVehicleSearch,
    handleTrailerSearch,
    handleMtrSearch,
    onCancel: () => {
      formik.resetForm();
      if (isNew) navigate('/');
      else setIsEditActive(false);
    },
    onConfirm: triggerConfirm,
    onDelete: handleDelete,
    formType: TRAM_FORM_TYPE,
    versionsRefreshKey,
  };

  const alerts = (
    <>
      {showSavedAlert && !showConfirmedAlert && !showPublishedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowSavedAlert(false)} type="success" size="small">
          {t('forms.savedNote')}
        </Alert>
      )}
      {showConfirmedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowConfirmedAlert(false)} type="success" size="small">
          {t('forms.confirmedNote')}
        </Alert>
      )}
      {showPublishedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowPublishedAlert(false)} type="success" size="small">
          {t('forms.publishedNote')}
        </Alert>
      )}
    </>
  );

  // ── Create mode: single compound card, no tabs (alamvorm vajab salvestatud
  //    üldosa compoundFormKey'd; pärast salvestamist avaneb autojuhi vahekaart) ──
  if (isNew) {
    return (
      <div>
        {alerts}
        <CompoundFormEditCard {...editCardProps} />
        <div className="page-actions mt-1">
          <div className="page-actions-buttons">
            <Button type="button" onClick={() => formik.handleSubmit()}>
              {t('common.save')}
            </Button>
            {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
          </div>
        </div>
      </div>
    );
  }

  // ── Existing card with driver tab ────────────────────────────────
  return (
    <div style={{ maxWidth: containerWidth }}>
      {alerts}

      {form && id && (
        <EtoimikQueryCard
          drivers={compoundFormDrivers}
          referenceNumberOptions={etoimikReferenceOptions}
          compoundFormKey={Number(id)}
        />
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List aria-label={t('forms.tram_driver_form')} overflowMode="scroll">
          <Tabs.Trigger id="tab-compound">
            <span style={{ position: 'relative' }}>
              {t('forms.compound.generalPart')}
              {compoundTabError && <StatusIndicator type="danger" position="top-right" />}
            </span>
          </Tabs.Trigger>
          {driverTabOpen && (
            <Tabs.Trigger id="tab-driver">
              <span>{t('forms.sp_driver_form')}</span>
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content id="tab-compound" className="p-1">
          {isEditActive ? (
            <CompoundFormEditCard {...editCardProps} />
          ) : (
            <CompoundFormViewCard
              form={form!}
              {...sharedProps}
              canEdit={canEdit}
              onEdit={() => setIsEditActive(true)}
              formType={TRAM_FORM_TYPE}
              versionsRefreshKey={versionsRefreshKey}
            />
          )}
        </Tabs.Content>

        <SubFormTab
          id="tab-driver"
          open={driverTabOpen}
          subForm={driver}
          renderView={(driverForm) => (
            <DriveRestFormViewCard
              scope="driver"
              form={driverForm}
              formType={TRAM_DRIVER_FORM_TYPE}
              hideDriveRestExtras
              canPublish={
                hasPermission('tram_driver_form.write') &&
                driverForm.status === 'confirmed'
              }
              onPublish={() =>
                publishTramDriverForm(driverForm.id!).then(() => refetchDriver())
              }
            />
          )}
          renderEdit={(driverForm, ref) => (
            <DriveRestFormEditCard
              ref={ref}
              scope="driver"
              authority="TRAM"
              form={driver.draft ?? driverForm}
              compoundFormKey={Number(id)}
              onSaved={() => {
                setShowSavedAlert(true);
                window.scrollTo(0, 0);
                refetchDriver(() => driver.resetDraft());
              }}
              onCancel={() => {
                if (!driver.form) {
                  setDriverTabOpen(false);
                  setActiveTab('tab-compound');
                }
                driver.setEditActive(false);
                driver.resetDraft();
              }}
              canConfirm={hasPermission('tram_driver_form.write')}
              onConfirm={() => {
                refetchDriver(() => {
                  driver.setEditActive(false);
                  driver.resetDraft();
                });
              }}
              formType={TRAM_DRIVER_FORM_TYPE}
              onValuesChange={(v) => {
                driver.setDraftValue({
                  ...(driver.draftRef.current ?? driverForm ?? {}),
                  ...v,
                } as DriveRestForm);
              }}
            />
          )}
        />
      </Tabs>

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {isAdmin && !isEditActive && !driver.editActive && form?.status !== 'deleted' && (
            <Button
              iconLeft="edit"
              type="button"
              visualType="secondary"
              onClick={() => {
                setIsEditActive(true);
                if (driver.form) driver.setEditActive(true);
              }}
            >
              {t('common.edit')}
            </Button>
          )}
          {(isEditActive || driver.editActive) && (
            <Button
              type="button"
              onClick={() => {
                if (isEditActive) formik.handleSubmit();
                if (driver.editActive) driver.editCardRef.current?.save();
              }}
            >
              {t('common.save')}
            </Button>
          )}
          {canDelete && <DeleteConfirmModal onDelete={handleDelete} />}
        </div>
      </div>
    </div>
  );
}
