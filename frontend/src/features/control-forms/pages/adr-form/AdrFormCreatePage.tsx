import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Text,
  ChoiceGroup,
  TextField,
  TextArea,
  DateField,
  Select,
  Button,
  Alert,
} from '@tedi-design-system/react/tedi';
import type { AdrForm } from '../../types';
import { useAdrForm } from './useAdrForm';
import { DangerousGoodsTable } from './DangerousGoodsTable';
import { AdrInfringementsSection } from './AdrInfringementsSection';
import { AddressFields } from '../../components/shared/AddressFields';
import type { AddressFieldsValue } from '../../components/shared/AddressFields';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { usePersonSearch } from '../../../xroad/hooks/usePersonSearch';
import { COUNTRIES } from '../../../../constants/constants';
import { toIsoDate } from '../../../../hooks/dateUtils';

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

interface Props {
  initialData?: AdrForm;
  compoundFormKey?: number;
  onSaved?: (id?: string) => void;
  onValuesChange?: (values: Partial<AdrForm>) => void;
  initialValidate?: boolean;
}

export interface AdrFormCreatePageRef {
  handleSubmit: () => void;
  getFormData: () => Partial<AdrForm>;
  setFormData: (data: Partial<AdrForm>) => void;
  hasErrors: () => boolean;
  isDirty: () => boolean;
  validateForm: () => void;
  confirm?: () => void;
}

