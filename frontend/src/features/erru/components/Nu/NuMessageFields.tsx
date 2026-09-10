import { NuIdentityBlocks, type NuIdentity } from './NuIdentityBlocks';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Heading,
  Select,
  Text,
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
  identity,
  businessCaseId,
}: {
  form: NuFormApi;
  identity: NuIdentity;
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

      <NuIdentityBlocks identity={identity} />

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
