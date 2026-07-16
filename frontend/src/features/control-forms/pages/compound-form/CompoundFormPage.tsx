import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Text, Alert } from '@tedi-design-system/react/tedi';
import { useCompoundForm } from './useCompoundForm';
import { useCompoundFormDetail } from './useCompoundFormDetail';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, FORM_TYPE } from '../../../../constants/constants';
import { deleteCompoundForm, getCompoundFormSnapshot } from '../../api';
import { CompoundFormViewCard } from '../../components/CompoundForm/CompoundFormViewCard';
import { CompoundFormEditCard } from '../../components/CompoundForm/CompoundFormEditCard';

export function CompoundFormPage() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const forbidden = !((hasPermission('compound_form.read') || hasPermission('control_form.view_unpublished')) && hasPermission('classifier.read'));

  const [isEditActive, setIsEditActive] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showSavedAlert, setShowSavedAlert] = useState(
    !!(location.state as { justCreated?: boolean })?.justCreated,
  );
  const [showConfirmedAlert, setShowConfirmedAlert] = useState(false);

  const { form, loading, toDateValue, toTimeValue, refetch } = useCompoundFormDetail(snapshotId ? undefined : id);
  const [snapshot, setSnapshot] = useState<import('../../types').CompoundForm | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(!!snapshotId);

  useEffect(() => {
    if (!snapshotId) return;
    setSnapshotLoading(true);
    getCompoundFormSnapshot(snapshotId, id!)
      .then((res) => {
        const data = Array.isArray(res) ? res[0] : res;
        setSnapshot(data);
        if (data?.county) handleCountyChange(Number(data.county));
        if (data?.companyCounty) handleCompanyCountyChange(Number(data.companyCounty));
      })
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
  } = useCompoundForm(form ?? undefined, handleEditSaved, handleConfirmed);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteCompoundForm(id);
      navigate('/', { state: { justCreated: true } });
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
        <Button visualType="link" onClick={() => navigate(`/control-forms/compound/${id}`)} iconLeft="arrow_back">
          {t('common.back')}
        </Button>
        <CompoundFormViewCard
          form={snapshot}
          isDesktop={isDesktop}
          orgOptions={orgOptions}
          structureUnits={structureUnits}
          roads={roads as { code: string; name: string }[]}
          trailerCategories={trailerCategories as { code: string; name: string }[]}
          vehicleCategories={vehicleCategories as { code: string; name: string }[]}
          counties={counties as { id: number; name: string }[]}
          citiesParishes={citiesParishes as { id: number; name: string }[]}
          companyCitiesParishes={companyCitiesParishes as { id: number; name: string }[]}
          canEdit={false}
          onEdit={() => {}}
          isSnapshot
          toDateValue={toDateValue}
          toTimeValue={toTimeValue}
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
    roads: roads as { code: string; name: string }[],
    trailerCategories: trailerCategories as { code: string; name: string }[],
    vehicleCategories: vehicleCategories as { code: string; name: string }[],
    counties: counties as { id: number; name: string }[],
    citiesParishes: citiesParishes as { id: number; name: string }[],
    companyCitiesParishes: companyCitiesParishes as { id: number; name: string }[],
  };

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
        <CompoundFormEditCard
          formik={formik}
          {...sharedProps}
          canConfirm={canConfirm}
          canDelete={canDelete}
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
            setIsEditActive(false);
          }}
          onConfirm={triggerConfirm}
          onDelete={handleDelete}
          formType={FORM_TYPE.COMPOUND}
        />
      ) : (
        <CompoundFormViewCard
          form={form}
          {...sharedProps}
          canEdit={canEdit}
          onEdit={() => setIsEditActive(true)}
          toDateValue={toDateValue}
          toTimeValue={toTimeValue}
          formType={FORM_TYPE.COMPOUND}
        />
      )}
    </div>
  );
}
