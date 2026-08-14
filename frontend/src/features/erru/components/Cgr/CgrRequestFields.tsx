import { useTranslation } from 'react-i18next';
import {
  Card,
  DateField,
  Heading,
  Select,
  TextField,
  Text,
} from '@tedi-design-system/react/tedi';
import { toIsoDate } from '../../../../hooks/dateUtils';
import {
  classifierOptions,
  fieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from '../../utils/fieldHelpers';
import type { useCgrForm } from '../../pages/cgr/useCgrForm';

type CgrFormApi = ReturnType<typeof useCgrForm>;

/**
 * Editable fields of an outgoing CGR draft: "Päringu päis ja osapooled", "Veokorraldusjuhi
 * otsing (7A)" and "Kutsetunnistuse otsing (7B)". Every Yup-required field also carries
 * the `required` prop, per the project's frontend conventions. cgrTo has no `required`
 * prop — an empty selection is a valid broadcast-to-all-states request (LJVIS2-138 §4).
 */
export function CgrRequestFields({ form }: { form: CgrFormApi }) {
  const { t } = useTranslation();
  const { formik, countries, authorities, requestSources, requestPurposes } = form;

  const err = (field: keyof typeof formik.values) => fieldError(formik, field);
  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const dateValue = parseIsoDate;

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.cgr.form.headerBlock')}</Heading>

          {/* Estonia is always the issuer of an outgoing request — not editable. */}
          <TextField
            id="cgr-from"
            label={t('erru.cgr.form.cgrFrom')}
            value="EE"
            disabled
            onChange={() => undefined}
          />

          <Select
            id="cgr-originating-authority"
            label={t('erru.cgr.form.originatingAuthority')}
            required
            options={opts(authorities)}
            value={selected(authorities, formik.values.originatingAuthority)}
            onChange={(o) => formik.setFieldValue('originatingAuthority', pick(o))}
            {...err('originatingAuthority')}
          />

          {/* No `required` — an empty selection means "all member states" (ZZ). */}
          <Select
            id="cgr-to"
            label={t('erru.cgr.form.cgrTo')}
            options={opts(countries)}
            value={selected(countries, formik.values.cgrTo)}
            onChange={(o) => formik.setFieldValue('cgrTo', pick(o))}
            helper={{ text: t('erru.cgr.form.cgrToHint') }}
            {...err('cgrTo')}
          />

          <Select
            id="cgr-request-source"
            label={t('erru.cgr.form.requestSource')}
            required
            options={opts(requestSources)}
            value={selected(requestSources, formik.values.requestSource)}
            onChange={(o) => formik.setFieldValue('requestSource', pick(o))}
            {...err('requestSource')}
          />

          <Select
            id="cgr-request-purpose"
            label={t('erru.cgr.form.requestPurpose')}
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
          <Heading element="h2">{t('erru.cgr.form.nameBlock')}</Heading>
          <Text>{t('erru.cgr.form.searchChoiceHint')}</Text>

          <TextField
            id="cgr-tm-first-name"
            label={t('erru.cgr.form.tmFirstName')}
            value={formik.values.tmFirstName}
            onChange={(v) => formik.setFieldValue('tmFirstName', v)}
            {...err('tmFirstName')}
          />

          <TextField
            id="cgr-tm-family-name"
            label={t('erru.cgr.form.tmFamilyName')}
            value={formik.values.tmFamilyName}
            onChange={(v) => formik.setFieldValue('tmFamilyName', v)}
            {...err('tmFamilyName')}
          />

          <DateField
            id="cgr-tm-date-of-birth"
            label={t('erru.cgr.form.tmDateOfBirth')}
            selected={dateValue(formik.values.tmDateOfBirth)}
            onSelect={(v) => formik.setFieldValue('tmDateOfBirth', toIsoDate(v as Date | undefined))}
            monthYearSelectType="grid"
            initialView="years"
            disableFuture
            {...err('tmDateOfBirth')}
          />

          <TextField
            id="cgr-tm-place-of-birth"
            label={t('erru.cgr.form.tmPlaceOfBirth')}
            value={formik.values.tmPlaceOfBirth}
            onChange={(v) => formik.setFieldValue('tmPlaceOfBirth', v)}
            {...err('tmPlaceOfBirth')}
          />
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2">{t('erru.cgr.form.certificateBlock')}</Heading>
          <Text>{t('erru.cgr.form.searchChoiceHint')}</Text>

          <TextField
            id="cgr-certificate-number"
            label={t('erru.cgr.form.certificateNumber')}
            value={formik.values.certificateNumber}
            onChange={(v) => formik.setFieldValue('certificateNumber', v)}
            {...err('certificateNumber')}
          />

          <DateField
            id="cgr-certificate-issue-date"
            label={t('erru.cgr.form.certificateIssueDate')}
            selected={dateValue(formik.values.certificateIssueDate)}
            onSelect={(v) =>
              formik.setFieldValue('certificateIssueDate', toIsoDate(v as Date | undefined))
            }
            monthYearSelectType="grid"
            {...err('certificateIssueDate')}
          />

          <Select
            id="cgr-certificate-issue-country"
            label={t('erru.cgr.form.certificateIssueCountry')}
            options={opts(countries)}
            value={selected(countries, formik.values.certificateIssueCountry)}
            onChange={(o) => formik.setFieldValue('certificateIssueCountry', pick(o))}
            {...err('certificateIssueCountry')}
          />
        </Card.Content>
      </Card>
    </>
  );
}
