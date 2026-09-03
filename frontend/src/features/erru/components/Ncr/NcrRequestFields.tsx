import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, ChoiceGroup, DateField, Heading, Select, Text, TextField } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { useOrganisations } from '../../../organisations/hooks';
import { toIsoDate } from '../../../../hooks/dateUtils';
import {
  classifierOptions,
  dateFieldError,
  fieldError,
  nestedDateFieldError,
  nestedFieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from '../../utils/fieldHelpers';
import type { useNcrRequestForm } from '../../pages/ncr/useNcrRequestForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';

type NcrRequestFormApi = ReturnType<typeof useNcrRequestForm>;

/**
 * Editable fields of an outgoing NCR request draft (LJVIS2-63 §4): "Teate päis ja
 * osapooled", "Kontrolli kokkuvõte" and "Rasked rikkumised ja karistused" (shown only
 * when "Edukalt läbitud kontroll" = Ei). Karistuste andmed (nested penaltiesImposed /
 * penaltiesRequested per infringement) are plain repeatable rows, not a modal — this
 * mirrors the RSI defect pattern in spirit but keeps the nested structure editable inline
 * given NCR's two independent penalty sub-lists per infringement.
 */
export function NcrRequestFields({ form }: { form: NcrRequestFormApi }) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();
  const { organisations } = useOrganisations();
  const {
    formik,
    setCheckPassed,
    addSeriousInfringement,
    removeSeriousInfringement,
    updateSeriousInfringement,
    addPenaltyImposed,
    removePenaltyImposed,
    addPenaltyRequested,
    removePenaltyRequested,
  } = form;

  const countries = useMemo(
    () => getByCode('COUNTRY').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestSources = useMemo(
    () => getByCode('NCR_REQUEST_SOURCE').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const requestPurposes = useMemo(
    () => getByCode('NCR_REQUEST_PURPOSE').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const infringementCategories = useMemo(
    () => getByCode('NCR_INFRINGEMENT_CATEGORY').filter((c) => c.isValid !== false),
    [getByCode],
  );
  // EU_INFRINGEMENT codes have the category as their prefix (MSI101, VSI847, SI926 …).
  // Filtering by startsWith(si.category) gives the correct subset without any backend change.
  const euInfringements = useMemo(
    () => getByCode('EU_INFRINGEMENT').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const penaltyTypeImposedReq = useMemo(
    () => getByCode('NCR_PENALTY_TYPE_IMPOSED_REQ').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const penaltyTypeRequested = useMemo(
    () => getByCode('NCR_PENALTY_TYPE_REQUESTED').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const isExecutedOptions = useMemo(
    () => getByCode('NCR_IS_EXECUTED').filter((c) => c.isValid !== false),
    [getByCode],
  );
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const dateValue = parseIsoDate;
  const err = (field: string) => fieldError(formik, field);
  const dateErr = (field: string) => dateFieldError(formik, field);
  const nestedErr = (index: number, field: string) =>
    nestedFieldError(formik, 'seriousInfringements', index, field);
  const nestedDateErr = (index: number, field: string) =>
    nestedDateFieldError(formik, 'seriousInfringements', index, field);
  const gridClass = isDesktop ? 'form-grid-desktop' : 'form-grid-mobile';

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.ncr.form.headerBlock')}
          </Heading>
          <div className={gridClass}>
            <TextField
              id="ncr-from"
              label={t('erru.ncr.form.ncrFrom')}
              value={selected(countries, 'EE')?.label ?? 'Eesti'}
              disabled
              onChange={() => undefined}
            />
            <Select
              id="ncr-originating-authority"
              label={t('erru.ncr.form.originatingAuthority')}
              required
              options={opts(organisations)}
              value={selected(
                organisations,
                formik.values.originatingAuthority,
              )}
              onChange={(o) =>
                formik.setFieldValue('originatingAuthority', pick(o))
              }
              {...err('originatingAuthority')}
            />
            <Select
              id="ncr-to"
              label={t('erru.ncr.form.ncrTo')}
              required
              options={opts(countries)}
              value={selected(countries, formik.values.ncrTo)}
              onChange={(o) => formik.setFieldValue('ncrTo', pick(o))}
              {...err('ncrTo')}
            />
            <Select
              id="ncr-request-source"
              label={t('erru.ncr.form.requestSource')}
              required
              options={opts(requestSources)}
              value={selected(requestSources, formik.values.requestSource)}
              onChange={(o) => formik.setFieldValue('requestSource', pick(o))}
              {...err('requestSource')}
            />
            <Select
              id="ncr-request-purpose"
              label={t('erru.ncr.form.requestPurpose')}
              required
              options={opts(requestPurposes)}
              value={selected(requestPurposes, formik.values.requestPurpose)}
              onChange={(o) => formik.setFieldValue('requestPurpose', pick(o))}
              {...err('requestPurpose')}
            />
            <TextField
              id="ncr-transport-undertaking-name"
              label={t('erru.ncr.form.transportUndertakingName')}
              required
              value={formik.values.transportUndertakingName}
              onChange={(v) =>
                formik.setFieldValue('transportUndertakingName', v)
              }
              {...err('transportUndertakingName')}
            />
            <TextField
              id="ncr-community-licence-number"
              label={t('erru.ncr.form.communityLicenceNumber')}
              required
              value={formik.values.communityLicenceNumber}
              onChange={(v) =>
                formik.setFieldValue('communityLicenceNumber', v)
              }
              {...err('communityLicenceNumber')}
            />
            <TextField
              id="ncr-vehicle-registration-number"
              label={t('erru.ncr.form.vehicleRegistrationNumber')}
              required
              value={formik.values.vehicleRegistrationNumber}
              onChange={(v) =>
                formik.setFieldValue('vehicleRegistrationNumber', v)
              }
              {...err('vehicleRegistrationNumber')}
            />
            <Select
              id="ncr-vehicle-registration-country"
              label={t('erru.ncr.form.vehicleRegistrationCountry')}
              required
              options={opts(countries)}
              value={selected(
                countries,
                formik.values.vehicleRegistrationCountry,
              )}
              onChange={(o) =>
                formik.setFieldValue('vehicleRegistrationCountry', pick(o))
              }
              {...err('vehicleRegistrationCountry')}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.ncr.form.checkSummaryBlock')}
          </Heading>
          <ChoiceGroup
            id="ncr-check-passed"
            name="ncr-check-passed"
            label={t('erru.ncr.form.checkPassed')}
            className="mb-1"
            required
            inputType="radio"
            direction="row"
            value={formik.values.checkPassed ? 'true' : 'false'}
            onChange={(v) => setCheckPassed(v === 'true')}
            items={[
              {
                id: 'ncr-check-passed-yes',
                value: 'true',
                label: t('common.yes'),
              },
              {
                id: 'ncr-check-passed-no',
                value: 'false',
                label: t('common.no'),
              },
            ]}
          />
          <div className={gridClass}>
            <DateField
              id="ncr-check-date"
              label={t('erru.ncr.form.checkDate')}
              className={!formik.values.checkPassed ? `mb-1` : undefined}
              required
              selected={dateValue(formik.values.checkDate)}
              onSelect={(v) =>
                formik.setFieldValue(
                  'checkDate',
                  toIsoDate(v as Date | undefined),
                )
              }
              monthYearSelectType="grid"
              {...dateErr('checkDate')}
            />
          </div>

          {!formik.values.checkPassed && (
            <>
              <div className={gridClass}>
                <DateField
                  id="ncr-minor-infringement-date"
                  label={t('erru.ncr.form.minorInfringementDate')}
                  selected={dateValue(formik.values.minorInfringementDate)}
                  onSelect={(v) =>
                    formik.setFieldValue(
                      'minorInfringementDate',
                      toIsoDate(v as Date | undefined),
                    )
                  }
                  monthYearSelectType="grid"
                />
                <TextField
                  id="ncr-minor-infringement-count"
                  label={t('erru.ncr.form.minorInfringementCount')}
                  value={formik.values.minorInfringementCount}
                  onChange={(v) =>
                    formik.setFieldValue(
                      'minorInfringementCount',
                      v.replace(/\D/g, ''),
                    )
                  }
                />
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {!formik.values.checkPassed && (
        <Card className="mt-05">
          <Card.Content>
            <div className="card-main">
              <Heading element="h2">
                {t('erru.ncr.form.seriousInfringementsBlock')}
              </Heading>
              <Button
                visualType="secondary"
                onClick={addSeriousInfringement}
                type="button"
              >
                {t('common.add')}
              </Button>
            </div>

            {formik.values.seriousInfringements.map((si, index) => (
              <Card key={index} className="mt-05">
                <Card.Content>
                  <div className="card-main">
                    <Heading element="h3">
                      {t('erru.ncr.form.infringementNumber', {
                        number: index + 1,
                      })}
                    </Heading>
                    <Button
                      visualType="secondary"
                      onClick={() => removeSeriousInfringement(index)}
                      type="button"
                    >
                      {t('common.remove')}
                    </Button>
                  </div>
                  <div className={gridClass}>
                    <Select
                      id={`ncr-si-${index}-category`}
                      label={t('erru.ncr.form.infringementCategory')}
                      required
                      options={opts(infringementCategories)}
                      value={selected(infringementCategories, si.category)}
                      onChange={(o) =>
                        // Clear infringementType whenever category changes so a stale code from the
                        // old category (e.g. "302" under MSI) cannot survive a switch to VSI/SI.
                        updateSeriousInfringement(index, {
                          category: pick(o) as typeof si.category,
                          infringementType: '',
                        })
                      }
                      {...nestedErr(index, 'category')}
                    />
                    <Select
                      id={`ncr-si-${index}-type`}
                      label={t('erru.ncr.form.infringementType')}
                      required
                      options={opts(
                        euInfringements.filter((c) =>
                          c.code.startsWith(si.category),
                        ),
                      )}
                      value={selected(euInfringements, si.infringementType)}
                      onChange={(o) =>
                        updateSeriousInfringement(index, {
                          infringementType: pick(o),
                        })
                      }
                      {...nestedErr(index, 'infringementType')}
                    />
                    <DateField
                      id={`ncr-si-${index}-date`}
                      label={t('erru.ncr.form.infringementDate')}
                      required
                      selected={dateValue(si.dateOfInfringement)}
                      onSelect={(v) =>
                        updateSeriousInfringement(index, {
                          dateOfInfringement: toIsoDate(v as Date | undefined),
                        })
                      }
                      monthYearSelectType="grid"
                      {...nestedDateErr(index, 'dateOfInfringement')}
                    />
                    <DateField
                      id={`ncr-si-${index}-detection-date`}
                      label={t('erru.ncr.form.detectionCheckDate')}
                      required
                      selected={dateValue(si.detectionCheckDate)}
                      onSelect={(v) =>
                        updateSeriousInfringement(index, {
                          detectionCheckDate: toIsoDate(v as Date | undefined),
                        })
                      }
                      monthYearSelectType="grid"
                      {...nestedDateErr(index, 'detectionCheckDate')}
                    />
                    <ChoiceGroup
                      id={`ncr-si-${index}-appeal`}
                      name={`ncr-si-${index}-appeal`}
                      label={t('erru.ncr.form.appealPossible')}
                      inputType="radio"
                      direction="row"
                      value={si.appealPossible ? 'true' : 'false'}
                      onChange={(v) =>
                        updateSeriousInfringement(index, {
                          appealPossible: v === 'true',
                        })
                      }
                      items={[
                        {
                          id: `ncr-si-${index}-appeal-yes`,
                          value: 'true',
                          label: t('common.yes'),
                        },
                        {
                          id: `ncr-si-${index}-appeal-no`,
                          value: 'false',
                          label: t('common.no'),
                        },
                      ]}
                    />
                  </div>
                  <div className="card-main mt-05">
                    <Heading element="h4">
                      {t('erru.ncr.form.penaltiesImposedBlock')}
                    </Heading>
                    <Button
                      visualType="secondary"
                      onClick={() => addPenaltyImposed(index)}
                      type="button"
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                  {si.penaltiesImposed.map((p, pIndex) => (
                    <div key={pIndex} className={`${gridClass} detail-row`}>
                      <TextField
                        id={`ncr-si-${index}-pi-${pIndex}-id`}
                        label={t('erru.ncr.form.penaltyImposedIdentifier')}
                        value={p.penaltyImposedIdentifier}
                        onChange={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? { ...it, penaltyImposedIdentifier: v }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pi-${pIndex}-type`}
                        label={t('erru.ncr.form.penaltyTypeImposed')}
                        options={opts(penaltyTypeImposedReq)}
                        value={selected(
                          penaltyTypeImposedReq,
                          p.penaltyTypeImposed,
                        )}
                        onChange={(o) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? { ...it, penaltyTypeImposed: pick(o) }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pi-${pIndex}-executed`}
                        label={t('erru.ncr.form.isExecuted')}
                        options={opts(isExecutedOptions)}
                        value={selected(isExecutedOptions, p.isExecuted)}
                        onChange={(o) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? {
                                  ...it,
                                  isExecuted: pick(o) as typeof it.isExecuted,
                                }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                      />
                      {p.isExecuted === 'No' && (
                        <TextField
                          id={`ncr-si-${index}-pi-${pIndex}-not-executed-reason`}
                          label={t('erru.ncr.form.notExecutedReason')}
                          value={p.notExecutedReason ?? ''}
                          onChange={(v) => {
                            const items = si.penaltiesImposed.map((it, j) =>
                              j === pIndex
                                ? { ...it, notExecutedReason: v }
                                : it,
                            );
                            updateSeriousInfringement(index, {
                              penaltiesImposed: items,
                            });
                          }}
                        />
                      )}
                      <DateField
                        id={`ncr-si-${index}-pi-${pIndex}-decision-date`}
                        label={t('erru.ncr.form.finalDecisionDate')}
                        selected={dateValue(p.finalDecisionDate)}
                        onSelect={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? {
                                  ...it,
                                  finalDecisionDate: toIsoDate(
                                    v as Date | undefined,
                                  ),
                                }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                        monthYearSelectType="grid"
                      />
                      <DateField
                        id={`ncr-si-${index}-pi-${pIndex}-start-date`}
                        label={t('erru.ncr.form.penaltyStartDate')}
                        selected={dateValue(p.startDate ?? '')}
                        onSelect={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? {
                                  ...it,
                                  startDate:
                                    toIsoDate(v as Date | undefined) || null,
                                }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                        monthYearSelectType="grid"
                      />
                      <DateField
                        id={`ncr-si-${index}-pi-${pIndex}-end-date`}
                        label={t('erru.ncr.form.penaltyEndDate')}
                        selected={dateValue(p.endDate ?? '')}
                        onSelect={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex
                              ? {
                                  ...it,
                                  endDate:
                                    toIsoDate(v as Date | undefined) || null,
                                }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesImposed: items,
                          });
                        }}
                        monthYearSelectType="grid"
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'flex-end',
                        }}
                        className="full-span"
                      >
                        <Button
                          visualType="secondary"
                          className="mt-05"
                          onClick={() => removePenaltyImposed(index, pIndex)}
                          type="button"
                        >
                          {t('common.remove')}
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="card-main mt-05">
                    <Heading element="h4">
                      {t('erru.ncr.form.penaltiesRequestedBlock')}
                    </Heading>
                    <Button
                      visualType="secondary"
                      onClick={() => addPenaltyRequested(index)}
                      type="button"
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                  {si.penaltiesRequested.map((p, pIndex) => (
                    <div key={pIndex} className={`${gridClass} detail-row`}>
                      <TextField
                        id={`ncr-si-${index}-pr-${pIndex}-id`}
                        label={t('erru.ncr.form.penaltyRequestedIdentifier')}
                        value={p.penaltyRequestedIdentifier}
                        onChange={(v) => {
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex
                              ? { ...it, penaltyRequestedIdentifier: v }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesRequested: items,
                          });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pr-${pIndex}-type`}
                        label={t('erru.ncr.form.penaltyTypeRequested')}
                        options={opts(penaltyTypeRequested)}
                        value={selected(
                          penaltyTypeRequested,
                          p.penaltyTypeRequested,
                        )}
                        onChange={(o) => {
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex
                              ? { ...it, penaltyTypeRequested: pick(o) }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesRequested: items,
                          });
                        }}
                      />
                      <TextField
                        id={`ncr-si-${index}-pr-${pIndex}-duration`}
                        label={t('erru.ncr.form.penaltyDuration')}
                        value={p.duration != null ? String(p.duration) : ''}
                        onChange={(v) => {
                          const numericValue = v.replace(/\D/g, '');
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex
                              ? {
                                  ...it,
                                  duration: numericValue
                                    ? Number(numericValue)
                                    : null,
                                }
                              : it,
                          );
                          updateSeriousInfringement(index, {
                            penaltiesRequested: items,
                          });
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'flex-end',
                        }}
                        className="full-span"
                      >
                        <Button
                          visualType="secondary"
                          className="mt-05"
                          onClick={() => removePenaltyRequested(index, pIndex)}
                          type="button"
                        >
                          {t('common.remove')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </Card.Content>
              </Card>
            ))}
            {formik.values.seriousInfringements.length === 0 && (
              <Text>{t('common.tableIsEmpty')}</Text>
            )}
          </Card.Content>
        </Card>
      )}
    </>
  );
}
