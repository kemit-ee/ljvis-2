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
  TextField,
  DateField,
  Select,
} from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';
import { COUNTRIES } from '../../../../constants/constants';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { useAdrForm } from './useAdrForm';
import { useAdrFormDetail } from './useAdrFormDetail';
import { AddressFields } from '../../components/shared/AddressFields';
import type { AddressFieldsValue } from '../../components/shared/AddressFields';
import { DangerousGoodsTable } from './DangerousGoodsTable';
import { AdrInfringementsSection } from './AdrInfringementsSection';
import { saveAdrFormXroadFields } from '../../api';
import { AsyncButton } from '../../../../shared/components/AsyncButton';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';

const RESULT_OPTIONS = [
  'ok',
  'misdemeanor_proceedings',
  'warning',
  'driving_ban_art5',
  'transport_interruption',
] as const;

const PROCEEDING_TYPES = ['expedited', 'general'];
const CONTAINER_TYPES = ['mahtlast', 'paak', 'pakend', 'memu'];
const CORRECTIVE_MEASURES = ['on_spot', 'before_journey_end', 'at_premises'];

const addressToValue = (a: { countryCode?: string; county?: string; city?: string; street?: string; postalCode?: string }): AddressFieldsValue => ({
  countryCode: a.countryCode ?? '',
  county: a.county ?? '',
  city: a.city ?? '',
  street: a.street ?? '',
  postalCode: a.postalCode ?? '',
});

