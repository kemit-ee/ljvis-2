import { useState } from 'react';
import { useDriveRestForm } from './useDriveRestForm';
import { useTranslation } from 'react-i18next';
import styles from './DriveRestFormPage.module.css';
import {
  Heading,
  Row,
  Col,
  Card,
  ChoiceGroup,
  TextField,
} from '@tedi-design-system/react/tedi';

interface Props {
  type: string;
}

export function DriveRestFormCreatePage({ type: _type }: Props) {
  const { t } = useTranslation();
  const { cargoCabotageViolations, passengerCabotageViolations } =
    useDriveRestForm();

  const [transportType, setTransportType] = useState('');
  const [transportEmptyRun, setTransportEmptyRun] = useState<string[]>([]);
  const [transportNature, setTransportNature] = useState('');
  const [transportNatureExempt, setTransportNatureExempt] = useState<string[]>(
    [],
  );
  const [transportClasses, setTransportClasses] = useState<string[]>([]);
  const [cabotageViolations, setCabotageViolations] = useState<string[]>([]);
  const [controlResult, setControlResult] = useState('');
  const [proceedingType, setProceedingType] = useState('');
  const [proceedingReferenceNumber, setProceedingReferenceNumber] =
    useState('');

  const TRANSPORT_CLASSES = [
    {
      id: 'class_domestic',
      value: 'DOMESTIC',
      labelKey: 'forms.sp_form.classDomestic',
    },
    {
      id: 'class_eu_eea_ch',
      value: 'EU_EEA_CH',
      labelKey: 'forms.sp_form.classEuEeaCh',
    },
    {
      id: 'class_international_3rd',
      value: 'INTERNATIONAL_3RD',
      labelKey: 'forms.sp_form.classInternational3rd',
    },
    {
      id: 'class_cabotage',
      value: 'CABOTAGE',
      labelKey: 'forms.sp_form.classCabotage',
    },
    {
      id: 'class_passenger_regular',
      value: 'PASSENGER_REGULAR',
      labelKey: 'forms.sp_form.classPassengerRegular',
    },
    {
      id: 'class_passenger_occasional',
      value: 'PASSENGER_OCCASIONAL',
      labelKey: 'forms.sp_form.classPassengerOccasional',
    },
    {
      id: 'class_passenger_special',
      value: 'PASSENGER_SPECIAL',
      labelKey: 'forms.sp_form.classPassengerSpecial',
    },
    {
      id: 'class_atp_perishable',
      value: 'ATP_PERISHABLE',
      labelKey: 'forms.sp_form.classAtpPerishable',
    },
  ];

  const hasCabotage = transportClasses.includes('CABOTAGE');

  const cabotageSubItems = [
    ...(transportType === 'Veosevedu'
      ? cargoCabotageViolations.map((v) => ({
          id: v.code,
          value: v.code,
          label: v.name,
        }))
      : []),
    ...(transportType === 'Sõitjatevedu'
      ? passengerCabotageViolations.map((v) => ({
          id: v.code,
          value: v.code,
          label: v.name,
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
                    <span style={{ color: 'var(--color-danger, #c1413b)' }}>
                      *
                    </span>
                  </strong>
                }
                name="transportType"
                inputType="radio"
                direction="row"
                value={transportType}
                onChange={(val) => setTransportType(val as string)}
                required
                className="mb-1"
                items={[
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
                ]}
              />
              <ChoiceGroup
                id="transportEmptyRun"
                label=""
                name="transportEmptyRun"
                className="mb-1"
                inputType="checkbox"
                value={transportEmptyRun}
                onChange={(val) => setTransportEmptyRun(val as string[])}
                items={[
                  {
                    id: 'transport_empty_run',
                    value: 'Tühisõit',
                    label: t('forms.sp_form.transportEmptyRun'),
                  },
                ]}
              />
              <ChoiceGroup
                id="transportNature"
                label={<strong>{t('forms.sp_form.transportNature')}</strong>}
                name="transportNature"
                className="mb-1"
                inputType="radio"
                direction="row"
                value={transportNature}
                onChange={(val) => setTransportNature(val as string)}
                items={[
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
                ]}
              />
              <ChoiceGroup
                id="transportNatureExempt"
                label=""
                name="transportNatureExempt"
                inputType="checkbox"
                value={transportNatureExempt}
                onChange={(val) => setTransportNatureExempt(val as string[])}
                items={[
                  {
                    id: 'transport_nature_exempt',
                    value: 'Tegevusloa nõudest vabastatud vedu',
                    label: t('forms.sp_form.transportNatureExempt'),
                  },
                ]}
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
              <ChoiceGroup
                id="transportClassesBefore"
                className={styles['choice-item-gap']}
                label=""
                name="transportClasses"
                inputType="checkbox"
                value={transportClasses}
                onChange={(val) => {
                  const newVal = val as string[];
                  setTransportClasses((prev) => {
                    const afterItems = TRANSPORT_CLASSES.slice(4).map(
                      (c) => c.value,
                    );
                    const kept = prev.filter((v) => afterItems.includes(v));
                    return [...new Set([...newVal, ...kept])];
                  });
                  if (!newVal.includes('CABOTAGE')) {
                    setCabotageViolations([]);
                  }
                }}
                items={TRANSPORT_CLASSES.slice(0, 4).map((cls) => ({
                  id: cls.id,
                  value: cls.value,
                  label: t(cls.labelKey),
                }))}
              />
              {hasCabotage && cabotageSubItems.length > 0 && (
                <div style={{ paddingLeft: '1.5rem' }}>
                  <ChoiceGroup
                    id="cabotageViolations"
                    className={styles['choice-item-gap']}
                    label=""
                    name="cabotageViolations"
                    inputType="checkbox"
                    value={cabotageViolations}
                    onChange={(val) => setCabotageViolations(val as string[])}
                    items={cabotageSubItems}
                  />
                </div>
              )}
              <ChoiceGroup
                id="transportClassesAfter"
                className={styles['choice-item-gap']}
                label=""
                name="transportClasses"
                inputType="checkbox"
                value={transportClasses}
                onChange={(val) => {
                  const newVal = val as string[];
                  setTransportClasses((prev) => {
                    const beforeItems = TRANSPORT_CLASSES.slice(0, 4).map(
                      (c) => c.value,
                    );
                    const kept = prev.filter((v) => beforeItems.includes(v));
                    return [...new Set([...kept, ...newVal])];
                  });
                }}
                items={TRANSPORT_CLASSES.slice(4).map((cls) => ({
                  id: cls.id,
                  value: cls.value,
                  label: t(cls.labelKey),
                }))}
              />
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
                    <span style={{ color: 'var(--color-danger, #c1413b)' }}>
                      *
                    </span>
                  </strong>
                }
                name="controlResult"
                inputType="radio"
                direction="row"
                value={controlResult}
                onChange={(val) => {
                  setControlResult(val as string);
                  if (val === 'KORRAS') {
                    setProceedingType('');
                    setProceedingReferenceNumber('');
                  }
                }}
                required
                className="mb-1"
                items={[
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
                ]}
              />
              {controlResult !== 'KORRAS' &&
                controlResult !== 'HOIATUS' &&
                controlResult !== '' && (
                  <>
                    {(() => {
                      const PROCEEDING_TYPES = [
                        {
                          id: 'proceeding_none',
                          value: 'NONE',
                          label: t('forms.sp_form.proceedingTypeNone'),
                        },
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
                        (p) => p.value === proceedingType,
                      );
                      return (
                        <>
                          <ChoiceGroup
                            id="proceedingTypePart1"
                            className={styles['choice-item-gap']}
                            label={t('forms.sp_form.proceedingType')}
                            name="proceedingType"
                            inputType="radio"
                            value={proceedingType}
                            onChange={(val) => {
                              setProceedingType(val as string);
                              setProceedingReferenceNumber('');
                            }}
                            items={
                              labelIdx <= 0
                                ? PROCEEDING_TYPES
                                : PROCEEDING_TYPES.slice(0, labelIdx)
                            }
                          />
                          {proceedingType !== '' &&
                            proceedingType !== 'NONE' && (
                              <>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                  }}
                                >
                                  <ChoiceGroup
                                    id="proceedingTypeSelected"
                                    className={styles['choice-item-gap']}
                                    label=""
                                    name="proceedingType"
                                    inputType="radio"
                                    value={proceedingType}
                                    onChange={(val) => {
                                      setProceedingType(val as string);
                                      setProceedingReferenceNumber('');
                                    }}
                                    items={[PROCEEDING_TYPES[labelIdx]]}
                                  />
                                  <div style={{ width: '30%' }}>
                                    <TextField
                                      id="proceedingReferenceNumber"
                                      label=""
                                      value={proceedingReferenceNumber}
                                      placeholder={t(
                                        'forms.sp_form.proceedingReferenceNumberPlaceholder',
                                      )}
                                      onChange={(val) =>
                                        setProceedingReferenceNumber(
                                          val as string,
                                        )
                                      }
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
                                    value={proceedingType}
                                    onChange={(val) => {
                                      setProceedingType(val as string);
                                      setProceedingReferenceNumber('');
                                    }}
                                    items={PROCEEDING_TYPES.slice(labelIdx + 1)}
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
    </div>
  );
}
