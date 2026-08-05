import { useTranslation } from 'react-i18next';
import type { useDriveRestForm } from '../../pages/drive-rest-form/useDriveRestForm';
import {
  Heading,
  Row,
  Col,
  Card,
  ChoiceGroup,
  TextField,
  Text,
  Separator,
  Accordion,
  AccordionItem,
  AccordionItemContent,
  AccordionItemHeader,
  TextArea,
  Alert,
} from '@tedi-design-system/react/tedi';
import type { ClassifierValueData } from '../../../classifier-values/types';
import type { CheckEntry } from '../../types.ts';
import { ModalResultSection } from './ModalResultSection/ModalResultSection';
import { DocRightOtherSection } from './DocRightOtherSection';
import styles from '../../pages/drive-rest-form/DriveRestFormPage.module.css';
import { FormFiles } from '../../../forms/components/FormFiles.tsx';

interface ChoiceItem {
  id: string;
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface Props {
  type: string;
  formik: ReturnType<typeof useDriveRestForm>['formik'];
  isDesktop: boolean;
  transportClassItems: ClassifierValueData[];
  cargoCabotageViolations: ClassifierValueData[];
  passengerCabotageViolations: ClassifierValueData[];
  docRightChecks: ClassifierValueData[];
  docRightOtherDocs: ClassifierValueData[];
  tachographTypes: ClassifierValueData[];
  drivingViolations: ClassifierValueData[];
  massDimensions: ClassifierValueData[];
  readOnly?: boolean;
}

export function DriveRestFormFields({
  type,
  formik,
  isDesktop,
  transportClassItems,
  cargoCabotageViolations,
  passengerCabotageViolations,
  docRightChecks,
  docRightOtherDocs,
  tachographTypes,
  drivingViolations,
  massDimensions,
  readOnly,
}: Props) {
  const { t } = useTranslation();

  const withDisabled = (items: ChoiceItem[]): ChoiceItem[] =>
    readOnly ? items.map((item) => ({ ...item, disabled: true })) : items;

  const handleTachographTypeChange = (val: string) => {
    formik.setFieldValue('tachographTypeCode', val);
    if (val) {
      formik.setFieldValue('spApplicability', 'RAKENDATAKSE');
    }
  };

  const hasCabotage = Array.isArray(formik.values.transportClasses)
    ? formik.values.transportClasses.some(
        (item) => item.classCode === 'CABOTAGE',
      )
    : false;

  const cabotageSubItems = [
    ...(formik.values.transportType === 'Veosevedu'
      ? cargoCabotageViolations.map((v) => ({
          id: v.code,
          value: v.code,
          label: (
            <Text>
              <strong>{v.description}</strong>
              <Separator
                axis="vertical"
                color="secondary"
                display="inline"
                dotSize="small"
                element="span"
                spacing={0.3}
                variant="dot-only"
              />
              {v.name}
            </Text>
          ),
        }))
      : []),
    ...(formik.values.transportType === 'Sõitjatevedu'
      ? passengerCabotageViolations.map((v) => ({
          id: v.code,
          value: v.code,
          label: (
            <Text>
              <strong>{v.description}</strong>
              <Separator
                axis="vertical"
                color="secondary"
                display="inline"
                dotSize="small"
                element="span"
                spacing={0.3}
                variant="dot-only"
              />
              {v.name}
            </Text>
          ),
        }))
      : []),
  ];

  return (
    <div>
      {/* Plokk: Veoliik ja veoklass */}
      <Row className="m-0">
        <Col className="p-0">
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.sp_form.transportClass')}
              </Heading>
              <ChoiceGroup
                id="transportType"
                label={
                  <strong>
                    {t('forms.sp_form.transportType')}{' '}
                    <span className={styles['required-star']}>*</span>
                  </strong>
                }
                name="transportType"
                inputType="radio"
                direction="row"
                value={formik.values.transportType}
                onChange={(val) =>
                  formik.setFieldValue('transportType', val as string)
                }
                required
                className="mb-1"
                items={withDisabled([
                  {
                    id: 'transport_type_passenger',
                    value: 'Sõitjatevedu',
                    label: t('forms.sp_form.transportTypePassenger'),
                  },
                  {
                    id: 'transport_type_cargo',
                    value: 'Veosevedu',
                    label: t('forms.sp_form.transportTypeCargo'),
                  },
                ])}
                {...(formik.touched.transportType && formik.errors.transportType
                  ? {
                      helper: {
                        text: formik.errors.transportType,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
              <ChoiceGroup
                id="transportEmptyRun"
                label=""
                name="transportEmptyRun"
                className="mb-1"
                inputType="checkbox"
                value={formik.values.transportEmptyRun ? ['Tühisõit'] : []}
                onChange={(val) =>
                  formik.setFieldValue(
                    'transportEmptyRun',
                    (val as string[]).includes('Tühisõit'),
                  )
                }
                items={withDisabled([
                  {
                    id: 'transport_empty_run',
                    value: 'Tühisõit',
                    label: t('forms.sp_form.transportEmptyRun'),
                  },
                ])}
              />
              <ChoiceGroup
                id="transportNature"
                label={<strong>{t('forms.sp_form.transportNature')}</strong>}
                name="transportNature"
                className="mb-1"
                inputType="radio"
                direction="row"
                value={formik.values.transportNature}
                onChange={(val) =>
                  formik.setFieldValue('transportNature', val as string)
                }
                items={withDisabled([
                  {
                    id: 'transport_nature_commercial',
                    value: 'Tasuline',
                    label: t('forms.sp_form.transportNatureCommercial'),
                  },
                  {
                    id: 'transport_nature_own',
                    value: 'Oma kulul',
                    label: t('forms.sp_form.transportNatureOwn'),
                  },
                ])}
              />
              <ChoiceGroup
                id="transportNatureExempt"
                label=""
                name="transportNatureExempt"
                inputType="checkbox"
                value={
                  formik.values.transportNatureExempt
                    ? ['Tegevusloa nõudest vabastatud vedu']
                    : []
                }
                onChange={(val) =>
                  formik.setFieldValue(
                    'transportNatureExempt',
                    (val as string[]).includes(
                      'Tegevusloa nõudest vabastatud vedu',
                    ),
                  )
                }
                items={withDisabled([
                  {
                    id: 'transport_nature_exempt',
                    value: 'Tegevusloa nõudest vabastatud vedu',
                    label: t('forms.sp_form.transportNatureExempt'),
                  },
                ])}
              />
            </Card.Content>
          </Card>
        </Col>
      </Row>
      {/* Plokk: Veoklass */}
      <Row className="m-0">
        <Col className="p-0">
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.sp_form.cargoClass')}
              </Heading>
              {(() => {
                const cabotageIdx = transportClassItems.findIndex(
                  (c) => c.code === 'CABOTAGE',
                );
                const beforeCabotage =
                  cabotageIdx >= 0
                    ? transportClassItems.slice(0, cabotageIdx + 1)
                    : transportClassItems;
                const afterCabotage =
                  cabotageIdx >= 0
                    ? transportClassItems.slice(cabotageIdx + 1)
                    : [];
                const toItems = (list: typeof transportClassItems) =>
                  list.map((cls) => ({
                    id: cls.code,
                    value: cls.code,
                    label: cls.name,
                  }));
                const handleChange = (val: string[]) => {
                  const transportClassObjects = val.map((code) => ({
                    classCode: code,
                    className:
                      transportClassItems.find((tc) => tc.code === code)
                        ?.name || code,
                  }));
                  formik.setFieldValue(
                    'transportClasses',
                    transportClassObjects,
                  );
                  if (!val.includes('CABOTAGE'))
                    formik.setFieldValue('cabotageViolations', []);
                };
                const transportClassesValue = Array.isArray(
                  formik.values.transportClasses,
                )
                  ? formik.values.transportClasses.map((item) => item.classCode)
                  : [];
                const cabotageViolationsValue = Array.isArray(
                  formik.values.cabotageViolations,
                )
                  ? formik.values.cabotageViolations.map(
                      (item) => item.violationCode,
                    )
                  : [];
                return (
                  <>
                    <ChoiceGroup
                      id="transportClassesBefore"
                      className={styles['choice-item-gap']}
                      label=""
                      name="transportClasses"
                      inputType="checkbox"
                      value={transportClassesValue}
                      onChange={(val) => handleChange(val as string[])}
                      items={withDisabled(toItems(beforeCabotage))}
                    />
                    {hasCabotage &&
                      type === 'driver' &&
                      cabotageSubItems.length > 0 && (
                        <div className={styles['cabotage-indent']}>
                          <ChoiceGroup
                            id="cabotageViolations"
                            className={styles['choice-item-gap']}
                            label=""
                            name="cabotageViolations"
                            inputType="checkbox"
                            value={cabotageViolationsValue}
                            onChange={(val) => {
                              const cabotageViolationObjects = (
                                val as string[]
                              ).map((code) => {
                                const violation = cargoCabotageViolations.find(
                                  (v) => v.code === code,
                                );
                                return {
                                  violationCode: code,
                                  severityCode: violation?.description,
                                };
                              });
                              formik.setFieldValue(
                                'cabotageViolations',
                                cabotageViolationObjects,
                              );
                            }}
                            items={withDisabled(cabotageSubItems)}
                          />
                        </div>
                      )}
                    {afterCabotage.length > 0 && (
                      <ChoiceGroup
                        id="transportClassesAfter"
                        className={styles['choice-item-gap']}
                        label=""
                        name="transportClasses"
                        inputType="checkbox"
                        value={transportClassesValue}
                        onChange={(val) => handleChange(val as string[])}
                        items={withDisabled(toItems(afterCabotage))}
                      />
                    )}
                  </>
                );
              })()}
            </Card.Content>
          </Card>
        </Col>
      </Row>
      {/* Plokk: Kontrolli tulemus */}
      <Row className="m-0">
        <Col className="p-0">
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.sp_form.controlResult')}
              </Heading>
              <ChoiceGroup
                id="controlResult"
                label={
                  <strong>
                    {t('forms.sp_form.controlResultLabel')}{' '}
                    <span className={styles['required-star']}>*</span>
                  </strong>
                }
                name="resultType"
                inputType="radio"
                direction="row"
                value={formik.values.resultType}
                onChange={(val) => {
                  if (val === 'KORRAS') {
                    formik.setFieldValue('proceedingType', '');
                    formik.setFieldValue('proceedingReferenceNumber', '');
                  }
                  formik.setFieldValue('resultType', val as string);
                }}
                required
                className="mb-1"
                items={withDisabled([
                  {
                    id: 'result_korras',
                    value: 'KORRAS',
                    label: t('forms.sp_form.controlResultKorras'),
                  },
                  {
                    id: 'result_hoiatus',
                    value: 'HOIATUS',
                    label: t('forms.sp_form.controlResultHoiatus'),
                  },
                  {
                    id: 'result_ettekirjutus',
                    value: 'ETTEKIRJUTUS',
                    label: t('forms.sp_form.controlResultEttekirjutus'),
                  },
                  {
                    id: 'result_juhtimiselt',
                    value: 'JUHTIMISELT',
                    label: t('forms.sp_form.controlResultJuhtimiselt'),
                  },
                  {
                    id: 'result_arest',
                    value: 'AREST',
                    label: t('forms.sp_form.controlResultArest'),
                  },
                  {
                    id: 'result_autovedu',
                    value: 'AUTOVEDU',
                    label: t('forms.sp_form.controlResultAutovedu'),
                  },
                  {
                    id: 'result_alustati',
                    value: 'ALUSTATI',
                    label: t('forms.sp_form.controlResultAlustati'),
                  },
                ])}
                {...(formik.touched.resultType && formik.errors.resultType
                  ? {
                      helper: {
                        text: formik.errors.resultType,
                        type: 'error' as const,
                      },
                    }
                  : {})}
              />
              {formik.values.resultType !== 'KORRAS' &&
                formik.values.resultType !== 'HOIATUS' &&
                formik.values.resultType !== '' && (
                  <>
                    {(() => {
                      const PROCEEDING_TYPES = [
                        {
                          id: 'proceeding_lyhi',
                          value: 'LYHI',
                          label: t('forms.sp_form.proceedingTypeLyhi'),
                        },
                        {
                          id: 'proceeding_kiir',
                          value: 'KIIR',
                          label: t('forms.sp_form.proceedingTypeKiir'),
                        },
                        {
                          id: 'proceeding_yld',
                          value: 'YLD',
                          label: t('forms.sp_form.proceedingTypeYld'),
                        },
                      ];
                      const labelIdx = PROCEEDING_TYPES.findIndex(
                        (p) => p.value === formik.values.proceedingType,
                      );
                      const isValidType = labelIdx !== -1;
                      return (
                        <>
                          {formik.values.proceedingType === '' && (
                            <ChoiceGroup
                              id="proceedingTypePart0"
                              className={styles['choice-item-gap']}
                              label={t('forms.sp_form.proceedingType')}
                              name="proceedingType"
                              inputType="radio"
                              value={formik.values.proceedingType}
                              onChange={(val) => {
                                formik.setFieldValue(
                                  'proceedingType',
                                  val as string,
                                );
                                formik.setFieldValue(
                                  'proceedingReferenceNumber',
                                  '',
                                );
                              }}
                              items={withDisabled(PROCEEDING_TYPES)}
                            />
                          )}
                          {isValidType && labelIdx > 0 && (
                            <ChoiceGroup
                              id="proceedingTypePart1"
                              className={styles['choice-item-gap']}
                              label={t('forms.sp_form.proceedingType')}
                              name="proceedingType"
                              inputType="radio"
                              value={formik.values.proceedingType}
                              onChange={(val) => {
                                formik.setFieldValue(
                                  'proceedingType',
                                  val as string,
                                );
                                formik.setFieldValue(
                                  'proceedingReferenceNumber',
                                  '',
                                );
                              }}
                              items={withDisabled(
                                PROCEEDING_TYPES.slice(0, labelIdx),
                              )}
                            />
                          )}
                          {isValidType && (
                            <>
                              <div className={styles['proceeding-row']}>
                                <ChoiceGroup
                                  id="proceedingTypeSelected"
                                  className={styles['choice-item-gap']}
                                  label={
                                    labelIdx === 0
                                      ? t('forms.sp_form.proceedingType')
                                      : ''
                                  }
                                  name="proceedingType"
                                  inputType="radio"
                                  value={formik.values.proceedingType}
                                  onChange={(val) => {
                                    formik.setFieldValue(
                                      'proceedingType',
                                      val as string,
                                    );
                                    formik.setFieldValue(
                                      'proceedingReferenceNumber',
                                      '',
                                    );
                                  }}
                                  items={withDisabled([
                                    PROCEEDING_TYPES[labelIdx],
                                  ])}
                                />
                                <div className={styles['proceeding-width']}>
                                  <TextField
                                    id="proceedingReferenceNumber"
                                    label=""
                                    value={
                                      formik.values.proceedingReferenceNumber
                                    }
                                    placeholder={t(
                                      'forms.sp_form.proceedingReferenceNumberPlaceholder',
                                    )}
                                    onChange={(val) =>
                                      formik.setFieldValue(
                                        'proceedingReferenceNumber',
                                        val as string,
                                      )
                                    }
                                    disabled={readOnly}
                                    {...(formik.touched
                                      .proceedingReferenceNumber &&
                                    formik.errors.proceedingReferenceNumber
                                      ? {
                                          helper: {
                                            text: formik.errors
                                              .proceedingReferenceNumber,
                                            type: 'error' as const,
                                          },
                                        }
                                      : {})}
                                  />
                                </div>
                              </div>
                              {labelIdx < PROCEEDING_TYPES.length - 1 && (
                                <ChoiceGroup
                                  id="proceedingTypePart2"
                                  className={styles['choice-item-gap']}
                                  label=""
                                  name="proceedingType"
                                  inputType="radio"
                                  value={formik.values.proceedingType}
                                  onChange={(val) => {
                                    formik.setFieldValue(
                                      'proceedingType',
                                      val as string,
                                    );
                                    formik.setFieldValue(
                                      'proceedingReferenceNumber',
                                      '',
                                    );
                                  }}
                                  items={withDisabled(
                                    PROCEEDING_TYPES.slice(labelIdx + 1),
                                  )}
                                />
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
            </Card.Content>
          </Card>
        </Col>
      </Row>
      {/* Plokk: Dokumendi või õiguse kontroll */}
      {formik.values.resultType !== '' &&
        formik.values.resultType !== 'KORRAS' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id="doc-right-check">
                <AccordionItemHeader
                  title={
                    <Heading modifiers="h3" color="primary">
                      {t(
                        'forms.docRightCheck.blockTitle',
                        'Dokumendi või õiguse kontroll',
                      )}
                    </Heading>
                  }
                />
                <AccordionItemContent>
                  <div className={styles['modal-margin']}>
                    <ModalResultSection
                      checks={docRightChecks}
                      type="docCheck"
                      setFieldValue={formik.setFieldValue}
                      fieldName="documentChecks"
                      readOnly={readOnly}
                      initialDocumentChecks={formik.values.documentChecks}
                    />
                  </div>
                  <div>
                    <Text modifiers="bold">
                      {t(
                        'forms.docRightCheck.otherDocuments',
                        'Muud dokumendid',
                      )}
                    </Text>
                    <div className="mt-1">
                      <DocRightOtherSection
                        transportType={formik.values.transportType}
                        docRightOtherDocs={docRightOtherDocs}
                        otherDocuments={formik.values.otherDocuments}
                        setFieldValue={formik.setFieldValue}
                        readOnly={readOnly}
                      />
                    </div>
                  </div>
                </AccordionItemContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      {/* Plokk: Sõidu- ja puhkeaja nõuete täitmine */}
      {formik.values.resultType !== '' &&
        formik.values.resultType !== 'KORRAS' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id="drive-rest-violations">
                <AccordionItemHeader
                  title={
                    <Heading modifiers="h3" color="primary">
                      {t(
                        'forms.restCheck.blockTitle',
                        'Sõidu- ja puhkeaja nõuete täitmine',
                      )}
                    </Heading>
                  }
                />
                <AccordionItemContent>
                  <div>
                    {formik.touched.workDaysCount &&
                      formik.errors.workDaysCount && (
                        <div className="mb-1">
                          <Alert type="danger" size="small">
                            {formik.errors.workDaysCount}
                          </Alert>
                        </div>
                      )}
                    <ChoiceGroup
                      id="applicability"
                      label=""
                      name="applicability"
                      inputType="radio"
                      direction="row"
                      value={formik.values.spApplicability}
                      onChange={(val) =>
                        formik.setFieldValue('spApplicability', val as string)
                      }
                      className="mb-1"
                      items={withDisabled([
                        {
                          id: 'applicability_applied',
                          value: 'RAKENDATAKSE',
                          label: t(
                            'forms.sp_form.applicabilityApplied',
                            'Rakendatakse',
                          ),
                        },
                        {
                          id: 'applicability_not_applied',
                          value: 'EI_RAKENDATA',
                          label: t(
                            'forms.sp_form.applicabilityNotApplied',
                            'Ei rakendata',
                          ),
                        },
                        {
                          id: 'applicability_not_checked',
                          value: 'EI_KONTROLLITUD',
                          label: t(
                            'forms.sp_form.applicabilityNotChecked',
                            'Ei kontrollitud',
                          ),
                        },
                      ])}
                    />
                    {formik.values.spApplicability === 'RAKENDATAKSE' && (
                      <ChoiceGroup
                        id="tachographTypeCode"
                        label={
                          <strong>
                            {t('forms.sp_form.tachograph_type_code')}{' '}
                            <span className={styles['required-star']}>*</span>
                          </strong>
                        }
                        name="tachographTypeCode"
                        inputType="radio"
                        direction="row"
                        value={formik.values.tachographTypeCode}
                        onChange={(val) =>
                          handleTachographTypeChange(val as string)
                        }
                        className="mb-1"
                        required
                        items={withDisabled(
                          tachographTypes.map((v) => ({
                            id: `tachograph_${v.code}`,
                            value: v.code,
                            label: v.name,
                          })),
                        )}
                      />
                    )}
                  </div>
                  <div className={styles['days-row']}>
                    <Text>{t('forms.drive_rest.checkedDaysCount')}</Text>
                    <TextField
                      className={styles['days-number']}
                      id="checkedDaysCount"
                      label=""
                      value={formik.values.checkedDaysCount?.toString() || ''}
                      placeholder={t('Nr')}
                      onChange={(v) => {
                        const numericValue = v.replace(/\D/g, '');
                        const parsedValue = parseInt(numericValue, 10) || 0;
                        formik.setFieldValue(
                          'checkedDaysCount',
                          String(parsedValue),
                        );
                      }}
                      input={{ maxLength: 3 }}
                      disabled={readOnly}
                    />
                    <Text>{t('forms.drive_rest.workDaysCount')}</Text>
                    <TextField
                      className={styles['days-number']}
                      id="workDaysCount"
                      label=""
                      value={formik.values.workDaysCount?.toString() || ''}
                      placeholder={t('Nr')}
                      onChange={(v) => {
                        const numericValue = v.replace(/\D/g, '');
                        const parsedValue = parseInt(numericValue, 10) || 0;
                        formik.setFieldValue(
                          'workDaysCount',
                          String(parsedValue),
                        );
                      }}
                      input={{ maxLength: 3 }}
                      disabled={readOnly}
                    />
                    <Text>{t('forms.drive_rest.otherActivityDaysCount')}</Text>
                    <TextField
                      className={styles['days-number']}
                      id="otherActivityDaysCount"
                      label=""
                      value={
                        formik.values.otherActivityDaysCount?.toString() || ''
                      }
                      placeholder={t('Nr')}
                      onChange={(v) => {
                        const numericValue = v.replace(/\D/g, '');
                        const parsedValue = parseInt(numericValue, 10) || 0;
                        formik.setFieldValue(
                          'otherActivityDaysCount',
                          String(parsedValue),
                        );
                      }}
                      input={{ maxLength: 3 }}
                      disabled={readOnly}
                    />
                  </div>

                  <div className={styles['overflow-visible']}>
                    <ModalResultSection
                      checks={drivingViolations}
                      type="drivingViolation"
                      setFieldValue={formik.setFieldValue}
                      readOnly={readOnly}
                      initialViolations={{
                        violations5612006:
                          formik.values.violations5612006 ?? [],
                        violations1652014:
                          formik.values.violations1652014 ?? [],
                        violations200215: formik.values.violations200215 ?? [],
                        violations5932008:
                          formik.values.violations5932008 ?? [],
                        violations20201057:
                          formik.values.violations20201057 ?? [],
                      }}
                    />
                  </div>
                </AccordionItemContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      {/* Plokk: Andmed sõiduki massi ja mõõtmete ning ATP kokkuleppe nõuetele vastavuse kohta ainult autojuhile */}
      {formik.values.resultType !== '' &&
        formik.values.resultType !== 'KORRAS' &&
        type === 'driver' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id="mass-dimension-violations">
                <AccordionItemHeader
                  title={
                    <Heading modifiers="h3" color="primary">
                      {t(
                        'forms.massDimension.blockTitle',
                        'Andmed sõiduki massi ja mõõtmete ning ATP kokkuleppe nõuetele vastavuse kohta',
                      )}
                    </Heading>
                  }
                />
                <AccordionItemContent>
                  <div className={styles['overflow-visible']}>
                    <ModalResultSection
                      checks={massDimensions}
                      type="massDimension"
                      setFieldValue={formik.setFieldValue}
                      fieldName="massDimensionMeasurements"
                      readOnly={readOnly}
                      initialEntries={
                        formik.values
                          .massDimensionMeasurements as unknown as CheckEntry[]
                      }
                    />
                  </div>
                </AccordionItemContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      {/* Plokk: ATP kokkuleppe nõuete kontroll */}
      <Row className="m-0">
        <Col className="p-0">
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.drive_rest.atpTitle')}
              </Heading>
              <div>
                <ChoiceGroup
                  id="atpViolationFound"
                  label={
                    <strong>{t('forms.sp_form.atpViolationFound')}</strong>
                  }
                  name="roadTaxStatus"
                  inputType="radio"
                  direction="row"
                  value={formik.values.atpViolationFound}
                  className="mb-1"
                  onChange={(val) => {
                    formik.setFieldValue('atpViolationFound', val as string);
                    if (val !== 'true') {
                      formik.setFieldValue('atpViolationDescription', '');
                    }
                  }}
                  items={withDisabled([
                    {
                      id: 'atp_violation_yes',
                      value: 'true',
                      label: t('common.yes'),
                    },
                    {
                      id: 'atp_violation_no',
                      value: 'false',
                      label: t('common.no'),
                    },
                  ])}
                />
                <div></div>
                {formik.values.atpViolationFound === 'true' && (
                  <div className={styles[isDesktop ? 'width-80' : 'width-100']}>
                    <TextArea
                      id="atpViolationDescription"
                      maxHeight="8rem"
                      label={
                        <strong>
                          {t('forms.sp_form.atpViolationDescription')}{' '}
                          <span className={styles['required-star']}>*</span>
                        </strong>
                      }
                      value={formik.values.atpViolationDescription}
                      input={{ maxLength: 4000 }}
                      placeholder={t('forms.sp_form.atpDescriptionPlaceholder')}
                      onChange={(v) =>
                        formik.setFieldValue(
                          'atpViolationDescription',
                          v as string,
                        )
                      }
                      disabled={readOnly}
                      {...(formik.touched.atpViolationDescription &&
                      formik.errors.atpViolationDescription
                        ? {
                            helper: {
                              text: formik.errors.atpViolationDescription,
                              type: 'error' as const,
                            },
                          }
                        : {})}
                    />
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </Col>
      </Row>
      {/* Plokk: Failid */}
      <Row className="m-0">
        <Col className="p-0">
          <FormFiles
            formType="foreign-violation-form"
            formNumber={formik.values.subFormNumber}
            canEdit={!readOnly}
          />
        </Col>
      </Row>
      {/* Plokk: Märkused */}
      {formik.values.resultType !== '' &&
        formik.values.resultType !== 'KORRAS' && (
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.sp_form.notes')}
              </Heading>
              <div className={styles[isDesktop ? 'width-80' : 'width-100']}>
                <TextArea
                  id="sanctionNotes"
                  label=""
                  value={formik.values.notes}
                  placeholder={
                    readOnly ? '' : t('common.enterNotesPlaceholder')
                  }
                  onChange={(val) =>
                    formik.setFieldValue('notes', val as string)
                  }
                  maxHeight="8rem"
                  disabled={readOnly}
                />
              </div>
            </Card.Content>
          </Card>
        )}
    </div>
  );
}