export const AdrFormCreatePage = forwardRef<AdrFormCreatePageRef, Props>(
  ({ initialData, compoundFormKey, onSaved, onValuesChange, initialValidate }, ref) => {
    const { t } = useTranslation();
    const { getByCode } = useClassifiers();

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
    } = useAdrForm(initialData, (id) => onSaved?.(id), compoundFormKey);

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

    useImperativeHandle(ref, () => ({
      handleSubmit: () => formik.handleSubmit(),
      getFormData: () => formik.values,
      setFormData: (data: Partial<AdrForm>) => {
        (Object.keys(data) as Array<keyof AdrForm>).forEach((key) => {
          formik.setFieldValue(key, data[key]);
        });
      },
      hasErrors: () => Object.keys(formik.errors).length > 0,
      isDirty: () => formik.dirty,
      confirm: () => { void triggerConfirm(); },
      validateForm: () => {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => { touched[key] = true; });
          formik.setTouched(touched);
        });
      },
    }));

    useEffect(() => {
      formik.validateForm();
    }, [formik.values]);

    const hasMountedRef = useRef(false);
    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      onValuesChange?.(formik.values as Partial<AdrForm>);
    }, [formik.values]);

    useEffect(() => {
      if (initialValidate) {
        void formik.validateForm().then(() => {
          const touched: Record<string, boolean> = {};
          Object.keys(formik.values).forEach((key) => { touched[key] = true; });
          formik.setTouched(touched);
        });
      }
    }, []);

    const values = formik.values;
    const infringementItems = getByCode('DANGEROUS_GOODS_INFRINGEMENTS_NEW');

    const citizenshipOptions = COUNTRIES.map((c) => ({
      value: c.value,
      label: t(c.labelKey),
    })).sort((a, b) => a.label.localeCompare(b.label));

    return (
      <form onSubmit={formik.handleSubmit}>
        {formError && (
          <Alert type="danger" size="small" className="mb-1">
            {formError}
          </Alert>
        )}

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
                onChange={(v) => setDriverAssistant({ ...values.driverAssistant, personalCodeEe: v })}
              />
              <Button
                type="button"
                visualType="secondary"
                disabled={searchLoading}
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
            />
            <TextField
              id="driverAssistantLastName"
              label={t('forms.adr.driverAssistant.lastName')}
              value={values.driverAssistant?.lastName ?? ''}
              onChange={(v) => setDriverAssistant({ ...values.driverAssistant, lastName: v })}
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
            />
            <DateField
              id="driverAssistantBirthDate"
              label={t('forms.adr.driverAssistant.birthDate')}
              selected={values.driverAssistant?.birthDate ? new Date(values.driverAssistant.birthDate) : undefined}
              onSelect={(v) => setDriverAssistant({ ...values.driverAssistant, birthDate: toIsoDate(v as Date | undefined) })}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.certificates.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <TextField id="driverAdrCertificateNumber" label={t('forms.adr.certificates.driver')} value={values.driverAdrCertificateNumber ?? ''} onChange={(v) => formik.setFieldValue('driverAdrCertificateNumber', v)} input={{ maxLength: 100 }} />
            <TextField id="crewAdrCertificateNumber" label={t('forms.adr.certificates.crew')} value={values.crewAdrCertificateNumber ?? ''} onChange={(v) => formik.setFieldValue('crewAdrCertificateNumber', v)} input={{ maxLength: 100 }} />
            <TextField id="assistantAdrCertificateNumber" label={t('forms.adr.certificates.assistant')} value={values.assistantAdrCertificateNumber ?? ''} onChange={(v) => formik.setFieldValue('assistantAdrCertificateNumber', v)} input={{ maxLength: 100 }} />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.lastLoad.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.lastLoadAddress ?? {})}
              onChange={(v) => setLastLoadAddress(v)}
              counties={counties}
            />
            <DateField
              id="lastLoadDate"
              label={t('forms.adr.lastLoad.date')}
              selected={values.lastLoadDate ? new Date(values.lastLoadDate) : undefined}
              onSelect={(v) => formik.setFieldValue('lastLoadDate', toIsoDate(v as Date | undefined))}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.nextLoad.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.nextLoadAddress ?? {})}
              onChange={(v) => setNextLoadAddress(v)}
              counties={counties}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.dangerousGoods.title')}</Heading>
            <DangerousGoodsTable
              rows={values.dangerousGoods ?? []}
              onAdd={addDangerousGood}
              onUpdate={updateDangerousGood}
              onRemove={removeDangerousGood}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.exemption.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.exemption.hint')}</Text>
            <ChoiceGroup
              id="exemptionApplied"
              name="exemptionApplied"
              label={t('forms.adr.exemption.applied')}
              inputType="radio"
              value={values.exemptionApplied ? 'true' : 'false'}
              onChange={(val) => formik.setFieldValue('exemptionApplied', val === 'true')}
              items={[
                { id: 'exemptionApplied-false', value: 'false', label: t('common.no') },
                { id: 'exemptionApplied-true', value: 'true', label: t('common.yes') },
              ]}
            />
            {values.exemptionApplied && (
              <TextField
                id="exemptionAdrProvision"
                label={t('forms.adr.exemption.provision')}
                value={values.exemptionAdrProvision ?? ''}
                required
                onChange={(v) => formik.setFieldValue('exemptionAdrProvision', v)}
                input={{ maxLength: 200 }}
                {...(formik.touched.exemptionAdrProvision && formik.errors.exemptionAdrProvision
                  ? { helper: { text: formik.errors.exemptionAdrProvision as string, type: 'error' as const } }
                  : {})}
              />
            )}
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.containerType.title')}</Heading>
            <ChoiceGroup
              id="containerType"
              name="containerType"
              label={t('forms.adr.containerType.title')}
              hideLabel
              inputType="radio"
              value={values.containerType ?? ''}
              onChange={(val) => formik.setFieldValue('containerType', val)}
              items={CONTAINER_TYPES.map((ct) => ({
                id: `containerType-${ct}`,
                value: ct,
                label: t(`forms.adr.containerType.options.${ct}`),
              }))}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.infringements.title')}</Heading>
            {infringementItems.length === 0 && (
              <Text>{t('forms.adr.infringements.classifierMissing')}</Text>
            )}
            <AdrInfringementsSection
              items={infringementItems}
              getInfringement={getInfringement}
              setInfringement={setInfringement}
            />
            <TextArea
              id="otherViolations"
              label={t('forms.adr.infringements.otherViolations')}
              value={values.otherViolations ?? ''}
              onChange={(v) => formik.setFieldValue('otherViolations', v)}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.result.title')}</Heading>
            <ChoiceGroup
              id="resultType"
              name="resultType"
              label={t('forms.adr.result.resultType')}
              inputType="radio"
              value={values.resultType ?? 'ok'}
              onChange={(val) => formik.setFieldValue('resultType', val)}
              items={RESULT_OPTIONS.map((opt) => ({
                id: `resultType-${opt}`,
                value: opt,
                label: t(`forms.adr.result.resultTypes.${opt}`),
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
                  onChange={(val) => formik.setFieldValue('proceedingType', val)}
                  items={PROCEEDING_TYPES.map((pt) => ({
                    id: `proceedingType-${pt}`,
                    value: pt,
                    label: t(`forms.adr.result.proceedingTypes.${pt}`),
                  }))}
                />
                {values.proceedingType && (
                  <TextField
                    id="proceedingReferenceNumber"
                    label={t('forms.adr.result.proceedingReferenceNumber')}
                    value={values.proceedingReferenceNumber ?? ''}
                    required
                    onChange={(v) => formik.setFieldValue('proceedingReferenceNumber', v)}
                    {...(formik.touched.proceedingReferenceNumber && formik.errors.proceedingReferenceNumber
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
              onChange={(val) => formik.setFieldValue('sealOpened', val === 'true')}
              items={[
                { id: 'sealOpened-false', value: 'false', label: t('common.no') },
                { id: 'sealOpened-true', value: 'true', label: t('common.yes') },
              ]}
            />
            {values.sealOpened && (
              <>
                <DateField
                  id="sealOpenedDate"
                  label={t('forms.adr.result.sealOpenedDate')}
                  selected={values.sealOpenedDate ? new Date(values.sealOpenedDate) : undefined}
                  onSelect={(v) => formik.setFieldValue('sealOpenedDate', toIsoDate(v as Date | undefined))}
                />
                <DateField
                  id="sealInstalledDate"
                  label={t('forms.adr.result.sealInstalledDate')}
                  selected={values.sealInstalledDate ? new Date(values.sealInstalledDate) : undefined}
                  onSelect={(v) => formik.setFieldValue('sealInstalledDate', toIsoDate(v as Date | undefined))}
                />
              </>
            )}
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.notes.title')}</Heading>
            <TextArea
              id="notes"
              label={t('forms.adr.notes.title')}
              hideLabel
              value={values.notes ?? ''}
              onChange={(v) => formik.setFieldValue('notes', v)}
              {...(formik.touched.notes && formik.errors.notes
                ? { helper: { text: formik.errors.notes as string, type: 'error' as const } }
                : {})}
            />
          </Card.Content>
        </Card>
      </form>
    );
  },
);

AdrFormCreatePage.displayName = 'AdrFormCreatePage';
