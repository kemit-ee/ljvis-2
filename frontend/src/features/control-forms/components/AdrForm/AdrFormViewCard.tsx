import {
  Card,
  Heading,
  Text,
  ChoiceGroup,
  TextField,
  TextArea,
  DateField,
  Select,
} from '@tedi-design-system/react/tedi';
import { useTranslation } from 'react-i18next';
import type { AdrForm } from '../../types';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { useAdrForm } from '../../pages/adr-form/useAdrForm';
import { DangerousGoodsTable } from '../../pages/adr-form/DangerousGoodsTable';
import { AdrInfringementsSection } from '../../pages/adr-form/AdrInfringementsSection';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { COUNTRIES } from '../../../../constants/constants';
import { AddressFields } from '../shared/AddressFields';
import type { AddressFieldsValue } from '../shared/AddressFields';

const addressToValue = (a: { countryCode?: string; county?: string; city?: string; street?: string; postalCode?: string }): AddressFieldsValue => ({
  countryCode: a.countryCode ?? '',
  county: a.county ?? '',
  city: a.city ?? '',
  street: a.street ?? '',
  postalCode: a.postalCode ?? '',
});

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

interface AdrFormViewCardProps {
  form: AdrForm;
  canEdit: boolean;
  onEdit: () => void;
  formType: string;
}

