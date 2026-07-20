import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Heading,
  Select,
  TextField,
  TextArea,
  Text,
  ChoiceGroup,
  FileDropzone,
  Alert,
} from '@tedi-design-system/react/tedi';
import {
  DatePicker,
  TimePicker,
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemContent,
} from '@tedi-design-system/react/community';
import { DeleteConfirmModal } from '../../../../shared/components/DeleteConfirmModal';
import type { FormikProps } from 'formik';
import {
  EU_VIOLATION_GROUPS,
  COUNTRIES,
} from '../../../../constants/constants';
import styles from '../../../control-forms/pages/foreign-violation-form/ForeignViolationFormPage.module.css';
import { FormVersionsTable } from '../FormVersionsTable/FormVersionsTable';

interface ForeignViolationEditFormValues {
  id: string;
  formNumber: string;
  reportingCountryCode: string;
  reportingAuthority: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionAddressLine1: string;
  inspectionAddressLine2: string;
  inspectionRegion: string;
  inspectionCity: string;
  inspectionCountryCode: string;
  companyRegCode: string;
  companyName: string;
  companyCountryCode: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyCity: string;
  companyPostalCode: string;
  driverFirstName: string;
  driverLastName: string;
  vehicleRegNr: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleCountryCode: string;
  vehicleVin: string;
  vehicleFirstRegistration: string;
  vehicleBodyType: string;
  licenceCopyNumber: string;
  violationDescription: string;
  minorViolationsCount: string;
  sanctionCode: string;
  sanctionNotes: string;
  violations: string[];
  recommendedMeasureCode: string;
  recommendedMeasureNotes: string;
  recommendedMeasureGeneralNotes: string;
  dataEntryDate: string;
  inspectorFirstName: string;
  inspectorLastName: string;
  inspectorOrganisationId: string;
  inspectorUnit: string;
  inspectorProfession: string;
  files: string | { id: string; isLoading: boolean; isValid: boolean }[];
}

interface ForeignViolationFormEditCardProps {
  formik: FormikProps<ForeignViolationEditFormValues>;
  isDesktop: boolean;
  orgOptions: { label: string; value: string }[];
  structureUnits: { code: string; name: string }[];
  toDateValue: (date?: string) => import('dayjs').Dayjs | null;
  toTimeValue: (date?: string, time?: string) => import('dayjs').Dayjs | null;
  canConfirm: boolean;
  canDelete: boolean;
  companySearchError: boolean;
  setCompanySearchError: (v: boolean) => void;
  vehicleSearchError: boolean;
  setVehicleSearchError: (v: boolean) => void;
  licenceCopyNumberError: boolean;
  setLicenceCopyNumberError: (v: boolean) => void;
  handleOrgChange: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleStructuralUnitChange: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleCompanyRegCodeSearch: () => void;
  handleCompanyNameSearch: () => void;
  handleVehicleSearch: () => void;
  handleLicenceCopyNumberSearch: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  formType: string;
}

