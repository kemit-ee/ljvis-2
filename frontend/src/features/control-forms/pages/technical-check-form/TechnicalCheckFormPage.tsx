import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Text, Alert } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import type { TechnicalCheckVariant } from '../../types';
import { useTechnicalCheckForm } from './useTechnicalCheckForm';
import { useTechnicalCheckFormDetail } from './useTechnicalCheckFormDetail';
import { TechnicalCheckFormFields } from './TechnicalCheckFormFields';
import { saveTechnicalCheckFormXroadFields } from '../../api';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';

interface TechnicalCheckFormPageProps {
  variant: TechnicalCheckVariant;
}

export function TechnicalCheckFormPage({ variant }: TechnicalCheckFormPageProps) {
  const { id, compoundFormKey: compoundFormKeyParam } = useParams<{
    id?: string;
    compoundFormKey?: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const permPrefix = variant === 'vehicle' ? 'vehicle_technical_form' : 'trailer_technical_form';
  const titleKey =
    variant === 'vehicle' ? 'forms.technical_check.vehicleTitle' : 'forms.technical_check.trailerTitle';

  const forbidden = !(
    hasPermission(`${permPrefix}.read`) || hasPermission('control_form.view_unpublished')
  );

  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [xroadError, setXroadError] = useState<string | null>(null);

  const { form, loading, refetch } = useTechnicalCheckFormDetail(variant, id);

  const compoundFormKey =
    form?.compoundFormKey ??
    (compoundFormKeyParam ? Number(compoundFormKeyParam) : undefined);

  const handleSaved = (newId?: string) => {
    setShowSavedAlert(true);
    refetch();
    if (newId && !id) {
      navigate(`/control-forms/${variant}-technical/${newId}`, {
        replace: true,
        state: { justCreated: true },
      });
    }
  };

  const isEditLocked = hasPermission('control_form.edit_locked');

  const { formik, parts, defectsByPartKey, euViolations, applyPartDefects, setPartStatus, removeDefect, setResultType, toggleViolation, triggerConfirm, formError } =
    useTechnicalCheckForm(variant, form ?? undefined, handleSaved, compoundFormKey, isEditLocked);

  useEffect(() => {
    setShowSavedAlert(!!(location.state as { justCreated?: boolean })?.justCreated);
  }, [location.state]);

  const status = form?.status ?? 'saved';
  const canEdit =
    hasPermission(`${permPrefix}.write`) &&
    status !== 'published' &&
    (status !== 'confirmed' || isEditLocked);
  const canConfirm = !!id && status === 'saved' && hasPermission(`${permPrefix}.write`);
  const canEditXroadFields = isEditLocked && status === 'confirmed';
  const xroadBlockVisible = status !== 'saved';

  const handleSaveXroadFields = async () => {
    if (!id) return;
    setXroadError(null);
    try {
      await saveTechnicalCheckFormXroadFields(variant, {
        id,
        extraordinaryInspectionDate: formik.values.extraordinaryInspectionDate as string,
        enforcementDecision: formik.values.enforcementDecision as string,
        proceedingClosureBasis: formik.values.proceedingClosureBasis as string,
      });
      setShowSavedAlert(true);
      refetch();
    } catch (e) {
      console.error('Save X-tee fields failed', e);
      setXroadError(t('forms.technical_check.xroad.saveError'));
    }
  };

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (id && !form) return <FormNotFoundView title={t(titleKey)} />;

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
      {xroadError && (
        <Alert type="danger" size="small" className="mb-1">
          {xroadError}
        </Alert>
      )}
      {formError && (
        <Alert type="danger" size="small" className="mb-1">
          {formError}
        </Alert>
      )}

      <Button visualType="link" onClick={() => navigate(-1)} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div className="card-main">
        <Heading element="h1">
          {form?.subFormNumber ? `${form.subFormNumber}/${form.version ?? 1}` : t(titleKey)}
        </Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <TechnicalCheckFormFields
          variant={variant}
          formik={formik as never}
          parts={parts}
          defectsByPartKey={defectsByPartKey}
          euViolations={euViolations}
          applyPartDefects={applyPartDefects}
          setPartStatus={setPartStatus}
          removeDefect={removeDefect}
          setResultType={setResultType}
          toggleViolation={toggleViolation}
          canEdit={canEdit}
          canEditXroadFields={canEditXroadFields}
          isEditLocked={isEditLocked}
          xroadBlockVisible={xroadBlockVisible}
        />

        <div className="page-actions">
          <div className="page-actions-buttons">
            {canEdit && (
              <AsyncButton type="button" onClick={() => formik.submitForm()}>
                {t('common.save')}
              </AsyncButton>
            )}
            {canConfirm && (
              <AsyncButton type="button" visualType="secondary" onClick={() => triggerConfirm()}>
                {t('common.confirm')}
              </AsyncButton>
            )}
            {canEditXroadFields && (
              <AsyncButton type="button" onClick={handleSaveXroadFields}>
                {t('forms.technical_check.xroad.save')}
              </AsyncButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
