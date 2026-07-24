import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  Select,
  Text,
  TextField,
  TextArea,
  ChoiceGroup,
  Row,
  Col,
} from '@tedi-design-system/react/tedi';
import {
  DatePicker,
  TimePicker,
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemContent,
} from '@tedi-design-system/react/community';
import type { ForeignViolationForm } from '../../types';
import {
  EU_VIOLATION_GROUPS,
  COUNTRIES,
} from '../../../../constants/constants';
import styles from '../../../control-forms/pages/foreign-violation-form/ForeignViolationFormPage.module.css';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';
import { FormFiles } from '../../../forms/components/FormFiles.tsx';

interface ForeignViolationFormViewCardProps {
  form: ForeignViolationForm;
  isDesktop: boolean;
  canEdit: boolean;
  orgOptions: { label: string; value: string }[];
  structureUnits: { code: string; name: string }[];
  toDateValue: (date?: string) => import('dayjs').Dayjs | null;
  toTimeValue: (date?: string, time?: string) => import('dayjs').Dayjs | null;
  onEdit: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
  isSnapshot?: boolean;
  formType: string;
}

export function ForeignViolationFormViewCard({
  form,
  isDesktop,
  canEdit,
  orgOptions,
  structureUnits,
  toDateValue,
  toTimeValue,
  onEdit,
  isSnapshot,
  formType,
}: ForeignViolationFormViewCardProps) {
  const { t } = useTranslation();

  const euViolationGroups = EU_VIOLATION_GROUPS.map((group) => ({
    ...group,
    label: t(group.labelKey),
    items: group.items.map((item) => ({
      ...item,
      label: t(item.labelKey),
    })),
  }));

  const countries = COUNTRIES.map((country) => ({
    ...country,
    label: t(country.labelKey),
  })).sort((a, b) => a.label.localeCompare(b.label));

  const recommendedMeasureOptions = [
    {
      value: 'PUUDUVAD',
      labelKey: 'forms.foreign_violation.recommendedMeasureMissing',
    },
    {
      value: 'HOIATUS',
      labelKey: 'forms.foreign_violation.recommendedMeasureWarning',
    },
    {
      value: 'UHENDUSE_TEGEVUSLOA_PEATAMINE',
      labelKey:
        'forms.foreign_violation.recommendedMeasureAssociationActivityLicenseSuspension',
    },
    {
      value: 'UHENDUSE_TEGEVUSLUBA_KEHTETUKS',
      labelKey:
        'forms.foreign_violation.recommendedMeasureAssociationActivityLicenseWithdrawal',
    },
    {
      value: 'TEGEVUSLOA_ARAKIRJADE_PEATAMINE',
      labelKey:
        'forms.foreign_violation.recommendedMeasureActivityLicenseRecordsSuspension',
    },
    {
      value: 'TEGEVUSLUBA_KEHTETUKS',
      labelKey:
        'forms.foreign_violation.recommendedMeasureActivityLicenseWithdrawal',
    },
    {
      value: 'JUHITUNNISTUSEST_KEELDUMINE',
      labelKey:
        'forms.foreign_violation.recommendedMeasureDriverCertificateRefusal',
    },
    {
      value: 'JUHITUNNISTUS_KEHTETUKS',
      labelKey:
        'forms.foreign_violation.recommendedMeasureDriverCertificateWithdrawal',
    },
    {
      value: 'MUU',
      labelKey: 'forms.foreign_violation.recommendedMeasureOther',
    },
  ];

  const sanctionOptions = [
    { value: 'KORRAS', labelKey: 'forms.foreign_violation.sanctionKorras' },
    { value: 'HOIATUS', labelKey: 'forms.foreign_violation.sanctionHoiatus' },
    {
      value: 'KABOTAAŽVEO AJUTINE KEELAMINE',
      labelKey: 'forms.foreign_violation.sanctionKabotaaz',
    },
    { value: 'TRAHV', labelKey: 'forms.foreign_violation.sanctionTrahv' },
    {
      value: 'LIIKLEMISKEELD',
      labelKey: 'forms.foreign_violation.sanctionLiiklemiskeeld',
    },
    {
      value: 'SÕIDUKI KASUTAMISE TAKISTAMINE',
      labelKey: 'forms.foreign_violation.sanctionSoiduk',
    },
    { value: 'MUU', labelKey: 'forms.foreign_violation.sanctionMuu' },
  ];

  const disabled = true;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">{form.formNumber ?? ''}</Heading>
        </div>
      </div>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.reportingBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <Select
              id="reportingCountry"
              label={t('forms.foreign_violation.reportingCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === form.reportingCountryCode) ??
                null
              }
              disabled={disabled}
            />
            <TextField
              id="reportingAuthority"
              label={t('forms.foreign_violation.reportingAuthority')}
              value={form.reportingAuthority ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.inspectionBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
            style={{ alignItems: 'start' }}
          >
            <div
              className={
                styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']
              }
            >
              <DatePicker
                id="inspectionDate"
                label={t('forms.foreign_violation.inspectionDate')}
                value={toDateValue(form.inspectionDate)}
                onChange={() => {}}
                disabled={disabled}
              />
              <TimePicker
                id="inspectionTime"
                label={t('forms.foreign_violation.inspectionTime')}
                value={toTimeValue(form.inspectionDate, form.inspectionTime)}
                onChange={() => {}}
                placeholder={t('forms.foreign_violation.timePickerPlaceholder')}
                disabled={disabled}
              />
            </div>
            <div />
            <TextField
              id="inspectionAddressLine1"
              label={t('forms.foreign_violation.inspectionAddressLine1')}
              value={form.inspectionAddressLine1 ?? ''}
              disabled={disabled}
            />
            <TextField
              id="inspectionAddressLine2"
              label={t('forms.foreign_violation.inspectionAddressLine2')}
              value={form.inspectionAddressLine2 ?? ''}
              disabled={disabled}
            />
            <TextField
              id="inspectionRegion"
              label={t('forms.foreign_violation.inspectionRegion')}
              value={form.inspectionRegion ?? ''}
              disabled={disabled}
            />
            <TextField
              id="inspectionCity"
              label={t('forms.foreign_violation.inspectionCity')}
              value={form.inspectionCity ?? ''}
              disabled={disabled}
            />
            <Select
              id="inspectionCountry"
              label={t('forms.foreign_violation.inspectionCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === form.inspectionCountryCode) ??
                null
              }
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.companyBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="companyRegCode"
              label={t('forms.foreign_violation.companyRegCode')}
              value={form.companyRegCode ?? ''}
              disabled={disabled}
            />
            <TextField
              id="companyName"
              label={t('forms.foreign_violation.companyName')}
              value={form.companyName ?? ''}
              disabled={disabled}
            />
            <Select
              id="companyCountry"
              label={t('forms.foreign_violation.companyCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === form.companyCountryCode) ??
                null
              }
              disabled={disabled}
            />
            <TextField
              id="companyAddressLine1"
              label={t('forms.foreign_violation.companyAddressLine1')}
              value={form.companyAddressLine1 ?? ''}
              disabled={disabled}
            />
            <TextField
              id="companyAddressLine2"
              label={t('forms.foreign_violation.companyAddressLine2')}
              value={form.companyAddressLine2 ?? ''}
              disabled={disabled}
            />
            <TextField
              id="companyCity"
              label={t('forms.foreign_violation.companyCity')}
              value={form.companyCity ?? ''}
              disabled={disabled}
            />
            <TextField
              id="companyPostalCode"
              label={t('forms.foreign_violation.companyPostalCode')}
              value={form.companyPostalCode ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.driverBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="driverFirstName"
              label={t('forms.foreign_violation.driverFirstName')}
              value={form.driverFirstName ?? ''}
              disabled={disabled}
            />
            <TextField
              id="driverLastName"
              label={t('forms.foreign_violation.driverLastName')}
              value={form.driverLastName ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.vehicleBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
            style={{ alignItems: 'start' }}
          >
            <TextField
              id="vehicleRegNr"
              label={t('forms.foreign_violation.vehicleRegNr')}
              value={form.vehicleRegNr ?? ''}
              disabled={disabled}
            />
            <TextField
              id="vehicleMake"
              label={t('forms.foreign_violation.vehicleMake')}
              value={form.vehicleMake ?? ''}
              disabled={disabled}
            />
            <TextField
              id="vehicleModel"
              label={t('forms.foreign_violation.vehicleModel')}
              value={form.vehicleModel ?? ''}
              disabled={disabled}
            />
            <Select
              id="vehicleCountry"
              label={t('forms.foreign_violation.vehicleCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === form.vehicleCountryCode) ??
                null
              }
              disabled={disabled}
            />
            <TextField
              id="vehicleVin"
              label={t('forms.foreign_violation.vehicleVin')}
              value={form.vehicleVin ?? ''}
              disabled={disabled}
            />
            <div
              className={
                styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']
              }
            >
              <DatePicker
                id="vehicleFirstRegistration"
                label={t('forms.foreign_violation.vehicleFirstRegistration')}
                value={toDateValue(form.vehicleFirstRegistration)}
                onChange={() => {}}
                placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                disabled={disabled}
              />
            </div>
            <TextField
              id="vehicleBodyType"
              label={t('forms.foreign_violation.vehicleBodyType')}
              value={form.vehicleBodyType ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.licenceCopyBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="licenceCopyNumber"
              label={t('forms.foreign_violation.licenceCopyNumber')}
              value={form.licenceCopyNumber ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.violationDescriptionBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextArea
              id="violationDescription"
              label={t('forms.foreign_violation.violationDescription')}
              value={form.violationDescription ?? ''}
              className={styles['full-span']}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.minorViolationsBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="minorViolationsCount"
              label={t('forms.foreign_violation.minorViolationsCount')}
              value={form.minorViolationsCount ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.sanctionBasicInfo')}
          </Heading>
          <ChoiceGroup
            id="sanctionCode"
            name="sanctionCode"
            inputType="radio"
            label={<strong>{t('forms.foreign_violation.sanctionCode')}</strong>}
            value={form.sanctionCode ?? ''}
            items={sanctionOptions.map((opt) => ({
              id: `sanctionCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
              disabled: disabled,
            }))}
            onChange={() => {}}
            className="mb-1"
          />
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextArea
              id="sanctionNotes"
              label={t('forms.foreign_violation.sanctionNotes')}
              value={form.sanctionNotes ?? ''}
              className={styles['full-span']}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Accordion defaultOpenItem={[]}>
            <AccordionItem id="eu-violations">
              <AccordionItemHeader closeText=" " openText=" ">
                <strong>
                  {t('forms.foreign_violation.euViolationsBasicInfo')}
                </strong>
              </AccordionItemHeader>
              <AccordionItemContent>
                {euViolationGroups.map((group) => (
                  <div key={group.id} className="mb-1">
                    <Text element="p" modifiers="bold">
                      {group.label}
                    </Text>
                    <ChoiceGroup
                      id={`euViolations_${group.id}`}
                      name={`euViolations_${group.id}`}
                      inputType="checkbox"
                      label=""
                      value={
                        Array.isArray(form.violations) ? form.violations : []
                      }
                      items={group.items.map((item) => ({
                        id: `euViolation_${item.value}`,
                        label: item.label,
                        value: item.value,
                        disabled: disabled,
                        defaultChecked:
                          form.violations?.includes(item.value) ?? false,
                      }))}
                    />
                  </div>
                ))}
              </AccordionItemContent>
            </AccordionItem>
          </Accordion>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.recommendedMeasureBasicInfo')}
          </Heading>
          <ChoiceGroup
            id="recommendedMeasureCode"
            name="recommendedMeasureCode"
            inputType="radio"
            label={
              <strong>
                {t('forms.foreign_violation.recommendedMeasureCode')}
              </strong>
            }
            value={form.recommendedMeasureCode ?? ''}
            items={recommendedMeasureOptions.map((opt) => ({
              id: `recommendedMeasureCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
              disabled: disabled,
            }))}
            onChange={() => {}}
            className="mb-1"
          />
          {form.recommendedMeasureCode === 'MUU' && (
            <div
              className={`${styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']} mb-1`}
            >
              <TextField
                id="recommendedMeasureNotes"
                label={t('forms.foreign_violation.recommendedMeasureNotes')}
                value={form.recommendedMeasureNotes ?? ''}
                className={styles['full-span']}
                disabled={disabled}
              />
            </div>
          )}
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextArea
              id="recommendedMeasureGeneralNotes"
              label={t(
                'forms.foreign_violation.recommendedMeasureGeneralNotes',
              )}
              value={form.notes ?? ''}
              className={styles['full-span']}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.dataEntryDateBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div
              className={
                styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']
              }
            >
              <DatePicker
                id="dataEntryDate"
                label={t('forms.foreign_violation.dataEntryDate')}
                value={toDateValue(form.dataEntryDate)}
                onChange={() => {}}
                placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                disabled={disabled}
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.inspectorBasicInfo')}
          </Heading>
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <TextField
              id="inspectorFirstName"
              label={t('forms.foreign_violation.inspectorFirstName')}
              value={form.inspectorFirstName ?? ''}
              disabled={disabled}
            />
            <TextField
              id="inspectorLastName"
              label={t('forms.foreign_violation.inspectorLastName')}
              value={form.inspectorLastName ?? ''}
              disabled={disabled}
            />
            <Select
              id="inspectorOrganisation"
              label={t('forms.foreign_violation.inspectorOrganisation')}
              options={orgOptions}
              value={
                orgOptions.find(
                  (o) => o.value === String(form.inspectorOrganisationId),
                ) ?? null
              }
              disabled={disabled}
            />
            <Select
              id="inspectorUnit"
              label={t('forms.foreign_violation.inspectorUnit')}
              options={structureUnits.map((opt) => ({
                label: opt.name,
                value: opt.code,
              }))}
              value={
                structureUnits
                  .map((opt) => ({ label: opt.name, value: opt.code }))
                  .find((o) => o.value === form.inspectorUnit) ?? null
              }
              disabled={disabled}
            />
            <TextField
              id="inspectorProfession"
              label={t('forms.foreign_violation.inspectorProfession')}
              value={form.inspectorProfession ?? ''}
              disabled={disabled}
            />
          </div>
        </Card.Content>
      </Card>

      <Row className="m-0">
        <Col className="p-0">
          <FormFiles
            formType="foreign-violation-form"
            formNumber={form.formNumber}
          />
        </Col>
      </Row>

      {form.id && <FormVersionsTable formId={form.id} formType={formType} />}

      {!isSnapshot && (
        <div className="page-actions">
          <div className="page-actions-buttons">
            {canEdit && (
              <Button
                iconLeft="edit"
                visualType="secondary"
                type="button"
                onClick={onEdit}
              >
                {t('common.edit')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
