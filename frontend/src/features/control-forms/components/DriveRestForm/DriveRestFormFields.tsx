import { useEffect } from 'react';
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
import { FileUploadBlock } from '../shared/FileUploadBlock';
import type { FormAuthority } from '../../pages/drive-rest-form/useDriveRestForm';

interface ChoiceItem {
  id: string;
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

// ModalResultSection scopedFields — module-level constants so their
// reference stays stable across renders (they're a useEffect dep there;
// a fresh array literal on every render would re-run that effect every time).
const MAIN_DRIVING_VIOLATION_FIELDS = [
  'violations5612006',
  'violations1652014',
  'violations200215',
];
const ROOMA1_VIOLATION_FIELDS = ['violations5932008'];
const POSTING_VIOLATION_FIELDS = ['violations20201057'];

// Veoliigi (transportType) järgi mittetäidetavad väljad.
const PASSENGER_CLASS_CODES = [
  'PASSENGER_REGULAR',
  'PASSENGER_OCCASIONAL',
  'PASSENGER_SPECIAL',
];
const CARGO_ONLY_CLASS_CODES = ['ATP_PERISHABLE'];

// Ühenduse tegevusloa dokumendi/õiguse kontrolli level-2 kirjete nähtavus
// veoliigi järgi (PASSENGER = ainult sõitjatevedu, CARGO = ainult veosevedu).
const DOC_RIGHT_TRANSPORT_VISIBILITY: Record<
  string,
  'PASSENGER' | 'CARGO' | 'BOTH'
> = {
  TEGEVUSLUBA_01: 'PASSENGER',
  TEGEVUSLUBA_02: 'CARGO',
  TEGEVUSLOA_ARAKIRI_01: 'PASSENGER',
  TEGEVUSLOA_ARAKIRI_02: 'CARGO',
  TEGEVUSLOA_ARAKIRI_03: 'BOTH',
};

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
  /**
   * Rooma I (593/2008) ja autojuhi lähetamise (2020/1057) rikkumised on
   * eraldatud omaette akordionitesse (vt drivingViolationsMain,
   * rooma1Violations, postingViolations) — nende puudumisel (nt TRAM-kaart,
   * mis "Sõidu- ja puhkeaja nõuete täitmine" plokki üldse ei näita)
   * langetakse tagasi täieliku drivingViolations loendi peale, säilitades
   * varasema (ühise valikuakna) käitumise.
   */
  drivingViolationsMain?: ClassifierValueData[];
  rooma1Violations?: ClassifierValueData[];
  postingViolations?: ClassifierValueData[];
  massDimensions: ClassifierValueData[];
  readOnly?: boolean;
  authority?: FormAuthority;
  /**
   * TRAM kontrollkaardil (issue #180, 2. faas) on kolm sektsiooni peidetud:
   * „Sõidu- ja puhkeaja nõuete täitmine", „Sõiduki mass ja mõõtmed" ja
   * „ATP kokkuleppe nõuete kontroll". Backend täidab need salvestamisel
   * vaikeväärtustega (sp_applicability='not_checked', mass/atp = false).
   */
  hideDriveRestExtras?: boolean;
  /** Failide ploki endpoint-kontekst. Vaikimisi PPA autojuhi alamvorm. */
  filesFormType?: string;
  filesFormNumber?: string;
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
  drivingViolationsMain = drivingViolations,
  rooma1Violations = [],
  postingViolations = [],
  massDimensions,
  readOnly,
  authority = 'PPA',
  hideDriveRestExtras,
  filesFormType,
  filesFormNumber,
}: Props) {
  const { t } = useTranslation();

  const fieldId = (id: string) => type === 'teammate' ? `teammate-${id}` : id;
  const withDisabled = (items: ChoiceItem[]): ChoiceItem[] =>
    items.map((item) => ({
      ...item,
      id: fieldId(item.id),
      disabled: readOnly || item.disabled,
    }));

  const transportType = formik.values.transportType;
  const isClassDisabled = (code: string) =>
    (transportType === 'Veosevedu' && PASSENGER_CLASS_CODES.includes(code)) ||
    (transportType === 'Sõitjatevedu' && CARGO_ONLY_CLASS_CODES.includes(code));
  const atpDisabledForPassenger = transportType === 'Sõitjatevedu';

  const isDocRightVisibleForTransport = (code: string) => {
    const v = DOC_RIGHT_TRANSPORT_VISIBILITY[code];
    if (!v || v === 'BOTH') return true;
    return v === 'CARGO'
      ? transportType === 'Veosevedu'
      : transportType === 'Sõitjatevedu';
  };

  // Veoliigi vahetamisel eemalda nüüd mittetäidetavad valikud.
  useEffect(() => {
    const classes = Array.isArray(formik.values.transportClasses)
      ? formik.values.transportClasses
      : [];
    const kept = classes.filter((c) => !isClassDisabled(c.classCode));
    if (kept.length !== classes.length) {
      formik.setFieldValue('transportClasses', kept);
    }
    const docs = Array.isArray(formik.values.documentChecks)
      ? formik.values.documentChecks
      : [];
    const keptDocs = docs.filter((d) =>
      isDocRightVisibleForTransport(d.documentCode),
    );
    if (keptDocs.length !== docs.length) {
      formik.setFieldValue('documentChecks', keptDocs);
    }
    if (
      transportType === 'Sõitjatevedu' &&
      (formik.values.atpViolationFound === 'true' ||
        formik.values.atpViolationDescription)
    ) {
      formik.setFieldValue('atpViolationFound', 'false');
      formik.setFieldValue('atpViolationDescription', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transportType]);

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
                id={fieldId('transportType')}
                label={
                  <strong>
                    {t('forms.sp_form.transportType')}{' '}
                    <span className={styles['required-star']}>*</span>
                  </strong>
                }
                name={fieldId('transportType')}
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
                id={fieldId('transportEmptyRun')}
                label=""
                name={fieldId('transportEmptyRun')}
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
                id={fieldId('transportNature')}
                label={<strong>{t('forms.sp_form.transportNature')}</strong>}
                name={fieldId('transportNature')}
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
                id={fieldId('transportNatureExempt')}
                label=""
                name={fieldId('transportNatureExempt')}
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
              {/* Liiniandmed kuuluvad ainult Transpordiameti kontrollkaardile. */}
              {authority === 'TRAM' && formik.values.transportType === 'Sõitjatevedu' && (
                <>
                  <TextField
                    id={fieldId('liiniNumber')}
                    label={t('forms.sp_form.liiniNumber')}
                    name={fieldId('liiniNumber')}
                    className="mt-1"
                    value={formik.values.liiniNumber ?? ''}
                    onChange={(val) =>
                      formik.setFieldValue('liiniNumber', val as string)
                    }
                    disabled={readOnly}
                  />
                  <TextField
                    id={fieldId('liiniNimetus')}
                    label={t('forms.sp_form.liiniNimetus')}
                    name={fieldId('liiniNimetus')}
                    className="mt-1"
                    value={formik.values.liiniNimetus ?? ''}
                    onChange={(val) =>
                      formik.setFieldValue('liiniNimetus', val as string)
                    }
                    disabled={readOnly}
                  />
                </>
              )}
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
                    disabled: isClassDisabled(cls.code),
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
                      id={fieldId('transportClassesBefore')}
                      className={styles['choice-item-gap']}
                      label=""
                      name={fieldId('transportClasses')}
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
                            id={fieldId('cabotageViolations')}
                            className={styles['choice-item-gap']}
                            label=""
                            name={fieldId('cabotageViolations')}
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
                        id={fieldId('transportClassesAfter')}
                        className={styles['choice-item-gap']}
                        label=""
                        name={fieldId('transportClasses')}
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
                id={fieldId('controlResult')}
                label={
                  <strong>
                    {t('forms.sp_form.controlResultLabel')}{' '}
                    <span className={styles['required-star']}>*</span>
                  </strong>
                }
                name={fieldId('resultType')}
                inputType="radio"
                direction="row"
                value={formik.values.resultType}
                onChange={(val) => {
                  if (val === 'ok') {
                    formik.setFieldValue('proceedingType', '');
                    formik.setFieldValue('proceedingReferenceNumber', '');
                    formik.setFieldValue('additionalMeasure', '');
                  }
                  formik.setFieldValue('resultType', val as string);
                }}
                required
                className="mb-1"
                items={withDisabled([
                  {
                    id: 'result_korras',
                    value: 'ok',
                    label: t('forms.sp_form.controlResultKorras'),
                  },
                  {
                    id: 'result_hoiatus',
                    value: 'warning',
                    label: t('forms.sp_form.controlResultHoiatus'),
                  },
                  {
                    id: 'result_alustati',
                    value: 'misdemeanor_proceedings',
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
              {(formik.values.resultType === 'warning' ||
                formik.values.resultType === 'misdemeanor_proceedings') && (
                <ChoiceGroup
                  id={fieldId('additionalMeasure')}
                  label={<strong>{t('forms.sp_form.additionalMeasure')}</strong>}
                  name={fieldId('additionalMeasure')}
                  inputType="radio"
                  direction="row"
                  className="mb-1"
                  value={formik.values.additionalMeasure ?? ''}
                  onChange={(val) =>
                    formik.setFieldValue('additionalMeasure', val as string)
                  }
                  items={withDisabled([
                    {
                      id: 'measure_none',
                      value: '',
                      label: t('forms.sp_form.additionalMeasureNone'),
                    },
                    {
                      id: 'measure_ettekirjutus',
                      value: 'precept',
                      label: t('forms.sp_form.controlResultEttekirjutus'),
                    },
                    {
                      id: 'measure_juhtimiselt',
                      value: 'driving_ban',
                      label: t('forms.sp_form.controlResultJuhtimiselt'),
                    },
                    {
                      id: 'measure_arest',
                      value: 'arrest',
                      label: t('forms.sp_form.controlResultArest'),
                    },
                    {
                      id: 'measure_autovedu',
                      value: 'transport_interruption',
                      label: t('forms.sp_form.controlResultAutovedu'),
                    },
                  ])}
                />
              )}
              {formik.values.resultType !== 'ok' &&
                formik.values.resultType !== 'warning' &&
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
                              id={fieldId('proceedingTypePart0')}
                              className={styles['choice-item-gap']}
                              label={t('forms.sp_form.proceedingType')}
                              name={fieldId('proceedingType')}
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
                              id={fieldId('proceedingTypePart1')}
                              className={styles['choice-item-gap']}
                              label={t('forms.sp_form.proceedingType')}
                              name={fieldId('proceedingType')}
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
                                  id={fieldId('proceedingTypeSelected')}
                                  className={styles['choice-item-gap']}
                                  label={
                                    labelIdx === 0
                                      ? t('forms.sp_form.proceedingType')
                                      : ''
                                  }
                                  name={fieldId('proceedingType')}
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
                                    id={fieldId('proceedingReferenceNumber')}
                                    label=""
                                    value={
                                      formik.values.proceedingReferenceNumber
                                    }
                                    placeholder={t(
                                      formik.values.proceedingType === 'YLD'
                                        ? 'forms.sp_form.proceedingCaseNumberPlaceholder'
                                        : 'forms.sp_form.proceedingReferenceNumberPlaceholder',
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
                                  id={fieldId('proceedingTypePart2')}
                                  className={styles['choice-item-gap']}
                                  label=""
                                  name={fieldId('proceedingType')}
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
        formik.values.resultType !== 'ok' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id={fieldId('doc-right-check')}>
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
                      key={formik.values.transportType}
                      checks={docRightChecks}
                      type="docCheck"
                      transportType={formik.values.transportType}
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
                        idPrefix={type === 'teammate' ? 'teammate-' : ''}
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
      {/* Plokk: Sõidu- ja puhkeaja nõuete täitmine.
          Nähtav ka "Korras" tulemuse korral (P2) — politsei fikseerib
          rakendamise, sõidumeeriku liigi ja päevade arvud ka korras kontrollil. */}
      {!hideDriveRestExtras && formik.values.resultType !== '' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id={fieldId('drive-rest-violations')}>
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
                      id={fieldId('applicability')}
                      label=""
                      name={fieldId('applicability')}
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
                        id={fieldId('tachographTypeCode')}
                        label={
                          <strong>
                            {t('forms.sp_form.tachograph_type_code')}{' '}
                            <span className={styles['required-star']}>*</span>
                          </strong>
                        }
                        name={fieldId('tachographTypeCode')}
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
                      id={fieldId('checkedDaysCount')}
                      label=""
                      value={formik.values.checkedDaysCount?.toString() || ''}
                      placeholder={t('common.numberPlaceholder', 'Nr')}
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
                      id={fieldId('workDaysCount')}
                      label=""
                      value={formik.values.workDaysCount?.toString() || ''}
                      placeholder={t('common.numberPlaceholder', 'Nr')}
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
                      id={fieldId('otherActivityDaysCount')}
                      label=""
                      value={
                        formik.values.otherActivityDaysCount?.toString() || ''
                      }
                      placeholder={t('common.numberPlaceholder', 'Nr')}
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
                      checks={drivingViolationsMain}
                      type="drivingViolation"
                      setFieldValue={formik.setFieldValue}
                      readOnly={readOnly}
                      scopedFields={MAIN_DRIVING_VIOLATION_FIELDS}
                      initialViolations={{
                        violations5612006:
                          formik.values.violations5612006 ?? [],
                        violations1652014:
                          formik.values.violations1652014 ?? [],
                        violations200215: formik.values.violations200215 ?? [],
                      }}
                    />
                  </div>
                </AccordionItemContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      {/* Plokk: Rooma I (määrus 593/2008) lepingu rikkumised — omaette akordion,
          eraldatud ühisest rikkumiste valikuaknast (vt scopedFields'i kommentaar
          ModalResultSection'is). */}
      {!hideDriveRestExtras &&
        formik.values.resultType !== '' &&
        rooma1Violations.length > 0 && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id={fieldId('rooma1-violations')}>
                <AccordionItemHeader
                  title={
                    <Heading modifiers="h3" color="primary">
                      {t(
                        'forms.rooma1.blockTitle',
                        'Rooma I lepingu rikkumised',
                      )}
                    </Heading>
                  }
                />
                <AccordionItemContent>
                  <div className={styles['overflow-visible']}>
                    <ModalResultSection
                      checks={rooma1Violations}
                      type="drivingViolation"
                      setFieldValue={formik.setFieldValue}
                      readOnly={readOnly}
                      scopedFields={ROOMA1_VIOLATION_FIELDS}
                      initialViolations={{
                        violations5932008:
                          formik.values.violations5932008 ?? [],
                      }}
                    />
                  </div>
                </AccordionItemContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      {/* Plokk: autojuhi lähetamise nõuete rikkumised (direktiiv 2020/1057) —
          omaette akordion, eraldatud ühisest rikkumiste valikuaknast. */}
      {!hideDriveRestExtras &&
        formik.values.resultType !== '' &&
        postingViolations.length > 0 && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id={fieldId('posting-violations')}>
                <AccordionItemHeader
                  title={
                    <Heading modifiers="h3" color="primary">
                      {t(
                        'forms.posting.blockTitle',
                        'Autojuhi lähetamise nõuete rikkumised',
                      )}
                    </Heading>
                  }
                />
                <AccordionItemContent>
                  <div className={styles['overflow-visible']}>
                    <ModalResultSection
                      checks={postingViolations}
                      type="drivingViolation"
                      setFieldValue={formik.setFieldValue}
                      readOnly={readOnly}
                      scopedFields={POSTING_VIOLATION_FIELDS}
                      initialViolations={{
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
      {!hideDriveRestExtras &&
        formik.values.resultType !== '' &&
        formik.values.resultType !== 'ok' &&
        type === 'driver' && (
          <div className={`${styles['overflow-visible']} mb-1`}>
            <Accordion>
              <AccordionItem id={fieldId('mass-dimension-violations')}>
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
      {!hideDriveRestExtras && (
      <Row className="m-0">
        <Col className="p-0">
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.drive_rest.atpTitle')}
              </Heading>
              <div>
                <ChoiceGroup
                  id={fieldId('atpViolationFound')}
                  label={
                    <strong>{t('forms.sp_form.atpViolationFound')}</strong>
                  }
                  name={fieldId('roadTaxStatus')}
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
                      disabled: atpDisabledForPassenger,
                    },
                    {
                      id: 'atp_violation_no',
                      value: 'false',
                      label: t('common.no'),
                      disabled: atpDisabledForPassenger,
                    },
                  ])}
                />
                <div></div>
                {formik.values.atpViolationFound === 'true' && (
                  <div className={styles[isDesktop ? 'width-80' : 'width-100']}>
                    <TextArea
                      id={fieldId('atpViolationDescription')}
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
                      disabled={readOnly || atpDisabledForPassenger}
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
      )}
      {/* Plokk: Andmevahetuskihi (X-tee) päringuga sisestatavad andmed.
          Täidetakse automaatselt e-toimiku päringuga (cron), kuvatakse loetavalt. */}
      {(formik.values.enforcementDecision ||
        formik.values.proceedingClosureBasis ||
        formik.values.resultType === 'misdemeanor_proceedings') && (
        <Row className="m-0">
          <Col className="p-0">
            <Card className="mb-1">
              <Card.Content>
                <Heading element="h3" className="mb-1">
                  {t('forms.sp_form.xteeDataTitle')}
                </Heading>
                <div className="mb-1">
                  <TextArea
                    id={fieldId('enforcementDecision')}
                    label={<strong>{t('forms.sp_form.enforcedDecision')}</strong>}
                    value={formik.values.enforcementDecision ?? ''}
                    maxHeight="8rem"
                    onChange={() => {}}
                    disabled
                  />
                </div>
                <div>
                  <TextArea
                    id={fieldId('proceedingClosureBasis')}
                    label={
                      <strong>
                        {t('forms.sp_form.proceedingTerminationBasis')}
                      </strong>
                    }
                    value={formik.values.proceedingClosureBasis ?? ''}
                    maxHeight="8rem"
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </Card.Content>
            </Card>
          </Col>
        </Row>
      )}
      {/* Plokk: Failid */}
      <Row className="m-0">
        <Col className="p-0">
          <FileUploadBlock
            formPath={filesFormType ?? `drive-rest-form/${type}`}
            formNumber={filesFormNumber ?? formik.values.subFormNumber}
            disabled={readOnly}
            label={t('form.files.title')}
          />
        </Col>
      </Row>
      {/* Plokk: Märkused */}
      {formik.values.resultType !== '' &&
        formik.values.resultType !== 'ok' && (
          <Card className="mb-1">
            <Card.Content>
              <Heading element="h3" className="mb-1">
                {t('forms.sp_form.notes')}
              </Heading>
              <div className={styles[isDesktop ? 'width-80' : 'width-100']}>
                <TextArea
                  id={fieldId('sanctionNotes')}
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
