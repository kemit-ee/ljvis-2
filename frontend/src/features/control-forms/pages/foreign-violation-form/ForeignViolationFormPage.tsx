import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert } from '@tedi-design-system/react/tedi';
import { useForeignViolationForm } from './useForeignViolationForm';
import { useFormDetail } from './useFormDetail.ts';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { deleteForeignViolationForm, getForeignViolationFormSnapshot } from '../../api';
import { ForeignViolationFormViewCard } from '../../../control-forms/components/ForeignViolationForm/ForeignViolationFormViewCard';
import { ForeignViolationFormEditCard } from '../../../control-forms/components/ForeignViolationForm/ForeignViolationFormEditCard';

export function ForeignViolationFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const forbidden = !((hasPermission('foreign_violation_form.read') || hasPermission('control_form.view_unpublished')) && hasPermission('classifier.read'));

  const [isEditActive, setIsEditActive] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);

  const { form, loading, toDateValue, toTimeValue, refetch } = useFormDetail(snapshotId ? undefined : id);
  const [snapshot, setSnapshot] = useState<import('../../types').ForeignViolationForm | null>(null);
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

  const canEdit = hasPermission('foreign_violation_form.write') && form?.status !== 'deleted';
  const canDelete = hasPermission('control_form.delete') && form?.status !== 'deleted';
  const canConfirm = hasPermission('foreign_violation_form.write') && hasPermission('control_form.view_unpublished') && form?.status !== 'deleted' && form?.status !== 'confirmed';

  const handleEditSaved = () => {
    setIsEditActive(form?.status === 'saved');
    setShowSavedAlert(true);
    setShowConfirmedAlert(false);
    refetch();
  };

  const handleConfirmed = () => {
    setIsEditActive(false);
    setShowSavedAlert(false);
    setShowConfirmedAlert(true);
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
    triggerConfirm,
  } = useForeignViolationForm(form ?? undefined, handleEditSaved, handleConfirmed);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteForeignViolationForm(id);
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
        <Button visualType="link" onClick={() => navigate(`/control-forms/foreign-violation/${id}`)} iconLeft="arrow_back">
          {t('common.back')}
        </Button>
        <ForeignViolationFormViewCard
          form={snapshot}
          isDesktop={isDesktop}
          canEdit={false}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          toDateValue={toDateValue}
          toTimeValue={toTimeValue}
          onEdit={() => {}}
          isSnapshot
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />
      </div>
    );
  }

  if (loading && !form) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (!form) return <Text>{t('common.error')}</Text>;

  return (
    <div>
      {showSavedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowSavedAlert(false)} type="success" size="small">
          {t('forms.savedNote')}
        </Alert>
      )}
      {showConfirmedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowConfirmedAlert(false)} type="success" size="small">
          {t('forms.confirmedNote')}
        </Alert>
      )}

      <Button visualType="link" onClick={() => navigate('/')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      {isEditActive ? (
        <ForeignViolationFormEditCard
          formik={formik}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          canConfirm={canConfirm}
          canDelete={canDelete}
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
          onCancel={() => {
            formik.resetForm();
            setIsEditActive(false);
          }}
          onConfirm={triggerConfirm}
          onDelete={handleDelete}
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />
      ) : (
        <ForeignViolationFormViewCard
          form={form}
          isDesktop={isDesktop}
          canEdit={canEdit}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          toDateValue={toDateValue}
          toTimeValue={toTimeValue}
          onEdit={() => setIsEditActive(true)}
          formType={FORM_TYPE.FOREIGN_VIOLATION}
        />
      )}
    </div>
  );
}
