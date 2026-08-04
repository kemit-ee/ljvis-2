import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  Text,
  Alert,
  Card,
  ChoiceGroup,
  TextArea,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { useTransportInterruptionForm } from './useTransportInterruptionForm';
import { useTransportInterruptionFormDetail } from './useTransportInterruptionFormDetail';
import { AddressFields } from '../../components/shared/AddressFields';
import { FileUploadBlock } from '../../components/shared/FileUploadBlock';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';

export function TransportInterruptionFormPage() {
  const { id, compoundFormKey: compoundFormKeyParam } = useParams<{
    id?: string;
    compoundFormKey?: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const { getByCode } = useClassifiers();

  const forbidden = !(
    hasPermission('transport_interruption_form.read') ||
    hasPermission('control_form.view_unpublished')
  );

  const [showSavedAlert, setShowSavedAlert] = useState(false);

  const { form, loading, refetch } = useTransportInterruptionFormDetail(id);

  const compoundFormKey =
    form?.compoundFormKey ??
    (compoundFormKeyParam ? Number(compoundFormKeyParam) : undefined);

  const handleSaved = (newId?: string) => {
    setShowSavedAlert(true);
    refetch();
    if (newId && !id) {
      navigate(`/control-forms/transport-interruption/${newId}`, {
        replace: true,
        state: { justCreated: true },
      });
    }
  };

  const { formik, counties, addressValue, setAddressValue, toggleLegalBasis, triggerConfirm, formError } =
    useTransportInterruptionForm(form ?? undefined, handleSaved, compoundFormKey);

  useEffect(() => {
    setShowSavedAlert(!!(location.state as { justCreated?: boolean })?.justCreated);
  }, [location.state]);

  const status = form?.status ?? 'saved';
  const canEdit =
    hasPermission('transport_interruption_form.write') && status !== 'published' && status !== 'confirmed';
  const canConfirm = !!id && status === 'saved' && hasPermission('transport_interruption_form.write');

  const legalBases = getByCode('INTERRUPTION_BASES');

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (id && !form) return <FormNotFoundView title={t('forms.transport_interruption.title')} />;

  const values = formik.values;
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;

  return (
    <div>
      {showSavedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowSavedAlert(false)} type="success" size="small">
          {t('forms.savedNote')}
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
          {formNumber ?? t('forms.transport_interruption.title')}
        </Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.transport_interruption.header.title')}
            </Heading>
            <TextArea
              id="headerText"
              label={t('forms.transport_interruption.header.headerText')}
              value={values.headerText ?? ''}
              onChange={(v) => formik.setFieldValue('headerText', v)}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.transport_interruption.residence.title')}
            </Heading>
            <AddressFields
              value={addressValue}
              onChange={setAddressValue}
              counties={counties}
              disabled={!canEdit}
              errors={
                formik.errors.residencePostalCode
                  ? { postalCode: formik.errors.residencePostalCode as string }
                  : undefined
              }
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.transport_interruption.result.title')}
            </Heading>
            <TextArea
              id="interruptionReason"
              label={t('forms.transport_interruption.result.interruptionReason')}
              value={values.interruptionReason ?? ''}
              onChange={(v) => formik.setFieldValue('interruptionReason', v)}
              disabled={!canEdit}
            />
            <ChoiceGroup
              id="legalBases"
              name="legalBases"
              label={t('forms.transport_interruption.result.legalBases')}
              inputType="checkbox"
              value={values.legalBases ?? []}
              onChange={(val) => {
                if (!canEdit) return;
                const arr = Array.isArray(val) ? val : [];
                (values.legalBases ?? []).forEach((code) => {
                  if (!arr.includes(code)) toggleLegalBasis(code, false);
                });
                arr.forEach((code) => {
                  if (!(values.legalBases ?? []).includes(code)) toggleLegalBasis(code, true);
                });
              }}
              items={legalBases.map((b) => ({
                id: `legal-basis-${b.code}`,
                value: b.code,
                label: `${b.name} — ${b.description ?? ''}`,
                disabled: !canEdit,
              }))}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.transport_interruption.terminationCondition.title')}
            </Heading>
            <TextArea
              id="terminationCondition"
              label={t('forms.transport_interruption.terminationCondition.title')}
              hideLabel
              value={values.terminationCondition ?? ''}
              onChange={(v) => formik.setFieldValue('terminationCondition', v)}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.transport_interruption.personApplications.title')}
            </Heading>
            <TextArea
              id="personApplications"
              label={t('forms.transport_interruption.personApplications.title')}
              hideLabel
              value={values.personApplications ?? ''}
              onChange={(v) => formik.setFieldValue('personApplications', v)}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        {formNumber && (
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.shared.files.label')}
              </Heading>
              <FileUploadBlock formPath="transport-interruption" formNumber={formNumber} disabled={!canEdit} />
            </Card.Content>
          </Card>
        )}

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
          </div>
        </div>
      </form>
    </div>
  );
}
