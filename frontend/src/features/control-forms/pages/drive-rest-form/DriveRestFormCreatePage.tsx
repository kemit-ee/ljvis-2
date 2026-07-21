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
  Text,
  Separator,
  Accordion,
  AccordionItem,
  AccordionItemContent,
  AccordionItemHeader
} from '@tedi-design-system/react/tedi';
import { DocRightCheckSection } from '../../components/DriveRestForm/DocRightCheckSection';
import { DocRightOtherSection } from '../../components/DriveRestForm/DocRightOtherSection';

interface Props {
  type: string;
}

export function DriveRestFormCreatePage({ type: _type }: Props) {
  const { t } = useTranslation();
  const {
    cargoCabotageViolations,
    passengerCabotageViolations,
    transportClasses: transportClassItems,
    docRightChecks,
    docRightOtherDocs,
  } = useDriveRestForm();

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

  const hasCabotage = transportClasses.includes('CABOTAGE');

  const cabotageSubItems = [
    ...(transportType === 'Veosevedu'
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
    ...(transportType === 'Sõitjatevedu'
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
                  setTransportClasses(val);
                  if (!val.includes('CABOTAGE')) setCabotageViolations([]);
                };
                return (
                  <>
                    <ChoiceGroup
                      id="transportClassesBefore"
                      className={styles['choice-item-gap']}
                      label=""
                      name="transportClasses"
                      inputType="checkbox"
                      value={transportClasses}
                      onChange={(val) => handleChange(val as string[])}
                      items={toItems(beforeCabotage)}
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
                          onChange={(val) =>
                            setCabotageViolations(val as string[])
                          }
                          items={cabotageSubItems}
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
                        value={transportClasses}
                        onChange={(val) => handleChange(val as string[])}
                        items={toItems(afterCabotage)}
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
      {/* Plokk: Dokumendi või õiguse kontroll */}
      {controlResult !== '' && controlResult !== 'KORRAS' && (
        <div style={{ overflow: 'visible' }}>
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
                <div style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
                  <DocRightCheckSection docRightChecks={docRightChecks} />
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
                      transportType={transportType}
                      docRightOtherDocs={docRightOtherDocs}
                    />
                  </div>
                </div>
              </AccordionItemContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