export function ForeignViolationFormEditCard({
  formik,
  isDesktop,
  orgOptions,
  structureUnits,
  toDateValue,
  toTimeValue,
  canConfirm,
  canDelete,
  companySearchError,
  setCompanySearchError,
  vehicleSearchError,
  setVehicleSearchError,
  licenceCopyNumberError,
  setLicenceCopyNumberError,
  handleOrgChange,
  handleStructuralUnitChange,
  handleCompanyRegCodeSearch,
  handleCompanyNameSearch,
  handleVehicleSearch,
  handleLicenceCopyNumberSearch,
  onCancel,
  onConfirm,
  onDelete,
  formType,
}: ForeignViolationFormEditCardProps) {
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

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="page-header">
        <div className="page-header-title">
          <Heading element="h1">{formik.values.formNumber ?? ''}</Heading>
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
                countries.find(
                  (o) => o.value === formik.values.reportingCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                formik.setFieldValue(
                  'reportingCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              required
              {...(formik.touched.reportingCountryCode &&
              formik.errors.reportingCountryCode
                ? {
                    helper: {
                      text: formik.errors.reportingCountryCode,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="reportingAuthority"
              label={t('forms.foreign_violation.reportingAuthority')}
              value={formik.values.reportingAuthority}
              input={{ maxLength: 600 }}
              onChange={(v) => formik.setFieldValue('reportingAuthority', v)}
              required
              {...(formik.touched.reportingAuthority &&
              formik.errors.reportingAuthority
                ? {
                    helper: {
                      text: formik.errors.reportingAuthority,
                      type: 'error' as const,
                    },
                  }
                : {})}
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
                disableFuture
                value={toDateValue(formik.values.inspectionDate)}
                onChange={(v) => formik.setFieldValue('inspectionDate', v)}
                placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                required
                {...(formik.touched.inspectionDate &&
                formik.errors.inspectionDate
                  ? {
                      helper: {
                        text: formik.errors.inspectionDate,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
              <TimePicker
                id="inspectionTime"
                label={t('forms.foreign_violation.inspectionTime')}
                value={toTimeValue(formik.values.inspectionDate, formik.values.inspectionTime)}
                onChange={(v) => formik.setFieldValue('inspectionTime', v)}
                placeholder={t('forms.foreign_violation.timePickerPlaceholder')}
                {...(formik.touched.inspectionTime &&
                formik.errors.inspectionTime
                  ? {
                      helper: {
                        text: formik.errors.inspectionTime,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
            </div>
            <div />
            <TextField
              id="inspectionAddressLine1"
              label={t('forms.foreign_violation.inspectionAddressLine1')}
              value={formik.values.inspectionAddressLine1}
              input={{ maxLength: 300 }}
              onChange={(v) =>
                formik.setFieldValue('inspectionAddressLine1', v)
              }
            />
            <TextField
              id="inspectionAddressLine2"
              label={t('forms.foreign_violation.inspectionAddressLine2')}
              value={formik.values.inspectionAddressLine2}
              input={{ maxLength: 300 }}
              onChange={(v) =>
                formik.setFieldValue('inspectionAddressLine2', v)
              }
            />
            <TextField
              id="inspectionRegion"
              label={t('forms.foreign_violation.inspectionRegion')}
              value={formik.values.inspectionRegion}
              onChange={(v) => formik.setFieldValue('inspectionRegion', v)}
              input={{ maxLength: 100 }}
            />
            <TextField
              id="inspectionCity"
              label={t('forms.foreign_violation.inspectionCity')}
              value={formik.values.inspectionCity}
              onChange={(v) => formik.setFieldValue('inspectionCity', v)}
              input={{ maxLength: 100 }}
            />
            <Select
              id="inspectionCountry"
              label={t('forms.foreign_violation.inspectionCountry')}
              options={countries}
              value={
                countries.find(
                  (o) => o.value === formik.values.inspectionCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                formik.setFieldValue(
                  'inspectionCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.companyBasicInfo')}
          </Heading>
          {companySearchError && (
            <div className="mb-1">
              <Alert
                type="danger"
                size="small"
                onClose={() => setCompanySearchError(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div className={styles['select-row']}>
              <div className={styles['select-wrapper']}>
                <TextField
                  id="companyRegCode"
                  label={t('forms.foreign_violation.companyRegCode')}
                  value={formik.values.companyRegCode}
                  input={{ maxLength: 20 }}
                  onChange={(v) => formik.setFieldValue('companyRegCode', v)}
                />
              </div>
              <Button type="button" onClick={handleCompanyRegCodeSearch}>
                {t('common.search')}
              </Button>
            </div>
            <div className={styles['select-row']}>
              <div className={styles['select-wrapper']}>
                <TextField
                  id="companyName"
                  label={t('forms.foreign_violation.companyName')}
                  value={formik.values.companyName}
                  input={{ maxLength: 300 }}
                  onChange={(v) => formik.setFieldValue('companyName', v)}
                />
              </div>
              <Button type="button" onClick={handleCompanyNameSearch}>
                {t('common.search')}
              </Button>
            </div>
            <Select
              id="companyCountry"
              label={t('forms.foreign_violation.companyCountry')}
              options={countries}
              value={
                countries.find(
                  (o) => o.value === formik.values.companyCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                formik.setFieldValue(
                  'companyCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
            />
            <TextField
              id="companyAddressLine1"
              label={t('forms.foreign_violation.companyAddressLine1')}
              value={formik.values.companyAddressLine1}
              input={{ maxLength: 300 }}
              onChange={(v) => formik.setFieldValue('companyAddressLine1', v)}
            />
            <TextField
              id="companyAddressLine2"
              label={t('forms.foreign_violation.companyAddressLine2')}
              value={formik.values.companyAddressLine2}
              input={{ maxLength: 300 }}
              onChange={(v) => formik.setFieldValue('companyAddressLine2', v)}
            />
            <TextField
              id="companyCity"
              label={t('forms.foreign_violation.companyCity')}
              value={formik.values.companyCity}
              input={{ maxLength: 100 }}
              onChange={(v) => formik.setFieldValue('companyCity', v)}
            />
            <TextField
              id="companyPostalCode"
              label={t('forms.foreign_violation.companyPostalCode')}
              value={formik.values.companyPostalCode}
              input={{ maxLength: 20 }}
              onChange={(v) => formik.setFieldValue('companyPostalCode', v)}
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
              value={formik.values.driverFirstName}
              input={{ maxLength: 200 }}
              onChange={(v) => formik.setFieldValue('driverFirstName', v)}
            />
            <TextField
              id="driverLastName"
              label={t('forms.foreign_violation.driverLastName')}
              value={formik.values.driverLastName}
              input={{ maxLength: 200 }}
              onChange={(v) => formik.setFieldValue('driverLastName', v)}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.vehicleBasicInfo')}
          </Heading>
          {vehicleSearchError && (
            <div className="mb-1">
              <Alert
                type="danger"
                size="small"
                onClose={() => setVehicleSearchError(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
            style={{ alignItems: 'start' }}
          >
            <div className={styles['select-row']}>
              <div className={styles['select-wrapper']}>
                <TextField
                  id="vehicleRegNr"
                  label={t('forms.foreign_violation.vehicleRegNr')}
                  value={formik.values.vehicleRegNr}
                  input={{ maxLength: 20 }}
                  onChange={(v) =>
                    formik.setFieldValue('vehicleRegNr', v.toUpperCase())
                  }
                />
              </div>
              <Button type="button" onClick={handleVehicleSearch}>
                {t('common.search')}
              </Button>
            </div>
            <TextField
              id="vehicleMake"
              label={t('forms.foreign_violation.vehicleMake')}
              value={formik.values.vehicleMake}
              input={{ maxLength: 100 }}
              onChange={(v) => formik.setFieldValue('vehicleMake', v)}
            />
            <TextField
              id="vehicleModel"
              label={t('forms.foreign_violation.vehicleModel')}
              value={formik.values.vehicleModel}
              input={{ maxLength: 100 }}
              onChange={(v) => formik.setFieldValue('vehicleModel', v)}
            />
            <Select
              id="vehicleCountry"
              label={t('forms.foreign_violation.vehicleCountry')}
              options={countries}
              value={
                countries.find(
                  (o) => o.value === formik.values.vehicleCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                formik.setFieldValue(
                  'vehicleCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
            />
            <TextField
              id="vehicleVin"
              label={t('forms.foreign_violation.vehicleVin')}
              value={formik.values.vehicleVin}
              input={{ maxLength: 17 }}
              onChange={(v) => formik.setFieldValue('vehicleVin', v)}
            />
            <div
              className={
                styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']
              }
            >
              <DatePicker
                id="vehicleFirstRegistration"
                label={t('forms.foreign_violation.vehicleFirstRegistration')}
                value={toDateValue(formik.values.vehicleFirstRegistration)}
                onChange={(v) =>
                  formik.setFieldValue('vehicleFirstRegistration', v)
                }
                placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
              />
            </div>
            <TextField
              id="vehicleBodyType"
              label={t('forms.foreign_violation.vehicleBodyType')}
              value={formik.values.vehicleBodyType}
              input={{ maxLength: 50 }}
              onChange={(v) => formik.setFieldValue('vehicleBodyType', v)}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.licenceCopyBasicInfo')}
          </Heading>
          {licenceCopyNumberError && (
            <div className="mb-1">
              <Alert
                type="danger"
                size="small"
                onClose={() => setLicenceCopyNumberError(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div
            className={
              styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']
            }
          >
            <div className={styles['select-row']}>
              <div className={styles['select-wrapper']}>
                <TextField
                  id="licenceCopyNumber"
                  label={t('forms.foreign_violation.licenceCopyNumber')}
                  value={formik.values.licenceCopyNumber}
                  input={{ maxLength: 100 }}
                  onChange={(v) => formik.setFieldValue('licenceCopyNumber', v)}
                />
              </div>
              <Button type="button" onClick={handleLicenceCopyNumberSearch}>
                {t('common.search')}
              </Button>
            </div>
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
              value={formik.values.violationDescription}
              placeholder={t(
                'forms.foreign_violation.violationDescriptionPlaceholder',
              )}
              onChange={(v) => formik.setFieldValue('violationDescription', v)}
              className={styles['full-span']}
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
              value={formik.values.minorViolationsCount}
              onChange={(v) => {
                const numericValue = v.replace(/\D/g, '');
                const parsedValue = parseInt(numericValue, 10) || 0;
                formik.setFieldValue(
                  'minorViolationsCount',
                  String(parsedValue),
                );
              }}
              input={{ maxLength: 3 }}
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
            value={[formik.values.sanctionCode]}
            required
            items={sanctionOptions.map((opt) => ({
              id: `sanctionCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
            }))}
            onChange={(val) =>
              formik.setFieldValue(
                'sanctionCode',
                Array.isArray(val) ? val[0] : val,
              )
            }
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
              value={formik.values.sanctionNotes}
              placeholder={t(
                'forms.foreign_violation.sanctionNotesPlaceholder',
              )}
              onChange={(v) => formik.setFieldValue('sanctionNotes', v)}
              className={styles['full-span']}
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
                        Array.isArray(formik.values.violations)
                          ? formik.values.violations
                          : []
                      }
                      items={group.items.map((item) => ({
                        id: `euViolation_${item.value}`,
                        label: item.label,
                        value: item.value,
                      }))}
                      onChange={(val) =>
                        formik.setFieldValue('violations', val)
                      }
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
            value={[formik.values.recommendedMeasureCode]}
            required
            items={recommendedMeasureOptions.map((opt) => ({
              id: `recommendedMeasureCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
            }))}
            onChange={(val) =>
              formik.setFieldValue(
                'recommendedMeasureCode',
                Array.isArray(val) ? val[0] : val,
              )
            }
            className="mb-1"
          />
          {formik.values.recommendedMeasureCode === 'MUU' && (
            <div
              className={`${styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']} mb-1`}
            >
              <TextField
                id="recommendedMeasureNotes"
                label={t('forms.foreign_violation.recommendedMeasureNotes')}
                value={formik.values.recommendedMeasureNotes}
                onChange={(v) =>
                  formik.setFieldValue('recommendedMeasureNotes', v)
                }
                className={styles['full-span']}
                required
                {...(formik.touched.recommendedMeasureNotes &&
                formik.errors.recommendedMeasureNotes
                  ? {
                      helper: {
                        text: formik.errors.recommendedMeasureNotes,
                        type: 'error' as const,
                      },
                    }
                  : {})}
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
              value={formik.values.recommendedMeasureGeneralNotes}
              placeholder={t(
                'forms.foreign_violation.recommendedMeasureGeneralNotesPlaceholder',
              )}
              onChange={(v) =>
                formik.setFieldValue('recommendedMeasureGeneralNotes', v)
              }
              className={styles['full-span']}
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
                value={toDateValue(formik.values.dataEntryDate)}
                onChange={(v) => formik.setFieldValue('dataEntryDate', v)}
                placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                required
                {...(formik.touched.dataEntryDate && formik.errors.dataEntryDate
                  ? {
                      helper: {
                        text: formik.errors.dataEntryDate,
                        type: 'error' as const,
                      },
                    }
                  : {})}
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
              value={formik.values.inspectorFirstName}
              required
              onChange={(v) => formik.setFieldValue('inspectorFirstName', v)}
              {...(formik.touched.inspectorFirstName &&
              formik.errors.inspectorFirstName
                ? {
                    helper: {
                      text: formik.errors.inspectorFirstName,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="inspectorLastName"
              label={t('forms.foreign_violation.inspectorLastName')}
              value={formik.values.inspectorLastName}
              required
              onChange={(v) => formik.setFieldValue('inspectorLastName', v)}
              {...(formik.touched.inspectorLastName &&
              formik.errors.inspectorLastName
                ? {
                    helper: {
                      text: formik.errors.inspectorLastName,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <Select
              id="inspectorOrganisation"
              label={t('forms.foreign_violation.inspectorOrganisation')}
              options={orgOptions}
              value={
                orgOptions.find(
                  (o) =>
                    o.value === String(formik.values.inspectorOrganisationId),
                ) ?? null
              }
              onChange={handleOrgChange}
              required
              {...(formik.touched.inspectorOrganisationId &&
              formik.errors.inspectorOrganisationId
                ? {
                    helper: {
                      text: formik.errors.inspectorOrganisationId,
                      type: 'error' as const,
                    },
                  }
                : {})}
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
                  .find((o) => o.value === formik.values.inspectorUnit) ?? null
              }
              onChange={handleStructuralUnitChange}
            />
            <TextField
              id="inspectorProfession"
              label={t('forms.foreign_violation.inspectorProfession')}
              value={formik.values.inspectorProfession}
              required
              onChange={(v) => formik.setFieldValue('inspectorProfession', v)}
              {...(formik.touched.inspectorProfession &&
              formik.errors.inspectorProfession
                ? {
                    helper: {
                      text: formik.errors.inspectorProfession,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.filesBasicInfo')}
          </Heading>
          <FileDropzone
            id="files"
            name="file-dropzone"
            label={t('forms.foreign_violation.filesBoxInfo')}
            onChange={(files) =>
              formik.setFieldValue('files', JSON.stringify(files))
            }
            maxSize={10}
            helper={
              typeof formik.errors.files === 'string'
                ? { text: formik.errors.files, type: 'error' as const }
                : { text: t('forms.foreign_violation.filesHelper') }
            }
            multiple
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tif,.tiff,.pdf,.doc,.docx,.xls,.xlsx,.odt,.rtf,.msg,.eml,.txt,.zip,.ddd"
            validateIndividually
          />
        </Card.Content>
      </Card>

      {formik.values.id && (
        <FormVersionsTable formId={formik.values.id} formType={formType} />
      )}

      <div className="page-actions">
        <div className="page-actions-buttons">
          <Button type="button" visualType="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
          {canConfirm && (
            <Button type="button" onClick={onConfirm}>
              {t('common.confirm')}
            </Button>
          )}
          {canDelete && <DeleteConfirmModal onDelete={onDelete} />}
        </div>
      </div>
    </form>
  );
}