export function AdrFormPage() {
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
    hasPermission('adr_form.read') || hasPermission('control_form.view_unpublished')
  );

  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [xroadError, setXroadError] = useState<string | null>(null);

  const { form, loading, refetch } = useAdrFormDetail(id);

  const compoundFormKey =
    form?.compoundFormKey ??
    (compoundFormKeyParam ? Number(compoundFormKeyParam) : undefined);

  const handleSaved = (newId?: string) => {
    setShowSavedAlert(true);
    refetch();
    if (newId && !id) {
      navigate(`/control-forms/adr/${newId}`, {
        replace: true,
        state: { justCreated: true },
      });
    }
  };

  const {
    formik,
    triggerConfirm,
    formError,
    counties,
    setDriverAssistant,
    setLastLoadAddress,
    setNextLoadAddress,
    addDangerousGood,
    updateDangerousGood,
    removeDangerousGood,
    toggleCorrectiveMeasure,
    setInfringement,
    getInfringement,
  } = useAdrForm(form ?? undefined, handleSaved, compoundFormKey);

  const { searchByPersonalCode, loading: searchLoading, error: searchError, notFound: searchNotFound } =
    usePersonSearch({
      onPersonFound: (person) => {
        setDriverAssistant({
          ...formik.values.driverAssistant,
          personalCodeEe: person.personalCode,
          firstName: person.firstName,
          lastName: person.lastName,
          citizenshipCode: person.citizenshipCode,
          birthDate: person.dateOfBirth,
        });
      },
    });

  useEffect(() => {
    setShowSavedAlert(!!(location.state as { justCreated?: boolean })?.justCreated);
  }, [location.state]);

  const isEditLocked = hasPermission('control_form.edit_locked');
  const status = form?.status ?? 'saved';
  const canEdit =
    hasPermission('adr_form.write') &&
    status !== 'published' &&
    (status !== 'confirmed' || isEditLocked);
  const canConfirm = !!id && status === 'saved' && hasPermission('adr_form.write');
  const canEditXroadFields = isEditLocked && status === 'confirmed';
  const xroadBlockVisible = status !== 'saved';

  const infringementItems = getByCode('DANGEROUS_GOODS_INFRINGEMENTS_NEW');

  const handleSaveXroadFields = async () => {
    if (!id) return;
    setXroadError(null);
    try {
      await saveAdrFormXroadFields({
        id,
        enforcementDecision: formik.values.enforcementDecision,
        proceedingClosureBasis: formik.values.proceedingClosureBasis,
      });
      setShowSavedAlert(true);
      refetch();
    } catch (e) {
      console.error('Save X-tee fields failed', e);
      setXroadError(t('forms.adr.xroad.saveError'));
    }
  };

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (forbidden) return <Text>{t('common.forbidden')}</Text>;
  if (id && !form) return <FormNotFoundView title={t('forms.adr.title')} />;

  const values = formik.values;
  const formNumber = values.subFormNumber
    ? `${values.subFormNumber}/${values.version ?? 1}`
    : undefined;

  const citizenshipOptions = COUNTRIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div>
      {showSavedAlert && (
        <Alert icon="check_circle" className="mb-1" onClose={() => setShowSavedAlert(false)} type="success" size="small">
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
        <Heading element="h1">{formNumber ?? t('forms.adr.title')}</Heading>
      </div>

      <form onSubmit={formik.handleSubmit}>
        {/* §4.3 Autojuhi abi andmed */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.driverAssistant.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <div className="grid-row">
              <TextField
                id="driverAssistantPersonalCode"
                label={t('forms.adr.driverAssistant.personalCode')}
                value={values.driverAssistant?.personalCodeEe ?? ''}
                onChange={(v) =>
                  setDriverAssistant({ ...values.driverAssistant, personalCodeEe: v })
                }
                disabled={!canEdit}
              />
              <Button
                type="button"
                visualType="secondary"
                disabled={!canEdit || searchLoading}
                onClick={() => searchByPersonalCode(values.driverAssistant?.personalCodeEe)}
              >
                {t('common.search', 'Otsi')}
              </Button>
            </div>
            {searchError && (
              <Alert type="danger" size="small" className="mb-1">
                {t('forms.adr.driverAssistant.searchInvalid')}
              </Alert>
            )}
            {searchNotFound && (
              <Alert type="warning" size="small" className="mb-1">
                {t('forms.adr.driverAssistant.searchNotFound')}
              </Alert>
            )}
            <TextField
              id="driverAssistantFirstName"
              label={t('forms.adr.driverAssistant.firstName')}
              value={values.driverAssistant?.firstName ?? ''}
              onChange={(v) => setDriverAssistant({ ...values.driverAssistant, firstName: v })}
              disabled={!canEdit}
            />
            <TextField
              id="driverAssistantLastName"
              label={t('forms.adr.driverAssistant.lastName')}
              value={values.driverAssistant?.lastName ?? ''}
              onChange={(v) => setDriverAssistant({ ...values.driverAssistant, lastName: v })}
              disabled={!canEdit}
            />
            <Select
              id="driverAssistantCitizenship"
              label={t('forms.adr.driverAssistant.citizenship')}
              options={citizenshipOptions}
              value={citizenshipOptions.find((o) => o.value === values.driverAssistant?.citizenshipCode) ?? null}
              onChange={(val) =>
                setDriverAssistant({
                  ...values.driverAssistant,
                  citizenshipCode: val && !Array.isArray(val) ? (val as { value: string }).value : '',
                })
              }
              disabled={!canEdit}
            />
            <DateField
              id="driverAssistantBirthDate"
              label={t('forms.adr.driverAssistant.birthDate')}
              selected={values.driverAssistant?.birthDate ? new Date(values.driverAssistant.birthDate) : undefined}
              onSelect={(v) =>
                setDriverAssistant({
                  ...values.driverAssistant,
                  birthDate: toIsoDate(v as Date | undefined),
                })
              }
              readOnly={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.4 ADR koolitustunnistuse numbrid */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.certificates.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <TextField
              id="driverAdrCertificateNumber"
              label={t('forms.adr.certificates.driver')}
              value={values.driverAdrCertificateNumber ?? ''}
              onChange={(v) => formik.setFieldValue('driverAdrCertificateNumber', v)}
              input={{ maxLength: 100 }}
              disabled={!canEdit}
            />
            <TextField
              id="crewAdrCertificateNumber"
              label={t('forms.adr.certificates.crew')}
              value={values.crewAdrCertificateNumber ?? ''}
              onChange={(v) => formik.setFieldValue('crewAdrCertificateNumber', v)}
              input={{ maxLength: 100 }}
              disabled={!canEdit}
            />
            <TextField
              id="assistantAdrCertificateNumber"
              label={t('forms.adr.certificates.assistant')}
              value={values.assistantAdrCertificateNumber ?? ''}
              onChange={(v) => formik.setFieldValue('assistantAdrCertificateNumber', v)}
              input={{ maxLength: 100 }}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.5 Viimase peale-/mahalaadimise aadress ja kuupäev */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.lastLoad.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.lastLoadAddress ?? {})}
              onChange={(v) => setLastLoadAddress(v)}
              counties={counties}
              disabled={!canEdit}
            />
            <DateField
              id="lastLoadDate"
              label={t('forms.adr.lastLoad.date')}
              selected={values.lastLoadDate ? new Date(values.lastLoadDate) : undefined}
              onSelect={(v) => formik.setFieldValue('lastLoadDate', toIsoDate(v as Date | undefined))}
              readOnly={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.6 Järgmise peale-/mahalaadimise aadress */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.nextLoad.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.nextLoadAddress ?? {})}
              onChange={(v) => setNextLoadAddress(v)}
              counties={counties}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.7 Ohtlike kaupade andmed */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.dangerousGoods.title')}
            </Heading>
            <DangerousGoodsTable
              rows={values.dangerousGoods ?? []}
              onAdd={addDangerousGood}
              onUpdate={updateDangerousGood}
              onRemove={removeDangerousGood}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.8 Erandi kohaldamine */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.exemption.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.exemption.hint')}</Text>
            <ChoiceGroup
              id="exemptionApplied"
              name="exemptionApplied"
              label={t('forms.adr.exemption.applied')}
              inputType="radio"
              value={values.exemptionApplied ? 'true' : 'false'}
              onChange={(val) => canEdit && formik.setFieldValue('exemptionApplied', val === 'true')}
              items={[
                { id: 'exemptionApplied-false', value: 'false', label: t('common.no'), disabled: !canEdit },
                { id: 'exemptionApplied-true', value: 'true', label: t('common.yes'), disabled: !canEdit },
              ]}
            />
            {values.exemptionApplied && (
              <TextField
                id="exemptionAdrProvision"
                label={t('forms.adr.exemption.provision')}
                value={values.exemptionAdrProvision ?? ''}
                onChange={(v) => formik.setFieldValue('exemptionAdrProvision', v)}
                input={{ maxLength: 200 }}
                disabled={!canEdit}
                {...(formik.errors.exemptionAdrProvision
                  ? { helper: { text: formik.errors.exemptionAdrProvision as string, type: 'error' as const } }
                  : {})}
              />
            )}
          </Card.Content>
        </Card>

        {/* §4.9 Mahutid */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.containerType.title')}
            </Heading>
            <ChoiceGroup
              id="containerType"
              name="containerType"
              label={t('forms.adr.containerType.title')}
              hideLabel
              inputType="radio"
              value={values.containerType ?? ''}
              onChange={(val) => canEdit && formik.setFieldValue('containerType', val)}
              items={CONTAINER_TYPES.map((ct) => ({
                id: `containerType-${ct}`,
                value: ct,
                label: t(`forms.adr.containerType.options.${ct}`),
                disabled: !canEdit,
              }))}
            />
          </Card.Content>
        </Card>

        {/* §4.10 Rikkumised */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.infringements.title')}
            </Heading>
            {infringementItems.length === 0 && (
              <Text>{t('forms.adr.infringements.classifierMissing')}</Text>
            )}
            <AdrInfringementsSection
              items={infringementItems}
              getInfringement={getInfringement}
              setInfringement={setInfringement}
              disabled={!canEdit}
            />
            <TextArea
              id="otherViolations"
              label={t('forms.adr.infringements.otherViolations')}
              value={values.otherViolations ?? ''}
              onChange={(v) => formik.setFieldValue('otherViolations', v)}
              disabled={!canEdit}
            />
          </Card.Content>
        </Card>

        {/* §4.11 Tulemus */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.result.title')}
            </Heading>
            <ChoiceGroup
              id="resultType"
              name="resultType"
              label={t('forms.adr.result.resultType')}
              inputType="radio"
              value={values.resultType ?? 'ok'}
              onChange={(val) => canEdit && formik.setFieldValue('resultType', val)}
              items={RESULT_OPTIONS.map((opt) => ({
                id: `resultType-${opt}`,
                value: opt,
                label: t(`forms.adr.result.resultTypes.${opt}`),
                disabled: !canEdit,
              }))}
            />
            {values.resultType !== 'ok' && (
              <>
                <ChoiceGroup
                  id="proceedingType"
                  name="proceedingType"
                  label={t('forms.adr.result.proceedingType')}
                  inputType="radio"
                  value={values.proceedingType ?? ''}
                  onChange={(val) => canEdit && formik.setFieldValue('proceedingType', val)}
                  items={PROCEEDING_TYPES.map((pt) => ({
                    id: `proceedingType-${pt}`,
                    value: pt,
                    label: t(`forms.adr.result.proceedingTypes.${pt}`),
                    disabled: !canEdit,
                  }))}
                />
                {values.proceedingType && (
                  <TextField
                    id="proceedingReferenceNumber"
                    label={t('forms.adr.result.proceedingReferenceNumber')}
                    value={values.proceedingReferenceNumber ?? ''}
                    onChange={(v) => formik.setFieldValue('proceedingReferenceNumber', v)}
                    disabled={!canEdit}
                    {...(formik.errors.proceedingReferenceNumber
                      ? { helper: { text: formik.errors.proceedingReferenceNumber as string, type: 'error' as const } }
                      : {})}
                  />
                )}
                <ChoiceGroup
                  id="correctiveMeasures"
                  name="correctiveMeasures"
                  label={t('forms.adr.result.correctiveMeasures')}
                  inputType="checkbox"
                  value={values.correctiveMeasures ?? []}
                  onChange={(val) => {
                    if (!canEdit) return;
                    const arr = Array.isArray(val) ? val : [];
                    (values.correctiveMeasures ?? []).forEach((code) => {
                      if (!arr.includes(code)) toggleCorrectiveMeasure(code, false);
                    });
                    arr.forEach((code) => {
                      if (!(values.correctiveMeasures ?? []).includes(code)) toggleCorrectiveMeasure(code, true);
                    });
                  }}
                  items={CORRECTIVE_MEASURES.map((cm) => ({
                    id: `correctiveMeasure-${cm}`,
                    value: cm,
                    label: t(`forms.adr.result.correctiveMeasureOptions.${cm}`),
                    disabled: !canEdit,
                  }))}
                />
              </>
            )}
            <ChoiceGroup
              id="sealOpened"
              name="sealOpened"
              label={t('forms.adr.result.sealOpened')}
              inputType="radio"
              value={values.sealOpened ? 'true' : 'false'}
              onChange={(val) => canEdit && formik.setFieldValue('sealOpened', val === 'true')}
              items={[
                { id: 'sealOpened-false', value: 'false', label: t('common.no'), disabled: !canEdit },
                { id: 'sealOpened-true', value: 'true', label: t('common.yes'), disabled: !canEdit },
              ]}
            />
            {values.sealOpened && (
              <>
                <DateField
                  id="sealOpenedDate"
                  label={t('forms.adr.result.sealOpenedDate')}
                  selected={values.sealOpenedDate ? new Date(values.sealOpenedDate) : undefined}
                  onSelect={(v) => formik.setFieldValue('sealOpenedDate', toIsoDate(v as Date | undefined))}
                  readOnly={!canEdit}
                />
                <DateField
                  id="sealInstalledDate"
                  label={t('forms.adr.result.sealInstalledDate')}
                  selected={values.sealInstalledDate ? new Date(values.sealInstalledDate) : undefined}
                  onSelect={(v) => formik.setFieldValue('sealInstalledDate', toIsoDate(v as Date | undefined))}
                  readOnly={!canEdit}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* §4.12 Märkused */}
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.notes.title')}
            </Heading>
            <TextArea
              id="notes"
              label={t('forms.adr.notes.title')}
              hideLabel
              value={values.notes ?? ''}
              onChange={(v) => formik.setFieldValue('notes', v)}
              disabled={!canEdit}
              {...(formik.errors.notes
                ? { helper: { text: formik.errors.notes as string, type: 'error' as const } }
                : {})}
            />
          </Card.Content>
        </Card>

        {/* §4.14 X-tee plokk */}
        {xroadBlockVisible && (
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.adr.xroad.title')}
              </Heading>
              <TextArea
                id="enforcementDecision"
                label={t('forms.adr.xroad.enforcementDecision')}
                value={values.enforcementDecision ?? ''}
                onChange={(v) => formik.setFieldValue('enforcementDecision', v)}
                disabled={!canEditXroadFields}
              />
              <TextArea
                id="proceedingClosureBasis"
                label={t('forms.adr.xroad.proceedingClosureBasis')}
                value={values.proceedingClosureBasis ?? ''}
                onChange={(v) => formik.setFieldValue('proceedingClosureBasis', v)}
                disabled={!canEditXroadFields}
              />
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
            {canEditXroadFields && (
              <AsyncButton type="button" onClick={handleSaveXroadFields}>
                {t('forms.adr.xroad.save')}
              </AsyncButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
