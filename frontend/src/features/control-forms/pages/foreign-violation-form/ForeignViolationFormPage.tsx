import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert, Heading } from '@tedi-design-system/react/tedi';
import { useForeignViolationForm } from './useForeignViolationForm';
import { useFormDetail } from './useFormDetail.ts';
import { useAuth } from '../../../auth/AuthContext';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import {
  deleteForeignViolationForm,
  getForeignViolationFormSnapshot,
} from '../../api';
import { ForeignViolationFormFields } from '../../components/ForeignViolationForm/ForeignViolationFormFields.tsx';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal.tsx';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormVersionsTable } from '../../components/FormVersionsTable/FormVersionsTable.tsx';

export function ForeignViolationFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const forbidden = !(
    (hasPermission('foreign_violation_form.read') ||
      hasPermission('control_form.view_unpublished')) &&
    hasPermission('classifier.read')
  );

  const [isEditActive, setIsEditActive] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [showPublishedAlert, setShowPublishedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

  const { form, loading, refetch } = useFormDetail(
    snapshotId ? undefined : id,
  );
  const [snapshot, setSnapshot] = useState<
    import('../../types').ForeignViolationForm | null
  >(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (!snapshotId) return;
    setSnapshotLoading(true);
    getForeignViolationFormSnapshot(snapshotId, id!)
      .then((res) => setSnapshot(Array.isArray(res) ? res[0] : res))
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId]);

  useEffect(() => {
    if (form?.status === 'saved') {
      setIsEditActive(true);
    }
  }, [form?.status]);

  const isAdmin = useIsAdmin();

  const canEdit =
    (isAdmin || hasPermission('foreign_violation_form.write') &&
      (form?.status === 'confirmed' || form?.status === 'published'));
  const canDelete = isAdmin && form?.status !== 'deleted';
  const canConfirm =
    (isAdmin || hasPermission('foreign_violation_form.write')) &&
    form?.status === 'saved';
  const canPublish =
    (isAdmin || hasPermission('foreign_violation_form.write')) &&
    form?.status === 'confirmed';

  const handleEditSaved = () => {
    setIsEditActive(form?.status === 'saved');
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
    handleOrgChange,
    handleStructuralUnitChange,
    companySearchError,
    setCompanySearchError,
    vehicleSearchError,
    setVehicleSearchError,
    licenceCopyNumberError,
    setLicenceCopyNumberError,
    handleCompanyRegCodeSearch,
    handleCompanyNameSearch,
    handleVehicleSearch,
    handleLicenceCopyNumberSearch,
    companyPickerResults,
    onCompanyPicked,
    closeCompanyPicker,
    associatedPersons,
    associatedPersonsLoading,
    triggerConfirm,
    triggerPublish,
  } = useForeignViolationForm(
    form ?? undefined,
    handleEditSaved,
    handleConfirmed,
    handlePublished,
  );

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteForeignViolationForm(id, form.formNumber, form.status ?? '');
      navigate(`/`, { state: { justCreated: true } });
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
          onClick={() => navigate(`/control-forms/foreign-violation/${id}`)}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>
        <div className="card-main">
          <Heading element="h1">
            {snapshot.formNumber
              ? `${snapshot.formNumber}/${(snapshot as { version?: number }).version ?? 1}`
              : t('forms.foreign_violation_form')}
          </Heading>
        </div>
        <ForeignViolationFormFields
          formik={
            {
              values: snapshot,
              errors: {},
              touched: {},
              setFieldValue: () => Promise.resolve(),
            } as never
          }
          readOnly
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />

        {id && (
          <FormVersionsTable
            formId={id}
            formType={FORM_TYPE.FOREIGN_VIOLATION}
            refreshKey={versionsRefreshKey}
          />
        )}
      </div>
    );
  }

  if (loading && !form) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!form) return <Text>{t('common.error')}</Text>;

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

      <div className="card-main">
        <Heading element="h1">
          {form.formNumber
            ? `${form.formNumber}/${(form as { version?: number }).version ?? 1}`
            : t('forms.foreign_violation_form')}
        </Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <ForeignViolationFormFields
          formik={formik as never}
          readOnly={!isEditActive}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          companySearchError={companySearchError}
          setCompanySearchError={setCompanySearchError}
          vehicleSearchError={vehicleSearchError}
          setVehicleSearchError={setVehicleSearchError}
          licenceCopyNumberError={licenceCopyNumberError}
          setLicenceCopyNumberError={setLicenceCopyNumberError}
          handleOrgChange={handleOrgChange}
          handleStructuralUnitChange={handleStructuralUnitChange}
          handleCompanyRegCodeSearch={handleCompanyRegCodeSearch}
          handleCompanyNameSearch={handleCompanyNameSearch}
          handleVehicleSearch={handleVehicleSearch}
          handleLicenceCopyNumberSearch={handleLicenceCopyNumberSearch}
          companyPickerResults={companyPickerResults}
          onCompanyPicked={onCompanyPicked}
          closeCompanyPicker={closeCompanyPicker}
          associatedPersons={associatedPersons}
          associatedPersonsLoading={associatedPersonsLoading}
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />

        {id && (
          <FormVersionsTable
            formId={id}
            formType={FORM_TYPE.FOREIGN_VIOLATION}
            refreshKey={versionsRefreshKey}
          />
        )}

        <div className="page-actions">
          <div className="page-actions-buttons">
            {isEditActive ? (
              <>
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
                <AsyncButton type="button" onClick={() => formik.submitForm()}>
                  {t('common.save')}
                </AsyncButton>
                {canConfirm && (
                  <AsyncButton type="button" onClick={() => triggerConfirm()}>
                    {t('common.confirm')}
                  </AsyncButton>
                )}
                {isEditActive && canDelete && (
                  <DeleteConfirmModal onDelete={handleDelete} />
                )}
              </>
            ) : (
              canEdit && (
                <>
                  <Button
                    iconLeft="edit"
                    type="button"
                    visualType="secondary"
                    onClick={() => setIsEditActive(true)}
                  >
                    {t('common.edit')}
                  </Button>
                  {canPublish && (
                    <AsyncButton type="button" onClick={() => triggerPublish()}>
                      {t('common.publish')}
                    </AsyncButton>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
