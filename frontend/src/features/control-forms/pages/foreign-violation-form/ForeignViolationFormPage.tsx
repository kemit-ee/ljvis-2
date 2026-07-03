import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Heading,
  TextField,
  TextArea,
  Select,
  Row,
  Col,
  Card,
  Text,
  ChoiceGroup,
  FileDropzone
} from '@tedi-design-system/react/tedi';
import { DatePicker, TimePicker, Accordion, AccordionItem, AccordionItemHeader, AccordionItemContent } from '@tedi-design-system/react/community';
import { useForeignViolationForm } from './useForeignViolationForm';
import { useAuth } from '../../../auth/AuthContext';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BREAKPOINTS, STRUCTURE_UNIT_OPTIONS } from '../../../../constants/constants';
import dayjs from 'dayjs';
import styles from './ForeignViolationFormPage.module.css';

export function ForeignViolationFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const forbidden = !(hasPermission('foreign_violation_form.write') && hasPermission('foreign_violation_form.read') && hasPermission('classifier.read'));
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const handleSaved = (id?: string) => {
    navigate(`/users/${id}`, { state: { justCreated: true } });
  };

  const euViolationGroups = [
    {
      id: 'msi',
      label: 'Kõige raskemad rikkumised (MSI)',
      items: [
        { value: 'MSI101', label: 'MSI101 - Sõiduaeg ületatud >50%' },
        { value: 'MSI102', label: 'MSI102 - Puhkeaeg lühendatud >50%' },
        { value: 'MSI103', label: 'MSI103 - Sõidumeeriku puudumine' },
      ],
    },
    {
      id: 'vsi',
      label: 'Väga rasked rikkumised (VSI)',
      items: [
        { value: 'VSI800', label: 'VSI800 - Sõiduaeg ületatud 25-50%' },
        { value: 'VSI801', label: 'VSI801 - Puhkeaeg lühendatud 25-50%' },
      ],
    },
    {
      id: 'si',
      label: 'Rasked rikkumised (SI)',
      items: [
        { value: 'SI901', label: 'SI901 - Sõiduaeg ületatud <25%' },
        { value: 'SI902', label: 'SI902 - Puhkeaeg lühendatud <25%' },
      ],
    },
  ];

  const recommendedMeasureOptions = [
    { value: 'PUUDUVAD', labelKey: 'forms.foreign_violation.recommendedMeasureNone' },
    { value: 'HOIATUS', labelKey: 'forms.foreign_violation.recommendedMeasureWarning' },
    { value: 'KOIGI_VOI_OSA_TEGEVUSLOA_ARAKIRJAD_PEATAMINE', labelKey: 'forms.foreign_violation.recommendedMeasureSuspension1' },
    { value: 'KOIGI_VOI_OSA_TEGEVUSLOA_ARAKIRJAD_KEHTEVUKS', labelKey: 'forms.foreign_violation.recommendedMeasureWithdrawal1' },
    { value: 'TEGEVUSLOA_ARAKIRJAD_PEATAMINE', labelKey: 'forms.foreign_violation.recommendedMeasureSuspension2' },
    { value: 'TEGEVUSLOA_KEHTEVUKS', labelKey: 'forms.foreign_violation.recommendedMeasureWithdrawal2' },
    { value: 'JUHITUNNISTUSE_KEELDUMINE', labelKey: 'forms.foreign_violation.recommendedMeasureRefusal' },
    { value: 'JUHITUNNISTUSE_KEHTEVUKS', labelKey: 'forms.foreign_violation.recommendedMeasureWithdrawal3' },
    { value: 'MUU', labelKey: 'forms.foreign_violation.recommendedMeasureOther' },
  ];

  const sanctionOptions = [
    { value: 'KORRAS', labelKey: 'forms.foreign_violation.sanctionKorras' },
    { value: 'HOIATUS', labelKey: 'forms.foreign_violation.sanctionHoiatus' },
    { value: 'KABOTAAŽVEO AJUTINE KEELAMINE', labelKey: 'forms.foreign_violation.sanctionKabotaaz' },
    { value: 'TRAHV', labelKey: 'forms.foreign_violation.sanctionTrahv' },
    { value: 'LIIKLEMISKEELD', labelKey: 'forms.foreign_violation.sanctionLiiklemiskeeld' },
    { value: 'SÕIDUKI KASUTAMISE TAKISTAMINE', labelKey: 'forms.foreign_violation.sanctionSoiduk' },
    { value: 'MUU', labelKey: 'forms.foreign_violation.sanctionMuu' },
  ];

  const {
    formik,
    countryOptions,
    orgOptions,
    handleOrgChange,
    handleStructuralUnitChange,
  } = useForeignViolationForm(undefined, handleSaved);

  if (forbidden) return <Text>{t('common.forbidden')}</Text>;

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <div className="card-main">
          <Heading element="h1">
            vr-{new Date().getFullYear()}-?????/1
          </Heading>
        </div>

        <div>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.reportingBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <Select
                      id="reportingCountry"
                      label={t('forms.foreign_violation.reportingCountry')}
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.reportingCountryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'reportingCountryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                      required
                      {...(formik.touched.reportingCountryCode && formik.errors.reportingCountryCode
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
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('reportingAuthority', v)}
                      required
                      {...(formik.touched.reportingAuthority && formik.errors.reportingAuthority
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.inspectionBasicInfo')}
                  </Heading>
                  <div
                      className={
                        styles[
                            isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                            ]
                      }
                      style={{ alignItems: 'start' }}
                  >
                    <div
                        className={
                          styles[
                              isDesktop ? 'date-row-desktop' : 'date-row-mobile'
                              ]
                        }
                    >
                      <DatePicker
                          id="inspectionDate"
                          label={t('forms.foreign_violation.inspectionDate')}
                          disableFuture
                          value={
                            formik.values.inspectionDate
                                ? dayjs(formik.values.inspectionDate)
                                : null
                          }
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
                          value={
                            formik.values.inspectionTime
                                ? dayjs(formik.values.inspectionTime)
                                : null
                          }
                          onChange={(v) => formik.setFieldValue('inspectionTime', v)}
                          placeholder={t('forms.foreign_violation.timePickerPlaceholder')}
                          {...(formik.touched.inspectionTime && formik.errors.inspectionTime
                              ? {
                                helper: {
                                  text: formik.errors.inspectionTime,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                      />
                    </div>
                    <div></div>
                    <div>
                      <TextField
                          id="inspectionAddressLine1"
                          label={t('forms.foreign_violation.inspectionAddressLine1')}
                          value={formik.values.inspectionAddressLine1}
                          input={{ maxLength: 300 }}
                          onChange={(v) => formik.setFieldValue('inspectionAddressLine1', v)}
                          {...(formik.touched.inspectionAddressLine1 &&
                          formik.errors.inspectionAddressLine1
                              ? {
                                helper: {
                                  text: formik.errors.inspectionAddressLine1,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                      />
                    </div>
                    <TextField
                        id="inspectionAddressLine2"
                        label={t('forms.foreign_violation.inspectionAddressLine2')}
                        value={formik.values.inspectionAddressLine2}
                        input={{ maxLength: 300 }}
                        onChange={(v) => formik.setFieldValue('inspectionAddressLine2', v)}
                        {...(formik.touched.inspectionAddressLine2 &&
                        formik.errors.inspectionAddressLine2
                            ? {
                              helper: {
                                text: formik.errors.inspectionAddressLine2,
                                type: 'error' as const,
                              },
                            }
                            : {})}
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
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.inspectionCountryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'inspectionCountryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.companyBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
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
                      <Button
                        onClick={() => {}}
                      >
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
                      <Button
                        onClick={() => {}}
                      >
                        {t('common.search')}
                      </Button>
                    </div>
                    <Select
                      id="companyCountry"
                      label={t('forms.foreign_violation.companyCountry')}
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.companyCountryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'companyCountryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.driverBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.vehicleBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
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
                          onChange={(v) => formik.setFieldValue('vehicleRegNr', v)}
                        />
                      </div>
                      <Button
                        onClick={() => {}}
                      >
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
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.vehicleCountryCode) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'vehicleCountryCode',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
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
                        styles[
                          isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                        ]
                      }
                    >
                      <DatePicker
                        id="vehicleFirstRegistration"
                        label={t('forms.foreign_violation.vehicleFirstRegistration')}
                        value={
                          formik.values.vehicleFirstRegistration
                            ? dayjs(formik.values.vehicleFirstRegistration)
                            : null
                        }
                        onChange={(v) => formik.setFieldValue('vehicleFirstRegistration', v)}
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.licenceCopyBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
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
                      <Button
                        onClick={() => {}}
                      >
                        {t('common.search')}
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.violationDescriptionBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextArea
                      id="violationDescription"
                      label={t('forms.foreign_violation.violationDescription')}
                      value={formik.values.violationDescription}
                      placeholder={t('forms.foreign_violation.violationDescriptionPlaceholder')}
                      onChange={(v) => formik.setFieldValue('violationDescription', v)}
                      className={styles['full-span']}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.minorViolationsBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextField
                      id="minorViolationsCount"
                      label={t('forms.foreign_violation.minorViolationsCount')}
                      value={formik.values.minorViolationsCount}
                      input={{ type: 'number', min: 0 }}
                      onChange={(v) => formik.setFieldValue('minorViolationsCount', v)}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
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
                    onChange={(val) => formik.setFieldValue('sanctionCode', Array.isArray(val) ? val[0] : val)}
                    className="mb-1"
                  />
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextArea
                      id="sanctionNotes"
                      label={t('forms.foreign_violation.sanctionNotes')}
                      value={formik.values.sanctionNotes}
                      placeholder={t('forms.foreign_violation.sanctionNotesPlaceholder')}
                      onChange={(v) => formik.setFieldValue('sanctionNotes', v)}
                      className={styles['full-span']}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Accordion defaultOpenItem={[]}>
                    <AccordionItem id="eu-violations">
                      <AccordionItemHeader
                        closeText=" "
                        openText=" "
                      >
                        <strong>{t('forms.foreign_violation.euViolationsBasicInfo')}</strong>
                      </AccordionItemHeader>
                      <AccordionItemContent>
                        {euViolationGroups.map((group) => (
                          <div key={group.id} className="mb-1">
                            <Text element="p" modifiers="bold">{group.label}</Text>
                            <ChoiceGroup
                              id={`euViolations_${group.id}`}
                              name={`euViolations_${group.id}`}
                              inputType="checkbox"
                              label=""
                              value={[]}
                              items={group.items.map((item) => ({
                                id: `euViolation_${item.value}`,
                                label: item.label,
                                value: item.value,
                              }))}
                              onChange={() => {}}
                            />
                          </div>
                        ))}
                      </AccordionItemContent>
                    </AccordionItem>
                  </Accordion>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.recommendedMeasureBasicInfo')}
                  </Heading>
                  <ChoiceGroup
                    id="recommendedMeasureCode"
                    name="recommendedMeasureCode"
                    inputType="radio"
                    label={<strong>{t('forms.foreign_violation.recommendedMeasureCode')}</strong>}
                    value={[formik.values.recommendedMeasureCode]}
                    required
                    items={recommendedMeasureOptions.map((opt) => ({
                      id: `recommendedMeasureCode_${opt.value}`,
                      label: t(opt.labelKey),
                      value: opt.value,
                    }))}
                    onChange={(val) => formik.setFieldValue('recommendedMeasureCode', Array.isArray(val) ? val[0] : val)}
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
                        onChange={(v) => formik.setFieldValue('recommendedMeasureNotes', v)}
                        className={styles['full-span']}
                        required
                      />
                    </div>
                  )}
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextArea
                      id="recommendedMeasureGeneralNotes"
                      label={t('forms.foreign_violation.recommendedMeasureGeneralNotes')}
                      value={formik.values.recommendedMeasureGeneralNotes}
                      placeholder={t('forms.foreign_violation.recommendedMeasureGeneralNotesPlaceholder')}
                      onChange={(v) => formik.setFieldValue('recommendedMeasureGeneralNotes', v)}
                      className={styles['full-span']}
                    />
                  </div>
                </Card.Content>
              </Card>
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.dataEntryDateBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <div
                      className={
                        styles[
                          isDesktop ? 'date-row-desktop-50' : 'date-row-mobile'
                        ]
                      }
                    >
                      <DatePicker
                        id="dataEntryDate"
                        label={t('forms.foreign_violation.dataEntryDate')}
                        value={
                          formik.values.dataEntryDate
                            ? dayjs(formik.values.dataEntryDate)
                            : null
                        }
                        onChange={(v) => formik.setFieldValue('dataEntryDate', v)}
                        placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                        required
                        {...(formik.touched.dataEntryDate &&
                        formik.errors.dataEntryDate
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.inspectorBasicInfo')}
                  </Heading>
                  <div
                    className={
                      styles[
                        isDesktop ? 'form-grid-desktop' : 'form-grid-mobile'
                      ]
                    }
                  >
                    <TextField
                      id="inspectorFirstName"
                      label={t('forms.foreign_violation.inspectorFirstName')}
                      value={formik.values.inspectorFirstName}
                      required
                      onChange={(v) => formik.setFieldValue('inspectorFirstName', v)}
                      {...(formik.touched.inspectorFirstName && formik.errors.inspectorFirstName
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
                      {...(formik.touched.inspectorLastName && formik.errors.inspectorLastName
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
                          (o) => o.value === String(formik.values.inspectorOrganisationId),
                        ) ?? null
                      }
                      onChange={handleOrgChange}
                      required
                      {...(formik.touched.inspectorOrganisationId && formik.errors.inspectorOrganisationId
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
                      options={STRUCTURE_UNIT_OPTIONS.map((opt) => ({
                        label: t(opt.labelKey),
                        value: opt.value,
                      }))}
                      value={
                        STRUCTURE_UNIT_OPTIONS.map((opt) => ({
                          label: t(opt.labelKey),
                          value: opt.value,
                        })).find(
                          (o) => o.value === formik.values.inspectorUnit,
                        ) ?? null
                      }
                      onChange={handleStructuralUnitChange}
                      required
                      {...(formik.touched.inspectorUnit && formik.errors.inspectorUnit
                          ? {
                            helper: {
                              text: formik.errors.inspectorUnit,
                              type: 'error' as const,
                            },
                          }
                          : {})}
                    />
                    <TextField
                      id="inspectorProfession"
                      label={t('forms.foreign_violation.inspectorProfession')}
                      value={formik.values.inspectorProfession}
                      required
                      onChange={(v) => formik.setFieldValue('inspectorProfession', v)}
                      {...(formik.touched.inspectorProfession && formik.errors.inspectorProfession
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
            </Col>
          </Row>
          <Row className="m-0">
            <Col className="p-0">
              <Card className="mb-1">
                <Card.Content>
                  <Heading element="h3" className="mb-1">
                    {t('forms.foreign_violation.filesBasicInfo')}
                  </Heading>
                  <FileDropzone
                    id="files"
                    name="file-dropzone"
                    label={t('forms.foreign_violation.filesBoxInfo')}
                    onChange={(files) => formik.setFieldValue('files', files)}
                    maxSize={10}
                    helper={{
                      text: t('forms.foreign_violation.filesHelper')
                    }}
                    accept=".jpg,.jpeg,.png,.gif,.bmp,.tif,.tiff,.pdf,.doc,.docx,.xls,.xlsx,.odt,.rtf,.msg,.eml,.txt,.zip,.ddd"
                  />
                </Card.Content>
              </Card>
            </Col>
          </Row>
        </div>

        <div className="page-actions">
          {
            <div className="page-actions-buttons">
              <Button
                visualType="secondary"
                onClick={() => navigate('/')}
              >
                {t('users.cancel')}
              </Button>
              <Button type="submit">{t('users.save')}</Button>
            </div>
          }
        </div>
      </form>
    </div>
  );
}