export function AdrFormViewCard({ form, formType }: AdrFormViewCardProps) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();

  const {
    formik,
    counties,
    getInfringement,
  } = useAdrForm(form, () => {}, form.compoundFormKey ? Number(form.compoundFormKey) : undefined);

  const values = formik.values;
  const infringementItems = getByCode('DANGEROUS_GOODS_INFRINGEMENTS_NEW');

  const citizenshipOptions = COUNTRIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Card className="mb-1">
      <Card.Content>
        <div className="mb-1">
          <div className="page-header-title">
            <Heading element="h1" color="primary">
              {form.subFormNumber}
            </Heading>
          </div>
        </div>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.driverAssistant.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <TextField
              id="view-driverAssistantPersonalCode"
              label={t('forms.adr.driverAssistant.personalCode')}
              value={values.driverAssistant?.personalCodeEe ?? ''}
              onChange={() => {}}
              disabled
            />
            <TextField
              id="view-driverAssistantFirstName"
              label={t('forms.adr.driverAssistant.firstName')}
              value={values.driverAssistant?.firstName ?? ''}
              onChange={() => {}}
              disabled
            />
            <TextField
              id="view-driverAssistantLastName"
              label={t('forms.adr.driverAssistant.lastName')}
              value={values.driverAssistant?.lastName ?? ''}
              onChange={() => {}}
              disabled
            />
            <Select
              id="view-driverAssistantCitizenship"
              label={t('forms.adr.driverAssistant.citizenship')}
              options={citizenshipOptions}
              value={citizenshipOptions.find((o) => o.value === values.driverAssistant?.citizenshipCode) ?? null}
              onChange={() => {}}
              disabled
            />
            <DateField
              id="view-driverAssistantBirthDate"
              label={t('forms.adr.driverAssistant.birthDate')}
              selected={values.driverAssistant?.birthDate ? new Date(values.driverAssistant.birthDate) : undefined}
              onSelect={() => {}}
              readOnly
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.adr.certificates.title')}
            </Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <TextField id="view-driverAdrCertificateNumber" label={t('forms.adr.certificates.driver')} value={values.driverAdrCertificateNumber ?? ''} onChange={() => {}} disabled />
            <TextField id="view-crewAdrCertificateNumber" label={t('forms.adr.certificates.crew')} value={values.crewAdrCertificateNumber ?? ''} onChange={() => {}} disabled />
            <TextField id="view-assistantAdrCertificateNumber" label={t('forms.adr.certificates.assistant')} value={values.assistantAdrCertificateNumber ?? ''} onChange={() => {}} disabled />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.lastLoad.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.lastLoadAddress ?? {})}
              onChange={() => {}}
              counties={counties}
              disabled
            />
            <DateField
              id="view-lastLoadDate"
              label={t('forms.adr.lastLoad.date')}
              selected={values.lastLoadDate ? new Date(values.lastLoadDate) : undefined}
              onSelect={() => {}}
              readOnly
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.nextLoad.title')}</Heading>
            <Text className="mb-1">{t('forms.adr.hintOnlyOnViolation')}</Text>
            <AddressFields
              value={addressToValue(values.nextLoadAddress ?? {})}
              onChange={() => {}}
              counties={counties}
              disabled
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.dangerousGoods.title')}</Heading>
            <DangerousGoodsTable
              rows={values.dangerousGoods ?? []}
              onAdd={() => {}}
              onUpdate={() => {}}
              onRemove={() => {}}
              disabled
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.exemption.title')}</Heading>
            <ChoiceGroup
              id="view-exemptionApplied"
              name="view-exemptionApplied"
              label={t('forms.adr.exemption.applied')}
              inputType="radio"
              value={values.exemptionApplied ? 'true' : 'false'}
              onChange={() => {}}
              items={[
                { id: 'view-exemptionApplied-false', value: 'false', label: t('common.no'), disabled: true },
                { id: 'view-exemptionApplied-true', value: 'true', label: t('common.yes'), disabled: true },
              ]}
            />
            {values.exemptionApplied && (
              <TextField id="view-exemptionAdrProvision" label={t('forms.adr.exemption.provision')} value={values.exemptionAdrProvision ?? ''} onChange={() => {}} disabled />
            )}
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.containerType.title')}</Heading>
            <ChoiceGroup
              id="view-containerType"
              name="view-containerType"
              label={t('forms.adr.containerType.title')}
              hideLabel
              inputType="radio"
              value={values.containerType ?? ''}
              onChange={() => {}}
              items={CONTAINER_TYPES.map((ct) => ({
                id: `view-containerType-${ct}`,
                value: ct,
                label: t(`forms.adr.containerType.options.${ct}`),
                disabled: true,
              }))}
            />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.infringements.title')}</Heading>
            <AdrInfringementsSection
              items={infringementItems}
              getInfringement={getInfringement}
              setInfringement={() => {}}
              disabled
            />
            <TextArea id="view-otherViolations" label={t('forms.adr.infringements.otherViolations')} value={values.otherViolations ?? ''} onChange={() => {}} disabled />
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.result.title')}</Heading>
            <ChoiceGroup
              id="view-resultType"
              name="view-resultType"
              label={t('forms.adr.result.resultType')}
              inputType="radio"
              value={values.resultType ?? 'ok'}
              onChange={() => {}}
              items={RESULT_OPTIONS.map((opt) => ({
                id: `view-resultType-${opt}`,
                value: opt,
                label: t(`forms.adr.result.resultTypes.${opt}`),
                disabled: true,
              }))}
            />
            {values.resultType !== 'ok' && (
              <>
                <ChoiceGroup
                  id="view-proceedingType"
                  name="view-proceedingType"
                  label={t('forms.adr.result.proceedingType')}
                  inputType="radio"
                  value={values.proceedingType ?? ''}
                  onChange={() => {}}
                  items={PROCEEDING_TYPES.map((pt) => ({
                    id: `view-proceedingType-${pt}`,
                    value: pt,
                    label: t(`forms.adr.result.proceedingTypes.${pt}`),
                    disabled: true,
                  }))}
                />
                {values.proceedingType && (
                  <TextField id="view-proceedingReferenceNumber" label={t('forms.adr.result.proceedingReferenceNumber')} value={values.proceedingReferenceNumber ?? ''} onChange={() => {}} disabled />
                )}
                <ChoiceGroup
                  id="view-correctiveMeasures"
                  name="view-correctiveMeasures"
                  label={t('forms.adr.result.correctiveMeasures')}
                  inputType="checkbox"
                  value={values.correctiveMeasures ?? []}
                  onChange={() => {}}
                  items={CORRECTIVE_MEASURES.map((cm) => ({
                    id: `view-correctiveMeasure-${cm}`,
                    value: cm,
                    label: t(`forms.adr.result.correctiveMeasureOptions.${cm}`),
                    disabled: true,
                  }))}
                />
              </>
            )}
            <ChoiceGroup
              id="view-sealOpened"
              name="view-sealOpened"
              label={t('forms.adr.result.sealOpened')}
              inputType="radio"
              value={values.sealOpened ? 'true' : 'false'}
              onChange={() => {}}
              items={[
                { id: 'view-sealOpened-false', value: 'false', label: t('common.no'), disabled: true },
                { id: 'view-sealOpened-true', value: 'true', label: t('common.yes'), disabled: true },
              ]}
            />
            {values.sealOpened && (
              <>
                <DateField id="view-sealOpenedDate" label={t('forms.adr.result.sealOpenedDate')} selected={values.sealOpenedDate ? new Date(values.sealOpenedDate) : undefined} onSelect={() => {}} readOnly />
                <DateField id="view-sealInstalledDate" label={t('forms.adr.result.sealInstalledDate')} selected={values.sealInstalledDate ? new Date(values.sealInstalledDate) : undefined} onSelect={() => {}} readOnly />
              </>
            )}
          </Card.Content>
        </Card>

        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">{t('forms.adr.notes.title')}</Heading>
            <TextArea id="view-notes" label={t('forms.adr.notes.title')} hideLabel value={values.notes ?? ''} onChange={() => {}} disabled />
          </Card.Content>
        </Card>

        {form.id && <FormVersionsTable formId={form.id} formType={formType} />}
      </Card.Content>
    </Card>
  );
}
