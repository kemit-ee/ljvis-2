import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text, Alert } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { useLabourInspectionForm } from './useLabourInspectionForm';
import { useLabourInspectionFormDetail } from './useLabourInspectionFormDetail';
import {
  deleteLabourInspectionForm,
  getLabourInspectionFormSnapshot,
} from '../../api';
import type { LabourInspectionForm } from '../../types';
import { LabourInspectionFormFields } from '../../components/LabourInspection/LabourInspectionFormFields';
import { FormVersionsTable } from '../../components/FormVersionsTable/FormVersionsTable';
import styles from './LabourInspectionFormPage.module.css';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';

export function LabourInspectionFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const gridClass = styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'];

  const forbidden = !(
    hasPermission('labour_inspection_form.read') ||
    hasPermission('control_form.view_unpublished')
  );

  const [isEditActive, setIsEditActive] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);

  const { form, loading, refetch } = useLabourInspectionFormDetail(
    snapshotId ? undefined : id,
  );
  const [snapshot, setSnapshot] = useState<LabourInspectionForm | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (!snapshotId || !id) return;
    setSnapshotLoading(true);
    getLabourInspectionFormSnapshot(snapshotId, id)
      .then((res) => setSnapshot(Array.isArray(res) ? res[0] : res))
      .catch(console.error)
      .finally(() => setSnapshotLoading(false));
  }, [snapshotId, id]);

  useEffect(() => {
    if (form?.status === 'saved') {
      setIsEditActive(true);
    }
  }, [form?.status]);

  const isAdmin = useIsAdmin();

  const canEdit =
    (isAdmin || hasPermission('labour_inspection_form.write')) &&
    (form?.status === 'confirmed' || form?.status === 'published');
  const canDelete = isAdmin && form?.status !== 'deleted';
  const canConfirm =
    (isAdmin || hasPermission('labour_inspection_form.write')) &&
    form?.status === 'saved' &&
    (form?.violations?.length ?? 0) === 0;

  const handleEditSaved = () => {
    setIsEditActive(form?.status === 'saved');
    setShowSavedAlert(true);
    setShowConfirmedAlert(false);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
    setVersionsRefreshKey((k) => k + 1);
    refetch();
  };

  const {
    formik,
    transportTypes,
    violationClassifiers,
    addMatrixRow,
    updateMatrixRow,
    removeMatrixRow,
    addViolation,
    removeViolation,
    triggerConfirm,
    formError,
  } = useLabourInspectionForm(form ?? undefined, handleEditSaved, handleConfirmed);

  const handleDelete = async () => {
    if (!id || !form) return;
    try {
      await deleteLabourInspectionForm(id, form.status ?? '');
      navigate('/', { state: { justCreated: true } });
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  if (snapshotId) {
    if (snapshotLoading) return <Text>{t('common.loading')}</Text>;
    if (forbidden) return <Text>{t('common.forbidden')}</Text>;
    if (!snapshot)
      return <FormNotFoundView title={t('forms.labour_inspection_form')} />;
    return (
      <div>
        <Button
          visualType="link"
          onClick={() => navigate(`/control-forms/labour-inspection/${id}`)}
          iconLeft="arrow_back"
        >
          {t('common.back')}
        </Button>
        <div className="card-main">
          <Heading element="h1">
            {snapshot.formNumber
              ? `${snapshot.formNumber}/${snapshot.version ?? 1}`
              : t('forms.labour_inspection_form')}
          </Heading>
        </div>
        <LabourInspectionFormFields
          formik={{
            values: snapshot,
            touched: {},
            errors: {},
            setFieldValue: () => Promise.resolve(),
          } as never}
          gridClass={gridClass}
          readOnly
          transportTypes={transportTypes}
          violationClassifiers={violationClassifiers}
          addMatrixRow={() => {}}
          updateMatrixRow={() => {}}
          removeMatrixRow={() => {}}
          addViolation={() => {}}
          removeViolation={() => {}}
        />
      </div>
    );
  }

  if (loading && !form) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!form)
    return <FormNotFoundView title={t('forms.labour_inspection_form')} />;

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
      {formError && (
        <Alert type="danger" size="small" className="mb-1">
          {formError}
        </Alert>
      )}
      {isEditActive && formik.dirty && (
        <Alert icon="warning" type="warning" size="small" className="mb-1">
          {t('forms.labour_inspection.unsavedChangesWarning')}
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
            ? `${form.formNumber}/${form.version ?? 1}`
            : t('forms.labour_inspection_form')}
        </Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <LabourInspectionFormFields
          formik={formik}
          gridClass={gridClass}
          readOnly={!isEditActive}
          transportTypes={transportTypes}
          violationClassifiers={violationClassifiers}
          addMatrixRow={addMatrixRow}
          updateMatrixRow={updateMatrixRow}
          removeMatrixRow={removeMatrixRow}
          addViolation={addViolation}
          removeViolation={removeViolation}
        />

        {id && (
          <FormVersionsTable
            formId={id}
            formType={FORM_TYPE.LABOUR_INSPECTION}
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
              </>
            ) : (
              canEdit && (
                <AsyncButton
                  type="button"
                  iconLeft="edit"
                  visualType="secondary"
                  onClick={() => setIsEditActive(true)}
                >
                  {t('common.edit')}
                </AsyncButton>
              )
            )}
            {isEditActive && canDelete && (
              <DeleteConfirmModal onDelete={handleDelete} />
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
