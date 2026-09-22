import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Radio,
  Select,
  TextField,
} from '@tedi-design-system/react/tedi';
import {
  classifierOptions,
  dateFieldError,
  fieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from '../../utils/fieldHelpers';
import type { useNuForm } from '../../pages/nu/useNuForm';
import { useMediaQuery } from '../../../../hooks/useMediaQuery.ts';
import { BREAKPOINTS } from '../../../../constants/constants.ts';
import { MaskedDateField } from '../../../control-forms/components/shared/MaskedDateField.tsx';
import { toIsoDate } from '../../../../hooks/dateUtils';

type NuFormApi = ReturnType<typeof useNuForm>;

export function NuMessageFields({
  form,
  businessCaseId,
}: {
  form: NuFormApi;
  businessCaseId?: string;
}) {
  const { t } = useTranslation();
  const { formik, countries, authorities, requestSources, requestPurposes } =
    form;
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  const err = (field: keyof typeof formik.values) => fieldError(formik, field);
  const dateErr = (field: keyof typeof formik.values) =>
    dateFieldError(formik, field);
  const opts = classifierOptions;
  const selected = selectedClassifierOption;
  const pick = pickOptionValue;
  const dateValue = parseIsoDate;
  const gridClass = isDesktop ? 'form-grid-desktop' : 'form-grid-mobile';

  const sourceOptions = requestSources.map((c) => ({
    value: c.code,
    label: t(`erru.nu.requestSource.${c.code}`, c.name),
  }));
  const purposeOptions = requestPurposes.map((c) => ({
    value: c.code,
    label: t(`erru.nu.requestPurpose.${c.code}`, c.name),
  }));

  return (
    <>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.nu.form.headerBlock')}
          </Heading>

          <div className={gridClass}>
            {/* Estonia is always the issuer of an outgoing message — not editable. */}
            <TextField
              id="nu-from"
              label={t('erru.nu.form.nuFrom')}
              value={selected(countries, 'EE')?.label ?? 'EE'}
              disabled
              onChange={() => undefined}
            />

            <Select
              id="nu-originating-authority"
              label={t('erru.nu.form.originatingAuthority')}
              required
              options={opts(authorities)}
              value={selected(authorities, formik.values.originatingAuthority)}
              onChange={(o) =>
                formik.setFieldValue('originatingAuthority', pick(o))
              }
              {...err('originatingAuthority')}
            />

            {/* No `required` — an empty selection means "all member states" (ZZ). */}
            <Select
              id="nu-to"
              label={t('erru.nu.form.nuTo')}
              options={[{ value: '', label: '\u00a0' }, ...opts(countries)]}
              value={selected(countries, formik.values.nuTo)}
              onChange={(o) => formik.setFieldValue('nuTo', pick(o))}
              helper={{ text: t('erru.nu.form.nuToHint') }}
              {...err('nuTo')}
            />

            {businessCaseId && (
              <TextField
                id="nu-business-case-id"
                label={t('erru.nu.form.businessCaseId')}
                value={businessCaseId}
                disabled
                onChange={() => undefined}
              />
            )}

            <Select
              id="nu-request-source"
              label={t('erru.nu.form.requestSource')}
              required
              options={sourceOptions}
              value={
                sourceOptions.find(
                  (o) => o.value === formik.values.requestSource,
                ) ?? null
              }
              onChange={(o) => formik.setFieldValue('requestSource', pick(o))}
              {...err('requestSource')}
            />

            <Select
              id="nu-request-purpose"
              label={t('erru.nu.form.requestPurpose')}
              required
              options={purposeOptions}
              value={
                purposeOptions.find(
                  (o) => o.value === formik.values.requestPurpose,
                ) ?? null
              }
              onChange={(o) => formik.setFieldValue('requestPurpose', pick(o))}
              {...err('requestPurpose')}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.nu.form.primaryElement')}
          </Heading>
          <div className="d-flex gap-3 mb-2">
            <Radio
              id="nu-primary-transport-manager"
              name="nu-primary-element"
              value="transportManager"
              label={t('erru.nu.form.primaryTransportManager')}
              checked={formik.values.primaryElement === 'transportManager'}
              onChange={() =>
                formik.setFieldValue('primaryElement', 'transportManager')
              }
            />
            <Radio
              id="nu-primary-certificate"
              name="nu-primary-element"
              value="certificate"
              label={t('erru.nu.form.primaryCertificate')}
              checked={formik.values.primaryElement === 'certificate'}
              onChange={() =>
                formik.setFieldValue('primaryElement', 'certificate')
              }
            />
          </div>

          <Heading element="h3" className="mb-1">
            {t('erru.nu.form.nameBlock')}
          </Heading>
          <div className={gridClass}>
            <TextField
              id="nu-tm-first-name"
              label={t('erru.nu.form.tmFirstName')}
              required={formik.values.primaryElement === 'transportManager'}
              {...formik.getFieldProps('tmFirstName')}
              {...err('tmFirstName')}
            />
            <TextField
              id="nu-tm-family-name"
              label={t('erru.nu.form.tmFamilyName')}
              required={formik.values.primaryElement === 'transportManager'}
              {...formik.getFieldProps('tmFamilyName')}
              {...err('tmFamilyName')}
            />
            <MaskedDateField
              id="nu-tm-date-of-birth"
              label={t('erru.nu.form.tmDateOfBirth')}
              required={formik.values.primaryElement === 'transportManager'}
              selected={dateValue(formik.values.tmDateOfBirth)}
              onSelect={(v) =>
                formik.setFieldValue(
                  'tmDateOfBirth',
                  toIsoDate(v as Date | undefined),
                )
              }
              monthYearSelectType="grid"
              inputProps={{
                ...dateErr('tmDateOfBirth').inputProps,
                onClear: () => formik.setFieldValue('tmDateOfBirth', ''),
              }}
            />
            <TextField
              id="nu-tm-place-of-birth"
              label={t('erru.nu.form.tmPlaceOfBirth')}
              {...formik.getFieldProps('tmPlaceOfBirth')}
              {...err('tmPlaceOfBirth')}
            />
          </div>

          <Heading element="h3" className="mt-2 mb-1">
            {t('erru.nu.form.certificateBlock')}
          </Heading>
          <div className={gridClass}>
            <TextField
              id="nu-certificate-number"
              label={t('erru.nu.form.certificateNumber')}
              required={formik.values.primaryElement === 'certificate'}
              {...formik.getFieldProps('certificateNumber')}
              {...err('certificateNumber')}
            />
            <MaskedDateField
              id="nu-certificate-issue-date"
              label={t('erru.nu.form.certificateIssueDate')}
              required={formik.values.primaryElement === 'certificate'}
              selected={dateValue(formik.values.certificateIssueDate)}
              onSelect={(v) =>
                formik.setFieldValue(
                  'certificateIssueDate',
                  toIsoDate(v as Date | undefined),
                )
              }
              monthYearSelectType="grid"
              inputProps={{
                ...dateErr('certificateIssueDate').inputProps,
                onClear: () => formik.setFieldValue('certificateIssueDate', ''),
              }}
            />
            <Select
              id="nu-certificate-issue-country"
              label={t('erru.nu.form.certificateIssueCountry')}
              required={formik.values.primaryElement === 'certificate'}
              options={opts(countries)}
              value={selected(countries, formik.values.certificateIssueCountry)}
              onChange={(o) =>
                formik.setFieldValue('certificateIssueCountry', pick(o))
              }
              {...err('certificateIssueCountry')}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h2" className="mb-1">
            {t('erru.nu.form.unfitnessBlock')}
          </Heading>
          <div className={gridClass}>
            <MaskedDateField
              id="nu-unfit-start-date"
              label={t('erru.nu.form.unfitStartDate')}
              required
              selected={dateValue(formik.values.unfitStartDate)}
              onSelect={(v) =>
                formik.setFieldValue(
                  'unfitStartDate',
                  toIsoDate(v as Date | undefined),
                )
              }
              monthYearSelectType="grid"
              inputProps={{
                ...dateErr('unfitStartDate').inputProps,
                onClear: () => formik.setFieldValue('unfitStartDate', ''),
                onChangeEvent: (event) => {
                  if (!event.target.value.trim()) {
                    formik.setFieldValue('unfitStartDate', '');
                  }
                },
              }}
            />
          </div>
        </Card.Content>
      </Card>
    </>
  );
}
