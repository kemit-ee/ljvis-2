import { useTranslation } from 'react-i18next';
import type { FormikProps } from 'formik';
import {
  Button,
  Card,
  Heading,
  Select,
  TextField,
  TextArea,
  Text,
  ChoiceGroup,
  Alert,
  TimeField,
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemContent,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import { MaskedDateField } from '../shared/MaskedDateField';
import { CompanyPickerModal } from '../CompanyPickerModal';
import {
  EU_VIOLATION_GROUPS,
  COUNTRIES,
} from '../../../../constants/constants';
import type { XRoadCompany, XRoadAssociatedPerson } from '../../../xroad/types';
import styles from '../../../control-forms/pages/foreign-violation-form/ForeignViolationFormPage.module.css';
import type { ForeignViolationForm } from '../../types';
import { FileUploadBlock } from '../shared/FileUploadBlock.tsx';

interface ForeignViolationFormFieldsProps {
  formik: FormikProps<ForeignViolationForm & Record<string, unknown>>;
  readOnly: boolean;
  isDesktop: boolean;
  orgOptions: { label: string; value: string }[];
  structureUnits: { code: string; name: string }[];
  companySearchError?: boolean;
  setCompanySearchError?: (v: boolean) => void;
  vehicleSearchError?: boolean;
  setVehicleSearchError?: (v: boolean) => void;
  licenceCopyNumberError?: boolean;
  setLicenceCopyNumberError?: (v: boolean) => void;
  handleOrgChange?: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleStructuralUnitChange?: (
    val:
      | { value: string; label: string | React.ReactNode }
      | readonly { value: string; label: string | React.ReactNode }[]
      | null,
  ) => void;
  handleCompanyRegCodeSearch?: () => void;
  handleCompanyNameSearch?: () => void;
  handleVehicleSearch?: () => void;
  handleLicenceCopyNumberSearch?: () => void;
  companyPickerResults?: XRoadCompany[];
  onCompanyPicked?: (company: XRoadCompany) => void;
  closeCompanyPicker?: () => void;
  associatedPersons?: XRoadAssociatedPerson[];
  associatedPersonsLoading?: boolean;
  formType?: string;
}

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

export function ForeignViolationFormFields({
  formik,
  readOnly,
  isDesktop,
  orgOptions,
  structureUnits,
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
  companyPickerResults,
  onCompanyPicked,
  closeCompanyPicker,
  associatedPersons,
  associatedPersonsLoading,
}: ForeignViolationFormFieldsProps) {
  const { t } = useTranslation();
  const { values, errors, touched, setFieldValue } = formik;

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

  return (
    <div>
      {!readOnly &&
        companyPickerResults &&
        companyPickerResults.length > 0 &&
        onCompanyPicked &&
        closeCompanyPicker && (
          <CompanyPickerModal
            companies={companyPickerResults}
            onSelect={onCompanyPicked}
            onClose={closeCompanyPicker}
          />
        )}

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.reportingBasicInfo')}
          </Heading>
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <Select
              id="reportingCountry"
              label={t('forms.foreign_violation.reportingCountry')}
              options={countries}
              value={
                countries.find(
                  (o) => o.value === values.reportingCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                setFieldValue(
                  'reportingCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              required={!readOnly}
              disabled={readOnly}
              {...(!readOnly &&
              touched.reportingCountryCode &&
              errors.reportingCountryCode
                ? {
                    helper: {
                      text: errors.reportingCountryCode as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="reportingAuthority"
              label={t('forms.foreign_violation.reportingAuthority')}
              value={(values.reportingAuthority as string) ?? ''}
              input={{ maxLength: 600 }}
              onChange={(v) => setFieldValue('reportingAuthority', v)}
              required={!readOnly}
              disabled={readOnly}
              {...(!readOnly &&
              touched.reportingAuthority &&
              errors.reportingAuthority
                ? {
                    helper: {
                      text: errors.reportingAuthority as string,
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
            className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}
            style={{ alignItems: 'start' }}
          >
            <div
              className={
                styles[isDesktop ? 'date-row-desktop' : 'date-row-mobile']
              }
            >
              <MaskedDateField
                id="inspectionDate"
                label={t('forms.foreign_violation.inspectionDate')}
                monthYearSelectType="grid"
                disableFuture
                selected={
                  values.inspectionDate
                    ? new Date(values.inspectionDate as string)
                    : undefined
                }
                onSelect={(v) => setFieldValue('inspectionDate', toIsoDate(v))}
                placeholder={t('common.dateFieldPlaceholder')}
                required={!readOnly}
                inputProps={
                  readOnly
                    ? { disabled: true }
                    : touched.inspectionDate && errors.inspectionDate
                      ? {
                          helper: {
                            text: errors.inspectionDate as string,
                            type: 'error' as const,
                          },
                        }
                      : undefined
                }
              />
              <TimeField
                id="inspectionTime"
                label={t('forms.foreign_violation.inspectionTime')}
                value={
                  (values.inspectionTime as string | undefined)?.slice(0, 5) ??
                  undefined
                }
                onChange={(v) =>
                  setFieldValue(
                    'inspectionTime',
                    v ? (v.length === 5 ? `${v}:00` : v) : '',
                  )
                }
                placeholder={t('common.timeFieldPlaceholder')}
                disabled={readOnly}
                inputProps={
                  !readOnly && touched.inspectionTime && errors.inspectionTime
                    ? {
                        helper: {
                          text: errors.inspectionTime as string,
                          type: 'error' as const,
                        },
                      }
                    : undefined
                }
              />
            </div>
            <div />
            <TextField
              id="inspectionAddressLine1"
              label={t('forms.foreign_violation.inspectionAddressLine1')}
              value={(values.inspectionAddressLine1 as string) ?? ''}
              input={{ maxLength: 300 }}
              onChange={(v) => setFieldValue('inspectionAddressLine1', v)}
              disabled={readOnly}
            />
            <TextField
              id="inspectionAddressLine2"
              label={t('forms.foreign_violation.inspectionAddressLine2')}
              value={(values.inspectionAddressLine2 as string) ?? ''}
              input={{ maxLength: 300 }}
              onChange={(v) => setFieldValue('inspectionAddressLine2', v)}
              disabled={readOnly}
            />
            <TextField
              id="inspectionRegion"
              label={t('forms.foreign_violation.inspectionRegion')}
              value={(values.inspectionRegion as string) ?? ''}
              onChange={(v) => setFieldValue('inspectionRegion', v)}
              input={{ maxLength: 100 }}
              disabled={readOnly}
            />
            <TextField
              id="inspectionCity"
              label={t('forms.foreign_violation.inspectionCity')}
              value={(values.inspectionCity as string) ?? ''}
              onChange={(v) => setFieldValue('inspectionCity', v)}
              input={{ maxLength: 100 }}
              disabled={readOnly}
            />
            <Select
              id="inspectionCountry"
              label={t('forms.foreign_violation.inspectionCountry')}
              options={countries}
              value={
                countries.find(
                  (o) => o.value === values.inspectionCountryCode,
                ) ?? null
              }
              onChange={(val) =>
                setFieldValue(
                  'inspectionCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              disabled={readOnly}
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
                onClose={() => setCompanySearchError?.(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            {readOnly ? (
              <>
                <TextField
                  id="companyRegCode"
                  label={t('forms.foreign_violation.companyRegCode')}
                  value={(values.companyRegCode as string) ?? ''}
                  disabled
                />
                <TextField
                  id="companyName"
                  label={t('forms.foreign_violation.companyName')}
                  value={(values.companyName as string) ?? ''}
                  disabled
                />
              </>
            ) : (
              <>
                <div className={styles['select-row']}>
                  <div className={styles['select-wrapper']}>
                    <TextField
                      id="companyRegCode"
                      label={t('forms.foreign_violation.companyRegCode')}
                      value={(values.companyRegCode as string) ?? ''}
                      input={{ maxLength: 20 }}
                      onChange={(v) => setFieldValue('companyRegCode', v)}
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
                      value={(values.companyName as string) ?? ''}
                      input={{ maxLength: 300 }}
                      onChange={(v) => setFieldValue('companyName', v)}
                    />
                  </div>
                  <Button type="button" onClick={handleCompanyNameSearch}>
                    {t('common.search')}
                  </Button>
                </div>
              </>
            )}
            <Select
              id="companyCountry"
              label={t('forms.foreign_violation.companyCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === values.companyCountryCode) ??
                null
              }
              onChange={(val) =>
                setFieldValue(
                  'companyCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              disabled={readOnly}
            />
            <TextField
              id="companyAddressLine1"
              label={t('forms.foreign_violation.companyAddressLine1')}
              value={(values.companyAddressLine1 as string) ?? ''}
              input={{ maxLength: 300 }}
              onChange={(v) => setFieldValue('companyAddressLine1', v)}
              disabled={readOnly}
            />
            <TextField
              id="companyAddressLine2"
              label={t('forms.foreign_violation.companyAddressLine2')}
              value={(values.companyAddressLine2 as string) ?? ''}
              input={{ maxLength: 300 }}
              onChange={(v) => setFieldValue('companyAddressLine2', v)}
              disabled={readOnly}
            />
            <TextField
              id="companyCity"
              label={t('forms.foreign_violation.companyCity')}
              value={(values.companyCity as string) ?? ''}
              input={{ maxLength: 100 }}
              onChange={(v) => setFieldValue('companyCity', v)}
              disabled={readOnly}
            />
            <TextField
              id="companyPostalCode"
              label={t('forms.foreign_violation.companyPostalCode')}
              value={(values.companyPostalCode as string) ?? ''}
              input={{ maxLength: 20 }}
              onChange={(v) => setFieldValue('companyPostalCode', v)}
              disabled={readOnly}
            />
          </div>
          {associatedPersonsLoading && (
            <div className="mt-1">
              <Text element="p">{t('common.loading')}</Text>
            </div>
          )}
          {!associatedPersonsLoading &&
            associatedPersons &&
            associatedPersons.length > 0 && (
              <div className="mt-1">
                <Text element="p">
                  <strong>{t('xroad.associatedPersons.title')}</strong>
                </Text>
                {associatedPersons
                  .filter((p) => !p.endDate)
                  .map((p, i) => (
                    <Text element="p" key={i}>
                      {p.firstName
                        ? `${p.firstName} ${p.nameOrBusinessName}`
                        : p.nameOrBusinessName}
                      {' — '}
                      {p.roleText}
                    </Text>
                  ))}
              </div>
            )}
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.driverBasicInfo')}
          </Heading>
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextField
              id="driverFirstName"
              label={t('forms.foreign_violation.driverFirstName')}
              value={(values.driverFirstName as string) ?? ''}
              input={{ maxLength: 200 }}
              onChange={(v) => setFieldValue('driverFirstName', v)}
              disabled={readOnly}
            />
            <TextField
              id="driverLastName"
              label={t('forms.foreign_violation.driverLastName')}
              value={(values.driverLastName as string) ?? ''}
              input={{ maxLength: 200 }}
              onChange={(v) => setFieldValue('driverLastName', v)}
              disabled={readOnly}
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
                onClose={() => setVehicleSearchError?.(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div
            className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}
            style={{ alignItems: 'start' }}
          >
            {readOnly ? (
              <TextField
                id="vehicleRegNr"
                label={t('forms.foreign_violation.vehicleRegNr')}
                value={(values.vehicleRegNr as string) ?? ''}
                disabled
              />
            ) : (
              <div className={styles['select-row']}>
                <div className={styles['select-wrapper']}>
                  <TextField
                    id="vehicleRegNr"
                    label={t('forms.foreign_violation.vehicleRegNr')}
                    value={(values.vehicleRegNr as string) ?? ''}
                    input={{ maxLength: 20 }}
                    onChange={(v) =>
                      setFieldValue('vehicleRegNr', v.toUpperCase())
                    }
                  />
                </div>
                <Button type="button" onClick={handleVehicleSearch}>
                  {t('common.search')}
                </Button>
              </div>
            )}
            <TextField
              id="vehicleMake"
              label={t('forms.foreign_violation.vehicleMake')}
              value={(values.vehicleMake as string) ?? ''}
              input={{ maxLength: 100 }}
              onChange={(v) => setFieldValue('vehicleMake', v)}
              disabled={readOnly}
            />
            <TextField
              id="vehicleModel"
              label={t('forms.foreign_violation.vehicleModel')}
              value={(values.vehicleModel as string) ?? ''}
              input={{ maxLength: 100 }}
              onChange={(v) => setFieldValue('vehicleModel', v)}
              disabled={readOnly}
            />
            <Select
              id="vehicleCountry"
              label={t('forms.foreign_violation.vehicleCountry')}
              options={countries}
              value={
                countries.find((o) => o.value === values.vehicleCountryCode) ??
                null
              }
              onChange={(val) =>
                setFieldValue(
                  'vehicleCountryCode',
                  val && !Array.isArray(val)
                    ? (val as { value: string }).value
                    : '',
                )
              }
              disabled={readOnly}
            />
            <TextField
              id="vehicleVin"
              label={t('forms.foreign_violation.vehicleVin')}
              value={(values.vehicleVin as string) ?? ''}
              input={{ maxLength: 17 }}
              onChange={(v) => setFieldValue('vehicleVin', v)}
              disabled={readOnly}
            />
            <div
              className={
                styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']
              }
            >
              <MaskedDateField
                id="vehicleFirstRegistration"
                label={t('forms.foreign_violation.vehicleFirstRegistration')}
                monthYearSelectType="grid"
                selected={
                  values.vehicleFirstRegistration
                    ? new Date(values.vehicleFirstRegistration as string)
                    : undefined
                }
                onSelect={(v) =>
                  setFieldValue('vehicleFirstRegistration', toIsoDate(v))
                }
                placeholder={t('common.dateFieldPlaceholder')}
                inputProps={readOnly ? { disabled: true } : undefined}
              />
            </div>
            <TextField
              id="vehicleBodyType"
              label={t('forms.foreign_violation.vehicleBodyType')}
              value={(values.vehicleBodyType as string) ?? ''}
              input={{ maxLength: 50 }}
              onChange={(v) => setFieldValue('vehicleBodyType', v)}
              disabled={readOnly}
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
                onClose={() => setLicenceCopyNumberError?.(false)}
              >
                {t('common.noResults')}
              </Alert>
            </div>
          )}
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            {readOnly ? (
              <TextField
                id="licenceCopyNumber"
                label={t('forms.foreign_violation.licenceCopyNumber')}
                value={(values.licenceCopyNumber as string) ?? ''}
                disabled
              />
            ) : (
              <div className={styles['select-row']}>
                <div className={styles['select-wrapper']}>
                  <TextField
                    id="licenceCopyNumber"
                    label={t('forms.foreign_violation.licenceCopyNumber')}
                    value={(values.licenceCopyNumber as string) ?? ''}
                    input={{ maxLength: 100 }}
                    onChange={(v) => setFieldValue('licenceCopyNumber', v)}
                  />
                </div>
                <Button type="button" onClick={handleLicenceCopyNumberSearch}>
                  {t('common.search')}
                </Button>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.violationDescriptionBasicInfo')}
          </Heading>
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextArea
              id="violationDescription"
              label={t('forms.foreign_violation.violationDescription')}
              value={(values.violationDescription as string) ?? ''}
              placeholder={t(
                'forms.foreign_violation.violationDescriptionPlaceholder',
              )}
              onChange={(v) => setFieldValue('violationDescription', v)}
              className={styles['full-span']}
              disabled={readOnly}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.minorViolationsBasicInfo')}
          </Heading>
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextField
              id="minorViolationsCount"
              label={t('forms.foreign_violation.minorViolationsCount')}
              value={(values.minorViolationsCount as string) ?? ''}
              onChange={(v) => {
                const numericValue = v.replace(/\D/g, '');
                const parsedValue = parseInt(numericValue, 10) || 0;
                setFieldValue('minorViolationsCount', String(parsedValue));
              }}
              input={{ maxLength: 3 }}
              disabled={readOnly}
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
            value={
              readOnly
                ? ((values.sanctionCode as string) ?? '')
                : [values.sanctionCode as string]
            }
            required={!readOnly}
            items={sanctionOptions.map((opt) => ({
              id: `sanctionCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
              disabled: readOnly,
            }))}
            onChange={(val) => {
              if (!readOnly) {
                setFieldValue(
                  'sanctionCode',
                  Array.isArray(val) ? val[0] : val,
                );
              }
            }}
            className="mb-1"
          />
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextArea
              id="sanctionNotes"
              label={t('forms.foreign_violation.sanctionNotes')}
              value={(values.sanctionNotes as string) ?? ''}
              placeholder={
                readOnly ? undefined : t('common.enterNotesPlaceholder')
              }
              maxHeight="8rem"
              onChange={(v) => setFieldValue('sanctionNotes', v)}
              className={styles['full-span']}
              disabled={readOnly}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Accordion>
            <AccordionItem id="eu-violations">
              <AccordionItemHeader
                title={
                  <Heading modifiers="h3" color="primary">
                    {t('forms.foreign_violation.euViolationsBasicInfo')}
                  </Heading>
                }
              />
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
                        Array.isArray(values.violations)
                          ? (values.violations as string[])
                          : []
                      }
                      items={group.items.map((item) => ({
                        id: `euViolation_${item.value}`,
                        label: item.label,
                        value: item.value,
                        disabled: readOnly,
                        ...(readOnly
                          ? {
                              defaultChecked:
                                (
                                  values.violations as string[] | undefined
                                )?.includes(item.value) ?? false,
                            }
                          : {}),
                      }))}
                      onChange={(val) => {
                        if (!readOnly) {
                          setFieldValue('violations', val);
                        }
                      }}
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
            value={
              readOnly
                ? ((values.recommendedMeasureCode as string) ?? '')
                : [values.recommendedMeasureCode as string]
            }
            required={!readOnly}
            items={recommendedMeasureOptions.map((opt) => ({
              id: `recommendedMeasureCode_${opt.value}`,
              label: t(opt.labelKey),
              value: opt.value,
              disabled: readOnly,
            }))}
            onChange={(val) => {
              if (!readOnly) {
                setFieldValue(
                  'recommendedMeasureCode',
                  Array.isArray(val) ? val[0] : val,
                );
              }
            }}
            className="mb-1"
          />
          {(values.recommendedMeasureCode as string) === 'MUU' && (
            <div
              className={`${isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'} mb-1`}
            >
              <TextField
                id="recommendedMeasureNotes"
                label={t('forms.foreign_violation.recommendedMeasureNotes')}
                value={(values.recommendedMeasureNotes as string) ?? ''}
                onChange={(v) => setFieldValue('recommendedMeasureNotes', v)}
                className={styles['full-span']}
                required={!readOnly}
                disabled={readOnly}
                {...(!readOnly &&
                touched.recommendedMeasureNotes &&
                errors.recommendedMeasureNotes
                  ? {
                      helper: {
                        text: errors.recommendedMeasureNotes as string,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
            </div>
          )}
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextArea
              id="recommendedMeasureGeneralNotes"
              label={t(
                'forms.foreign_violation.recommendedMeasureGeneralNotes',
              )}
              value={
                (values.notes as string) ??
                (values.recommendedMeasureGeneralNotes as string) ??
                ''
              }
              placeholder={
                readOnly ? undefined : t('common.enterNotesPlaceholder')
              }
              maxHeight="8rem"
              onChange={(v) => setFieldValue('notes', v)}
              className={styles['full-span']}
              disabled={readOnly}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-1">
        <Card.Content>
          <Heading element="h3" className="mb-1">
            {t('forms.foreign_violation.dataEntryDateBasicInfo')}
          </Heading>
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <div
              className={
                styles[isDesktop ? 'date-row-desktop-50' : 'date-row-mobile']
              }
            >
              <MaskedDateField
                id="dataEntryDate"
                label={t('forms.foreign_violation.dataEntryDate')}
                monthYearSelectType="grid"
                selected={
                  values.dataEntryDate
                    ? new Date(values.dataEntryDate as string)
                    : undefined
                }
                onSelect={(v) => setFieldValue('dataEntryDate', toIsoDate(v))}
                placeholder={t('common.dateFieldPlaceholder')}
                required={!readOnly}
                inputProps={
                  readOnly
                    ? { disabled: true }
                    : !readOnly && touched.dataEntryDate && errors.dataEntryDate
                      ? {
                          helper: {
                            text: errors.dataEntryDate as string,
                            type: 'error' as const,
                          },
                        }
                      : undefined
                }
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
          <div className={isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'}>
            <TextField
              id="inspectorFirstName"
              label={t('forms.foreign_violation.inspectorFirstName')}
              value={(values.inspectorFirstName as string) ?? ''}
              required={!readOnly}
              onChange={(v) => setFieldValue('inspectorFirstName', v)}
              disabled={readOnly}
              {...(!readOnly &&
              touched.inspectorFirstName &&
              errors.inspectorFirstName
                ? {
                    helper: {
                      text: errors.inspectorFirstName as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
            <TextField
              id="inspectorLastName"
              label={t('forms.foreign_violation.inspectorLastName')}
              value={(values.inspectorLastName as string) ?? ''}
              required={!readOnly}
              onChange={(v) => setFieldValue('inspectorLastName', v)}
              disabled={readOnly}
              {...(!readOnly &&
              touched.inspectorLastName &&
              errors.inspectorLastName
                ? {
                    helper: {
                      text: errors.inspectorLastName as string,
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
                  (o) => o.value === String(values.inspectorOrganisationId),
                ) ?? null
              }
              onChange={handleOrgChange ?? (() => {})}
              required={!readOnly}
              disabled={readOnly}
              {...(!readOnly &&
              touched.inspectorOrganisationId &&
              errors.inspectorOrganisationId
                ? {
                    helper: {
                      text: errors.inspectorOrganisationId as string,
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
                  .find((o) => o.value === (values.inspectorUnit as string)) ??
                null
              }
              onChange={handleStructuralUnitChange ?? (() => {})}
              disabled={readOnly}
            />
            <TextField
              id="inspectorProfession"
              label={t('forms.foreign_violation.inspectorProfession')}
              value={(values.inspectorProfession as string) ?? ''}
              required={!readOnly}
              onChange={(v) => setFieldValue('inspectorProfession', v)}
              disabled={readOnly}
              {...(!readOnly &&
              touched.inspectorProfession &&
              errors.inspectorProfession
                ? {
                    helper: {
                      text: errors.inspectorProfession as string,
                      type: 'error' as const,
                    },
                  }
                : {})}
            />
          </div>
        </Card.Content>
      </Card>

      {values.formNumber && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h3" className="mb-1">
              {t('forms.shared.files.label')}
            </Heading>
            <FileUploadBlock
              formPath="foreign-violation-form"
              formNumber={values.formNumber as string}
              disabled={readOnly}
            />
          </Card.Content>
        </Card>
      )}

    </div>
  );
}
