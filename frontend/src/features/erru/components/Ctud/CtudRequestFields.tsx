import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Select,
  TextField,
  Text,
} from '@tedi-design-system/react/tedi';
import { classifierOptions, fieldError, pickOptionValue, selectedClassifierOption } from '../../utils/fieldHelpers';
import type { useCtudForm } from '../../pages/ctud/useCtudForm';

type CtudFormApi = ReturnType<typeof useCtudForm>;

/**
 * Editable fields of an outgoing CTUD draft: "Päringu päis ja osapooled" and
 * "Veoettevõtja". Every Yup-required field also carries the `required` prop, per the
 * project's frontend conventions.
 */
export function CtudRequestFields({ form }: { form: CtudFormApi }) {
  const { t } = useTranslation();
  const { formik, countries, authorities, requestSources, requestPurposes } = form;

  const err = (field: keyof typeof formik.values) => fieldError(formik, field);
  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;

  const yesNoOptions = [
    { value: 'true', label: t('common.yes') },
    { value: 'false', label: t('common.no') },
  ];

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.ctud.form.headerBlock')}</Heading>

          {/* Estonia is always the issuer of an outgoing request — not editable. */}
          <TextField
            id="ctud-from"
            label={t('erru.ctud.form.ctudFrom')}
            value="EE"
            disabled
            onChange={() => undefined}
          />

          <Select
            id="ctud-originating-authority"
            label={t('erru.ctud.form.originatingAuthority')}
            required
            options={opts(authorities)}
            value={selected(authorities, formik.values.originatingAuthority)}
            onChange={(o) => formik.setFieldValue('originatingAuthority', pick(o))}
            {...err('originatingAuthority')}
          />

          <Select
            id="ctud-to"
            label={t('erru.ctud.form.ctudTo')}
            required
            options={opts(countries)}
            value={selected(countries, formik.values.ctudTo)}
            onChange={(o) => formik.setFieldValue('ctudTo', pick(o))}
            {...err('ctudTo')}
          />

          <Select
            id="ctud-request-source"
            label={t('erru.ctud.form.requestSource')}
            required
            options={opts(requestSources)}
            value={selected(requestSources, formik.values.requestSource)}
            onChange={(o) => formik.setFieldValue('requestSource', pick(o))}
            {...err('requestSource')}
          />

          <Select
            id="ctud-request-purpose"
            label={t('erru.ctud.form.requestPurpose')}
            required
            options={opts(requestPurposes)}
            value={selected(requestPurposes, formik.values.requestPurpose)}
            onChange={(o) => formik.setFieldValue('requestPurpose', pick(o))}
            {...err('requestPurpose')}
          />
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.ctud.form.undertakingBlock')}</Heading>
          <Text>{t('erru.ctud.form.minTwoHint')}</Text>

          <TextField
            id="ctud-undertaking-name"
            label={t('erru.ctud.form.undertakingName')}
            value={formik.values.transportUndertakingName}
            onChange={(v) => formik.setFieldValue('transportUndertakingName', v)}
            {...err('transportUndertakingName')}
          />

          <TextField
            id="ctud-licence-number"
            label={t('erru.ctud.form.licenceNumber')}
            value={formik.values.communityLicenceNumber}
            onChange={(v) => formik.setFieldValue('communityLicenceNumber', v)}
            {...err('communityLicenceNumber')}
          />

          <TextField
            id="ctud-vehicle-number"
            label={t('erru.ctud.form.vehicleNumber')}
            value={formik.values.vehicleRegistrationNumber}
            onChange={(v) => formik.setFieldValue('vehicleRegistrationNumber', v)}
            {...err('vehicleRegistrationNumber')}
          />

          <Select
            id="ctud-vehicle-country"
            label={t('erru.ctud.form.vehicleCountry')}
            // mandatory only once a registration number is present
            required={!!formik.values.vehicleRegistrationNumber}
            options={opts(countries)}
            value={selected(countries, formik.values.vehicleRegistrationCountry)}
            onChange={(o) => formik.setFieldValue('vehicleRegistrationCountry', pick(o))}
            {...err('vehicleRegistrationCountry')}
          />

          <Select
            id="ctud-all-vehicles"
            label={t('erru.ctud.form.requestAllVehicles')}
            options={yesNoOptions}
            value={yesNoOptions.find((o) => o.value === formik.values.requestAllVehicles) ?? null}
            onChange={(o) =>
              formik.setFieldValue('requestAllVehicles', pick(o) || 'false')
            }
          />
        </Card.Content>
      </Card>
    </>
  );
}
