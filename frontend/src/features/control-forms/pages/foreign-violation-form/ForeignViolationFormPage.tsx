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
import { BREAKPOINTS } from '../../../../constants/constants';
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

  const structuralUnits = [
    { value: 'LÕUNA PREFEKTUUR', label: 'LÕUNA PREFEKTUUR' },
    { value: 'IDA PREFEKTUUR', label: 'IDA PREFEKTUUR' },
    { value: 'LÄÄNE PREFEKTUUR', label: 'LÄÄNE PREFEKTUUR' },
    { value: 'PÕHJA PREFEKTUUR', label: 'PÕHJA PREFEKTUUR' },
    { value: 'KLIM', label: 'KLIM' },
    { value: 'TRAM', label: 'TRAM' },
  ];

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
    { value: 'Puuduvad', labelKey: 'forms.foreign_violation.recommendedMeasurePuuduvad' },
    { value: 'Hoiatus', labelKey: 'forms.foreign_violation.recommendedMeasureHoiatus' },
    { value: 'Peatamine1', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet1' },
    { value: 'Kehtetuks1', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet2' },
    { value: 'Peatamine2', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet3' },
    { value: 'Kehtetuks2', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet4' },
    { value: 'Keeldumine', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet5' },
    { value: 'Kehtetuks3', labelKey: 'forms.foreign_violation.recommendedMeasureTeadet6' },
    { value: 'Muu', labelKey: 'forms.foreign_violation.recommendedMeasureMuu' },
  ];

  const sanctionOptions = [
    { value: 'Korras', labelKey: 'forms.foreign_violation.sanctionKorras' },
    { value: 'Hoiatus', labelKey: 'forms.foreign_violation.sanctionHoiatus' },
    { value: 'Kabotaažveo ajutine keelamine', labelKey: 'forms.foreign_violation.sanctionKabotaaz' },
    { value: 'Trahv', labelKey: 'forms.foreign_violation.sanctionTrahv' },
    { value: 'Liiklemiskeeld', labelKey: 'forms.foreign_violation.sanctionLiiklemiskeeld' },
    { value: 'Sõiduki kasatamise takistamine', labelKey: 'forms.foreign_violation.sanctionSoiduk' },
    { value: 'Muu', labelKey: 'forms.foreign_violation.sanctionMuu' },
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
                      value={countryOptions.find((o) => o.value === formik.values.reportingCountry) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'reportingCountry',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                      required
                    />
                    <TextField
                      id="reportingAuthority"
                      label={t('forms.foreign_violation.reportingAuthority')}
                      value={formik.values.lastName}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('reportingAuthority', v)}
                      required
                      {...(formik.touched.lastName && formik.errors.lastName
                        ? {
                            helper: {
                              text: formik.errors.lastName,
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
                          value={
                            formik.values.accessStart
                                ? dayjs(formik.values.accessStart)
                                : null
                          }
                          onChange={(v) => formik.setFieldValue('accessStart', v)}
                          placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                          required
                          {...(formik.touched.accessStart &&
                          formik.errors.accessStart
                              ? {
                                helper: {
                                  text: formik.errors.accessStart,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                      />
                      <TimePicker
                          id="inspectionTime"
                          label={t('forms.foreign_violation.inspectionTime')}
                          value={
                            formik.values.accessEnd
                                ? dayjs(formik.values.accessEnd)
                                : null
                          }
                          onChange={(v) => formik.setFieldValue('accessEnd', v)}
                          placeholder={t('forms.foreign_violation.timePickerPlaceholder')}
                          {...(formik.touched.inspectionTime && formik.errors.inspectionTime
                              ? {
                                helper: {
                                  text: formik.errors.accessEnd,
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
                          value={formik.values.jobTitleName}
                          input={{ maxLength: 300 }}
                          onChange={(v) => formik.setFieldValue('inspectionAddressLine1', v)}
                          {...(formik.touched.jobTitleName &&
                          formik.errors.jobTitleName
                              ? {
                                helper: {
                                  text: formik.errors.jobTitleName,
                                  type: 'error' as const,
                                },
                              }
                              : {})}
                      />
                    </div>
                    <TextField
                        id="inspectionAddressLine2"
                        label={t('forms.foreign_violation.inspectionAddressLine2')}
                        value={formik.values.jobTitleName}
                        input={{ maxLength: 300 }}
                        onChange={(v) => formik.setFieldValue('inspectionAddressLine2', v)}
                        {...(formik.touched.jobTitleName &&
                        formik.errors.jobTitleName
                            ? {
                              helper: {
                                text: formik.errors.jobTitleName,
                                type: 'error' as const,
                              },
                            }
                            : {})}
                    />
                    <TextField
                        id="inspectionRegion"
                        label={t('forms.foreign_violation.inspectionRegion')}
                        value={formik.values.email}
                        onChange={(v) => formik.setFieldValue('inspectionRegion', v)}
                        input={{ maxLength: 100 }}
                        {...(formik.touched.email && formik.errors.email
                            ? {
                              helper: {
                                text: formik.errors.email,
                                type: 'error' as const,
                              },
                            }
                            : {})}
                    />
                    <TextField
                        id="inspectionCity"
                        label={t('forms.foreign_violation.inspectionCity')}
                        value={formik.values.email}
                        onChange={(v) => formik.setFieldValue('inspectionCity', v)}
                        input={{ maxLength: 100 }}
                        {...(formik.touched.email && formik.errors.email
                            ? {
                              helper: {
                                text: formik.errors.email,
                                type: 'error' as const,
                              },
                            }
                            : {})}
                    />
                    <Select
                      id="inspectionCountry"
                      label={t('forms.foreign_violation.inspectionCountry')}
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.inspectionCountry) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'inspectionCountry',
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
                    <TextField
                      id="companyRegCode"
                      label={t('forms.foreign_violation.companyRegCode')}
                      value={formik.values.firstName}
                      input={{ maxLength: 20 }}
                      onChange={(v) => formik.setFieldValue('companyRegCode', v)}
                    />
                    <TextField
                      id="companyName"
                      label={t('forms.foreign_violation.companyName')}
                      value={formik.values.lastName}
                      input={{ maxLength: 300 }}
                      onChange={(v) => formik.setFieldValue('companyName', v)}
                    />
                    <Select
                      id="companyCountry"
                      label={t('forms.foreign_violation.companyCountry')}
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.companyCountry) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'companyCountry',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                    />
                    <TextField
                      id="companyAddressLine1"
                      label={t('forms.foreign_violation.companyAddressLine1')}
                      value={formik.values.structuralUnitName}
                      input={{ maxLength: 300 }}
                      onChange={(v) => formik.setFieldValue('companyAddressLine1', v)}
                    />
                    <TextField
                      id="companyAddressLine2"
                      label={t('forms.foreign_violation.companyAddressLine2')}
                      value={formik.values.jobTitleName}
                      input={{ maxLength: 300 }}
                      onChange={(v) => formik.setFieldValue('companyAddressLine2', v)}
                    />
                    <TextField
                      id="companyCity"
                      label={t('forms.foreign_violation.companyCity')}
                      value={formik.values.email}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('companyCity', v)}
                    />
                    <TextField
                      id="companyPostalCode"
                      label={t('forms.foreign_violation.companyPostalCode')}
                      value={formik.values.phone}
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
                      value={formik.values.firstName}
                      input={{ maxLength: 200 }}
                      onChange={(v) => formik.setFieldValue('driverFirstName', v)}
                    />
                    <TextField
                      id="driverLastName"
                      label={t('forms.foreign_violation.driverLastName')}
                      value={formik.values.lastName}
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
                    <TextField
                      id="vehicleRegNr"
                      label={t('forms.foreign_violation.vehicleRegNr')}
                      value={formik.values.firstName}
                      input={{ maxLength: 20 }}
                      onChange={(v) => formik.setFieldValue('vehicleRegNr', v)}
                    />
                    <TextField
                      id="vehicleMake"
                      label={t('forms.foreign_violation.vehicleMake')}
                      value={formik.values.lastName}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('vehicleMake', v)}
                    />
                    <TextField
                      id="vehicleModel"
                      label={t('forms.foreign_violation.vehicleModel')}
                      value={formik.values.personalCode}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('vehicleModel', v)}
                    />
                    <Select
                      id="vehicleCountry"
                      label={t('forms.foreign_violation.vehicleCountry')}
                      options={countryOptions}
                      value={countryOptions.find((o) => o.value === formik.values.vehicleCountry) ?? null}
                      onChange={(val) =>
                        formik.setFieldValue(
                          'vehicleCountry',
                          val && !Array.isArray(val) ? (val as { value: string }).value : '',
                        )
                      }
                    />
                    <TextField
                      id="vehicleVin"
                      label={t('forms.foreign_violation.vehicleVin')}
                      value={formik.values.jobTitleName}
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
                          formik.values.accessStart
                            ? dayjs(formik.values.accessStart)
                            : null
                        }
                        onChange={(v) => formik.setFieldValue('vehicleFirstRegistration', v)}
                        placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                      />
                    </div>
                    <TextField
                      id="vehicleBodyType"
                      label={t('forms.foreign_violation.vehicleBodyType')}
                      value={formik.values.email}
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
                    <TextField
                      id="licenceCopyNumber"
                      label={t('forms.foreign_violation.licenceCopyNumber')}
                      value={formik.values.firstName}
                      input={{ maxLength: 100 }}
                      onChange={(v) => formik.setFieldValue('licenceCopyNumber', v)}
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
                      value={formik.values.phone}
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
                      value={formik.values.phone}
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
                    value={[formik.values.accessStart]}
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
                      value={formik.values.phone}
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
                    value={[formik.values.accessStart]}
                    required
                    items={recommendedMeasureOptions.map((opt) => ({
                      id: `recommendedMeasureCode_${opt.value}`,
                      label: t(opt.labelKey),
                      value: opt.value,
                    }))}
                    onChange={(val) => formik.setFieldValue('recommendedMeasureCode', Array.isArray(val) ? val[0] : val)}
                    className="mb-1"
                  />
                  {formik.values.accessStart === 'Muu' && (
                    <div
                      className={`${styles[isDesktop ? 'form-grid-desktop' : 'form-grid-mobile']} mb-1`}
                    >
                      <TextField
                        id="recommendedMeasureNotes"
                        label={t('forms.foreign_violation.recommendedMeasureNotes')}
                        value={formik.values.phone}
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
                      value={formik.values.phone}
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
                          formik.values.accessStart
                            ? dayjs(formik.values.accessStart)
                            : null
                        }
                        onChange={(v) => formik.setFieldValue('dataEntryDate', v)}
                        placeholder={t('forms.foreign_violation.datePickerPlaceholder')}
                        required
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
                      value={formik.values.phone}
                      required
                      onChange={(v) => formik.setFieldValue('inspectorFirstName', v)}
                    />
                    <TextField
                      id="inspectorLastName"
                      label={t('forms.foreign_violation.inspectorLastName')}
                      value={formik.values.phone}
                      required
                      onChange={(v) => formik.setFieldValue('inspectorLastName', v)}
                    />
                    <Select
                      id="inspectorOrganisation"
                      label={t('forms.foreign_violation.inspectorOrganisation')}
                      options={orgOptions}
                      value={
                        orgOptions.find(
                          (o) => o.value === String(formik.values.organisationId),
                        ) ?? null
                      }
                      onChange={handleOrgChange}
                      required
                    />
                    <Select
                      id="inspectorUnit"
                      label={t('forms.foreign_violation.inspectorUnit')}
                      options={structuralUnits}
                      value={
                        structuralUnits.find(
                          (o) => o.value === formik.values.structuralUnitName,
                        ) ?? null
                      }
                      onChange={handleStructuralUnitChange}
                      required
                    />
                    <TextField
                      id="inspectorProfession"
                      label={t('forms.foreign_violation.inspectorProfession')}
                      value={formik.values.phone}
                      required
                      onChange={(v) => formik.setFieldValue('inspectorProfession', v)}
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
                type="button"
                visualType="secondary"
                onClick={() => navigate('/users')}
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
