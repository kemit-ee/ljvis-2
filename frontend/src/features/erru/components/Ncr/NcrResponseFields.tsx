import { useTranslation } from 'react-i18next';
import { Card, ChoiceGroup, Heading, Select, TextField } from '@tedi-design-system/react/tedi';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import { classifierOptions, fieldError, pickOptionValue, selectedClassifierOption } from '../../utils/fieldHelpers';
import type { useNcrResponseForm } from '../../pages/ncr/useNcrResponseForm';

type NcrResponseFormApi = ReturnType<typeof useNcrResponseForm>;

/**
 * Editable fields of the Estonian response draft to an incoming NCR message (LJVIS2-63
 * §4 Plokk "Vastuse sisu"). One row per requested penalty (fixed set, seeded from the
 * request — see useNcrResponseForm), "Määrati karistus" Ei clears "Kehtestatud karistus".
 */
export function NcrResponseFields({ form }: { form: NcrResponseFormApi }) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();
  const { formik, updatePenalty } = form;

  const responseStatuses = getByCode('NCR_RESPONSE_STATUS');
  const licenceStatuses = getByCode('NCR_COMMUNITY_LICENCE_STATUS');
  const penaltyTypeImposedRes = getByCode('NCR_PENALTY_TYPE_IMPOSED_RES');
  const countries = getByCode('COUNTRY');

  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const err = (field: string) => fieldError(formik, field);

  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h2">{t('erru.ncr.form.responseBlock')}</Heading>
        <TextField
          id="ncr-responding-authority"
          label={t('erru.ncr.form.respondingAuthority')}
          required
          value={formik.values.respondingAuthority}
          onChange={(v) => formik.setFieldValue('respondingAuthority', v)}
          {...err('respondingAuthority')}
        />
        <Select
          id="ncr-response-status-code"
          label={t('erru.ncr.form.responseStatusCode')}
          required
          options={opts(responseStatuses)}
          value={selected(responseStatuses, formik.values.responseStatusCode)}
          onChange={(o) => formik.setFieldValue('responseStatusCode', pick(o))}
          {...err('responseStatusCode')}
        />
        <TextField
          id="ncr-response-status-message"
          label={t('erru.ncr.form.responseStatusMessage')}
          value={formik.values.responseStatusMessage}
          onChange={(v) => formik.setFieldValue('responseStatusMessage', v)}
        />
        <TextField
          id="ncr-response-number-of-vehicles"
          label={t('erru.ncr.form.responseNumberOfVehicles')}
          value={formik.values.responseNumberOfVehicles}
          onChange={(v) => formik.setFieldValue('responseNumberOfVehicles', v)}
        />
        <Select
          id="ncr-response-community-licence-status"
          label={t('erru.ncr.form.responseCommunityLicenceStatus')}
          options={opts(licenceStatuses)}
          value={selected(licenceStatuses, formik.values.responseCommunityLicenceStatus)}
          onChange={(o) => formik.setFieldValue('responseCommunityLicenceStatus', pick(o))}
        />
        <TextField
          id="ncr-response-address"
          label={t('erru.ncr.form.responseAddressStreet')}
          value={formik.values.responseAddress.address ?? ''}
          onChange={(v) => formik.setFieldValue('responseAddress', { ...formik.values.responseAddress, address: v })}
        />
        <TextField
          id="ncr-response-postcode"
          label={t('erru.ncr.form.responseAddressPostCode')}
          value={formik.values.responseAddress.postCode ?? ''}
          onChange={(v) => formik.setFieldValue('responseAddress', { ...formik.values.responseAddress, postCode: v })}
        />
        <TextField
          id="ncr-response-city"
          label={t('erru.ncr.form.responseAddressCity')}
          value={formik.values.responseAddress.city ?? ''}
          onChange={(v) => formik.setFieldValue('responseAddress', { ...formik.values.responseAddress, city: v })}
        />
        <Select
          id="ncr-response-country"
          label={t('erru.ncr.form.responseAddressCountry')}
          options={opts(countries)}
          value={selected(countries, formik.values.responseAddress.country ?? '')}
          onChange={(o) =>
            formik.setFieldValue('responseAddress', { ...formik.values.responseAddress, country: pick(o) })
          }
        />

        <Heading element="h3">{t('erru.ncr.form.penaltiesImposedResponseBlock')}</Heading>
        {formik.values.responsePenaltiesImposed.map((p, index) => (
          <div key={index} className="detail-row">
            <TextField
              id={`ncr-resp-pi-${index}-req-id`}
              label={t('erru.ncr.form.penaltyRequestedIdentifier')}
              value={String(p.penaltyRequestedIdentifier)}
              disabled
              onChange={() => undefined}
            />
            <TextField
              id={`ncr-resp-pi-${index}-authority`}
              label={t('erru.ncr.form.authorityImposingPenalty')}
              value={p.authorityImposingPenalty}
              onChange={(v) => updatePenalty(index, { authorityImposingPenalty: v })}
            />
            <ChoiceGroup
              id={`ncr-resp-pi-${index}-is-imposed`}
              name={`ncr-resp-pi-${index}-is-imposed`}
              label={t('erru.ncr.form.isImposed')}
              inputType="radio"
              direction="row"
              value={p.isImposed ? 'true' : 'false'}
              onChange={(v) => updatePenalty(index, { isImposed: v === 'true' })}
              items={[
                { id: `ncr-resp-pi-${index}-imposed-yes`, value: 'true', label: t('common.yes') },
                { id: `ncr-resp-pi-${index}-imposed-no`, value: 'false', label: t('common.no') },
              ]}
            />
            {p.isImposed && (
              <Select
                id={`ncr-resp-pi-${index}-type`}
                label={t('erru.ncr.form.penaltyTypeImposed')}
                options={opts(penaltyTypeImposedRes)}
                value={selected(penaltyTypeImposedRes, p.penaltyTypeImposed ?? '')}
                onChange={(o) => updatePenalty(index, { penaltyTypeImposed: pick(o) })}
              />
            )}
            <TextField
              id={`ncr-resp-pi-${index}-start-date`}
              label={t('erru.ncr.form.startDate')}
              value={p.startDate ?? ''}
              onChange={(v) => updatePenalty(index, { startDate: v })}
            />
            <TextField
              id={`ncr-resp-pi-${index}-end-date`}
              label={t('erru.ncr.form.endDate')}
              value={p.endDate ?? ''}
              onChange={(v) => updatePenalty(index, { endDate: v })}
            />
            <TextField
              id={`ncr-resp-pi-${index}-reason`}
              label={t('erru.ncr.form.penaltyReason')}
              value={p.reason ?? ''}
              onChange={(v) => updatePenalty(index, { reason: v })}
            />
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
