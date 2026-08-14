import { useTranslation } from 'react-i18next';
import { Button, Card, ChoiceGroup, Heading, Select, Text, TextField } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { useNcrRequestForm } from '../../pages/ncr/useNcrRequestForm';

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
  const {
    formik,
    addSeriousInfringement,
    removeSeriousInfringement,
    updateSeriousInfringement,
    addPenaltyImposed,
    removePenaltyImposed,
    addPenaltyRequested,
    removePenaltyRequested,
  } = form;

  const countries = getByCode('COUNTRY');
  const infringementCategories = getByCode('NCR_INFRINGEMENT_CATEGORY');
  const penaltyTypeImposedReq = getByCode('NCR_PENALTY_TYPE_IMPOSED_REQ');
  const penaltyTypeRequested = getByCode('NCR_PENALTY_TYPE_REQUESTED');
  const isExecutedOptions = getByCode('NCR_IS_EXECUTED');

  const opts = (list: { code: string; name: string }[]) => list.map((c) => ({ value: c.code, label: c.name }));
  const selected = (list: { code: string; name: string }[], code: string) =>
    opts(list).find((o) => o.value === code) ?? null;
  const pick = (o: unknown) => (o as { value?: string } | null)?.value ?? '';

  const err = (field: string) => {
    const touched = (formik.touched as Record<string, unknown>)[field];
    const error = (formik.errors as Record<string, unknown>)[field];
    return touched && error ? { helper: { text: String(error), type: 'error' as const } } : {};
  };

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.ncr.form.headerBlock')}</Heading>
          <TextField id="ncr-from" label={t('erru.ncr.form.ncrFrom')} value="EE" disabled onChange={() => undefined} />
          <TextField
            id="ncr-originating-authority"
            label={t('erru.ncr.form.originatingAuthority')}
            required
            value={formik.values.originatingAuthority}
            onChange={(v) => formik.setFieldValue('originatingAuthority', v)}
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
          <TextField
            id="ncr-transport-undertaking-name"
            label={t('erru.ncr.form.transportUndertakingName')}
            required
            value={formik.values.transportUndertakingName}
            onChange={(v) => formik.setFieldValue('transportUndertakingName', v)}
            {...err('transportUndertakingName')}
          />
          <TextField
            id="ncr-community-licence-number"
            label={t('erru.ncr.form.communityLicenceNumber')}
            required
            value={formik.values.communityLicenceNumber}
            onChange={(v) => formik.setFieldValue('communityLicenceNumber', v)}
            {...err('communityLicenceNumber')}
          />
          <TextField
            id="ncr-vehicle-registration-number"
            label={t('erru.ncr.form.vehicleRegistrationNumber')}
            required
            value={formik.values.vehicleRegistrationNumber}
            onChange={(v) => formik.setFieldValue('vehicleRegistrationNumber', v)}
            {...err('vehicleRegistrationNumber')}
          />
          <Select
            id="ncr-vehicle-registration-country"
            label={t('erru.ncr.form.vehicleRegistrationCountry')}
            required
            options={opts(countries)}
            value={selected(countries, formik.values.vehicleRegistrationCountry)}
            onChange={(o) => formik.setFieldValue('vehicleRegistrationCountry', pick(o))}
            {...err('vehicleRegistrationCountry')}
          />
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.ncr.form.checkSummaryBlock')}</Heading>
          <ChoiceGroup
            id="ncr-check-passed"
            name="ncr-check-passed"
            label={t('erru.ncr.form.checkPassed')}
            required
            inputType="radio"
            direction="row"
            value={formik.values.checkPassed ? 'true' : 'false'}
            onChange={(v) => formik.setFieldValue('checkPassed', v === 'true')}
            items={[
              { id: 'ncr-check-passed-yes', value: 'true', label: t('common.yes') },
              { id: 'ncr-check-passed-no', value: 'false', label: t('common.no') },
            ]}
          />
          <TextField
            id="ncr-check-date"
            label={t('erru.ncr.form.checkDate')}
            required
            value={formik.values.checkDate}
            onChange={(v) => formik.setFieldValue('checkDate', v)}
            {...err('checkDate')}
          />

          {!formik.values.checkPassed && (
            <>
              <TextField
                id="ncr-minor-infringement-date"
                label={t('erru.ncr.form.minorInfringementDate')}
                value={formik.values.minorInfringementDate}
                onChange={(v) => formik.setFieldValue('minorInfringementDate', v)}
              />
              <TextField
                id="ncr-minor-infringement-count"
                label={t('erru.ncr.form.minorInfringementCount')}
                value={formik.values.minorInfringementCount}
                onChange={(v) => formik.setFieldValue('minorInfringementCount', v)}
              />
            </>
          )}
        </Card.Content>
      </Card>

      {!formik.values.checkPassed && (
        <Card className="mt-05">
          <Card.Content>
            <div className="card-main">
              <Heading element="h2">{t('erru.ncr.form.seriousInfringementsBlock')}</Heading>
              <Button visualType="secondary" onClick={addSeriousInfringement} type="button">
                {t('common.add')}
              </Button>
            </div>

            {formik.values.seriousInfringements.map((si, index) => (
              <Card key={index} className="mt-05">
                <Card.Content>
                  <div className="card-main">
                    <Heading element="h3">{t('erru.ncr.form.infringementNumber', { number: index + 1 })}</Heading>
                    <Button visualType="secondary" onClick={() => removeSeriousInfringement(index)} type="button">
                      {t('common.remove')}
                    </Button>
                  </div>
                  <Select
                    id={`ncr-si-${index}-category`}
                    label={t('erru.ncr.form.infringementCategory')}
                    required
                    options={opts(infringementCategories)}
                    value={selected(infringementCategories, si.category)}
                    onChange={(o) => updateSeriousInfringement(index, { category: pick(o) as typeof si.category })}
                  />
                  <TextField
                    id={`ncr-si-${index}-type`}
                    label={t('erru.ncr.form.infringementType')}
                    required
                    value={si.infringementType}
                    onChange={(v) => updateSeriousInfringement(index, { infringementType: v })}
                  />
                  <TextField
                    id={`ncr-si-${index}-date`}
                    label={t('erru.ncr.form.infringementDate')}
                    required
                    value={si.dateOfInfringement}
                    onChange={(v) => updateSeriousInfringement(index, { dateOfInfringement: v })}
                  />
                  <TextField
                    id={`ncr-si-${index}-detection-date`}
                    label={t('erru.ncr.form.detectionCheckDate')}
                    required
                    value={si.detectionCheckDate}
                    onChange={(v) => updateSeriousInfringement(index, { detectionCheckDate: v })}
                  />
                  <ChoiceGroup
                    id={`ncr-si-${index}-appeal`}
                    name={`ncr-si-${index}-appeal`}
                    label={t('erru.ncr.form.appealPossible')}
                    inputType="radio"
                    direction="row"
                    value={si.appealPossible ? 'true' : 'false'}
                    onChange={(v) => updateSeriousInfringement(index, { appealPossible: v === 'true' })}
                    items={[
                      { id: `ncr-si-${index}-appeal-yes`, value: 'true', label: t('common.yes') },
                      { id: `ncr-si-${index}-appeal-no`, value: 'false', label: t('common.no') },
                    ]}
                  />

                  <div className="card-main mt-05">
                    <Heading element="h4">{t('erru.ncr.form.penaltiesImposedBlock')}</Heading>
                    <Button visualType="secondary" onClick={() => addPenaltyImposed(index)} type="button">
                      {t('common.add')}
                    </Button>
                  </div>
                  {si.penaltiesImposed.map((p, pIndex) => (
                    <div key={pIndex} className="detail-row">
                      <TextField
                        id={`ncr-si-${index}-pi-${pIndex}-id`}
                        label={t('erru.ncr.form.penaltyImposedIdentifier')}
                        value={String(p.penaltyImposedIdentifier)}
                        onChange={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex ? { ...it, penaltyImposedIdentifier: Number(v) || 0 } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesImposed: items });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pi-${pIndex}-type`}
                        label={t('erru.ncr.form.penaltyTypeImposed')}
                        options={opts(penaltyTypeImposedReq)}
                        value={selected(penaltyTypeImposedReq, p.penaltyTypeImposed)}
                        onChange={(o) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex ? { ...it, penaltyTypeImposed: pick(o) } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesImposed: items });
                        }}
                      />
                      <TextField
                        id={`ncr-si-${index}-pi-${pIndex}-decision-date`}
                        label={t('erru.ncr.form.finalDecisionDate')}
                        value={p.finalDecisionDate}
                        onChange={(v) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex ? { ...it, finalDecisionDate: v } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesImposed: items });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pi-${pIndex}-executed`}
                        label={t('erru.ncr.form.isExecuted')}
                        options={opts(isExecutedOptions)}
                        value={selected(isExecutedOptions, p.isExecuted)}
                        onChange={(o) => {
                          const items = si.penaltiesImposed.map((it, j) =>
                            j === pIndex ? { ...it, isExecuted: pick(o) as typeof it.isExecuted } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesImposed: items });
                        }}
                      />
                      <Button visualType="secondary" onClick={() => removePenaltyImposed(index, pIndex)} type="button">
                        {t('common.remove')}
                      </Button>
                    </div>
                  ))}

                  <div className="card-main mt-05">
                    <Heading element="h4">{t('erru.ncr.form.penaltiesRequestedBlock')}</Heading>
                    <Button visualType="secondary" onClick={() => addPenaltyRequested(index)} type="button">
                      {t('common.add')}
                    </Button>
                  </div>
                  {si.penaltiesRequested.map((p, pIndex) => (
                    <div key={pIndex} className="detail-row">
                      <TextField
                        id={`ncr-si-${index}-pr-${pIndex}-id`}
                        label={t('erru.ncr.form.penaltyRequestedIdentifier')}
                        value={String(p.penaltyRequestedIdentifier)}
                        onChange={(v) => {
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex ? { ...it, penaltyRequestedIdentifier: Number(v) || 0 } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesRequested: items });
                        }}
                      />
                      <Select
                        id={`ncr-si-${index}-pr-${pIndex}-type`}
                        label={t('erru.ncr.form.penaltyTypeRequested')}
                        options={opts(penaltyTypeRequested)}
                        value={selected(penaltyTypeRequested, p.penaltyTypeRequested)}
                        onChange={(o) => {
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex ? { ...it, penaltyTypeRequested: pick(o) } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesRequested: items });
                        }}
                      />
                      <TextField
                        id={`ncr-si-${index}-pr-${pIndex}-duration`}
                        label={t('erru.ncr.form.penaltyDuration')}
                        value={p.duration != null ? String(p.duration) : ''}
                        onChange={(v) => {
                          const items = si.penaltiesRequested.map((it, j) =>
                            j === pIndex ? { ...it, duration: v ? Number(v) : null } : it,
                          );
                          updateSeriousInfringement(index, { penaltiesRequested: items });
                        }}
                      />
                      <Button visualType="secondary" onClick={() => removePenaltyRequested(index, pIndex)} type="button">
                        {t('common.remove')}
                      </Button>
                    </div>
                  ))}
                </Card.Content>
              </Card>
            ))}
            {formik.values.seriousInfringements.length === 0 && <Text>{t('common.tableIsEmpty')}</Text>}
          </Card.Content>
        </Card>
      )}
    </>
  );
}
