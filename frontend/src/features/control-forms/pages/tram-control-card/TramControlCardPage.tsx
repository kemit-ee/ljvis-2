import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert } from '@tedi-design-system/react/tedi';
import { useTramControlCard } from './useTramControlCard';
import { useTramControlCardDetail } from './useTramControlCardDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { BREAKPOINTS } from '../../../../constants/constants';
import { getTramFormSnapshot, deleteTramForm } from '../../api';
import type { TramControlCard, Driver } from '../../types';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { TramDriverControlSection } from '../../components/TramControlCard/TramDriverControlSection';
import { EtoimikQueryCard } from '../../components/EtoimikQueryCard/EtoimikQueryCard';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';

const FORM_TYPE = 'tram-card';

/**
 * Transpordiameti (TRAM) kontrollkaart — ADR-002: üks olem, üks elutsükkel.
 * Serves:
 *   /control-forms/tram-control-card/new
 *   /control-forms/tram-control-card/:id
 *   /control-forms/tram-control-card/:id/:snapshotId
 */
export function TramControlCardPage() {
  const { id: idParam, snapshotId } = useParams<{
    id: string;
    snapshotId?: string;
  }>();
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

  const [isEditActive, setIsEditActive] = useState(isNew);
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

  const { form, loading, refetch } = useTramControlCardDetail(
    snapshotId ? undefined : id,
  );
  const [snapshot, setSnapshot] = useState<TramControlCard | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (!snapshotId || !id) return;
    setSnapshotLoading(true);
    getTramFormSnapshot(snapshotId, id)
      .then((res) =>
        setSnapshot(
          (Array.isArray(res) ? res[0] : res) as TramControlCard | null,
        ),
      )
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  useEffect(() => {
    if (form?.status === 'saved' && hasPermission('tram_driver_form.write')) {
      setIsEditActive(true);
    }
  }, [form?.status, hasPermission]);

  const handleSaved = (savedId?: string) => {
    if (isNew && savedId) {
      navigate(`/control-forms/tram-control-card/${savedId}`, {
        state: { justCreated: true },
      });
      return;
    }
    setShowSavedAlert(true);
    setShowConfirmedAlert(false);
    setShowPublishedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
    setShowPublishedAlert(false);
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
    triggerPublish,
  } = useTramControlCard(
    (snapshot ?? form) ?? undefined,
    handleSaved,
    handleConfirmed,
    () => {
      setVersionsRefreshKey((k) => k + 1);
      refetch();
    },
    handlePublished,
  );

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteTramForm(id, form.status ?? '');
      navigate('/', { state: { justCreated: true } });
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  const status = form?.status;
  const canDelete =
    hasPermission('control_form.delete') && status !== 'deleted';
  const canEditLocked =
    isAdmin && (status === 'confirmed' || status === 'published');
  const canConfirm =
    hasPermission('tram_driver_form.write') && status === 'saved';
  const canPublish =
    hasPermission('tram_driver_form.write') && status === 'confirmed';

  const sharedProps = {
    isDesktop,
    orgOptions,
    structureUnits,
    roads,
    trailerCategories,
    vehicleCategories,
    counties,
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as {
      id: number;
      name: string;
    }[],
  };

  const editCardProps = {
    formik: formik as never,
    ...sharedProps,
    canConfirm: false,
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
    onConfirm: () => {},
    onDelete: handleDelete,
    formType: FORM_TYPE,
    versionsRefreshKey,
  };

  // ── Snapshot view ────────────────────────────────────────────────
  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (!snapshot)
      return <FormNotFoundView title={t('forms.tram_control_card_form')} />;
    return (
      <div>
        <CompoundFormViewCard
          form={snapshot}
          {...sharedProps}
          canEdit={false}
          onEdit={() => {}}
          isSnapshot
          formType={FORM_TYPE}
        />
        <TramDriverControlSection
          formik={
            {
              values: {
                transportType: snapshot.transportType ?? '',
                resultType: snapshot.resultType ?? 'ok',
                proceedingType: snapshot.proceedingType ?? 'none',
                proceedingReferenceNumber:
                  snapshot.proceedingReferenceNumber ?? '',
                notes: snapshot.notes ?? '',
                driverNotApplicable: snapshot.driverNotApplicable,
              },
              touched: {},
              errors: {},
              setFieldValue: () => Promise.resolve(),
            } as never
          }
        />
      </div>
    );
  }

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (!isNew && !form)
    return <FormNotFoundView title={t('forms.tram_control_card_form')} />;

  const drivers: Driver[] = Array.isArray(form?.drivers)
    ? (form.drivers as Driver[])
    : typeof form?.drivers === 'string'
      ? (JSON.parse(form.drivers) as Driver[])
      : [];
  const etoimikReferenceOptions = form?.proceedingReferenceNumber
    ? [
        {
          label: `${form.formNumber ?? ''} — ${form.proceedingReferenceNumber}`,
          value: form.proceedingReferenceNumber,
        },
      ]
    : [];

  const alerts = (
    <>
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
      {formik.submitCount > 0 && !formik.isValid && !formik.isSubmitting && (
        <Alert icon="error" className="mb-1" type="danger" size="small">
          {t('forms.validationErrorNote')}
        </Alert>
      )}
    </>
  );

  const showEdit = isNew || isEditActive;

  return (
    <div>
      {alerts}

      {!isNew && form && id && drivers.length > 0 && (
        <EtoimikQueryCard
          drivers={drivers}
          referenceNumberOptions={etoimikReferenceOptions}
          compoundFormKey={Number(id)}
        />
      )}

      {showEdit ? (
        <>
          <CompoundFormEditCard {...editCardProps} />
          <TramDriverControlSection formik={formik as never} />
        </>
      ) : (
        <>
          <CompoundFormViewCard
            form={form!}
            {...sharedProps}
            canEdit={canEditLocked}
            onEdit={() => setIsEditActive(true)}
            formType={FORM_TYPE}
            versionsRefreshKey={versionsRefreshKey}
          />
          <TramDriverControlSection formik={formik as never} />
        </>
      )}

      <div className="page-actions mt-1">
        <div className="page-actions-buttons">
          {showEdit ? (
            <>
              {!isNew && (
                <Button
                  type="button"
                  visualType="secondary"
                  onClick={() => {
                    formik.resetForm();
                    setIsEditActive(false);
                  }}
                >
                  {t('common.cancel')}
                </Button>
              )}
              <AsyncButton
                type="button"
                onClick={() => {
                  formik.handleSubmit();
                  window.scrollTo(0, 0);
                }}
              >
                {t('common.save')}
              </AsyncButton>
              {canConfirm && (
                <AsyncButton type="button" onClick={() => triggerConfirm()}>
                  {t('common.confirm')}
                </AsyncButton>
              )}
            </>
          ) : (
            <>
              {canEditLocked && (
                <Button
                  type="button"
                  iconLeft="edit"
                  visualType="secondary"
                  onClick={() => setIsEditActive(true)}
                >
                  {t('common.edit')}
                </Button>
              )}
              {canPublish && (
                <AsyncButton type="button" onClick={() => triggerPublish()}>
                  {t('common.publish')}
                </AsyncButton>
              )}
            </>
          )}
          {canDelete && !isNew && (
            <DeleteConfirmModal onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
