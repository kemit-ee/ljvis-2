import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import {
  EU_VIOLATION_GROUPS,
  FOREIGN_VIOLATION_RECOMMENDED_MEASURE_OPTIONS,
  FOREIGN_VIOLATION_SANCTION_OPTIONS,
  effectiveRecommendedMeasures,
} from '../../../../constants/constants';
import { formatDate } from '../../../../hooks/dateUtils';
import { useClassifiers } from '../../../classifiers/ClassifierProvider';
import type { ForeignViolationFormViolation } from '../../../control-forms/types';
import type { CitizenForeignViolationForm } from '../../api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-name mb-1">
      <dt>
        <Text modifiers="bold" color="secondary">
          {label}
        </Text>
      </dt>
      <dd className="mt-025" style={{ margin: 0 }}>
        {children}
      </dd>
    </div>
  );
}

/** Semantic label/value list; every Field must be inside one. */
function FieldList({ children }: { children: React.ReactNode }) {
  return <dl style={{ margin: 0 }}>{children}</dl>;
}

function Section({
  title,
  children,
  plain,
}: {
  title: string;
  children: React.ReactNode;
  /** Children are not Fields (e.g. nested lists), so do not wrap in a <dl>. */
  plain?: boolean;
}) {
  return (
    <Card className="mt-05">
      <Card.Content>
        <Heading element="h3">{title}</Heading>
        <div className="mt-05">{plain ? children : <FieldList>{children}</FieldList>}</div>
      </Card.Content>
    </Card>
  );
}

const dash = (value?: string | number | null): string =>
  value === undefined || value === null || String(value).trim() === ''
    ? '—'
    : String(value);

/** '12:30:00' -> '12.30' */
function formatTime(value?: string | null): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[1].padStart(2, '0')}.${match[2]}` : '';
}

/**
 * Read-only, citizen/company-facing view of a published foreign_violation_form
 * (välisriigi rikkumise kontrollkaart). Deliberately NOT the officer form
 * component: it shows only what the company needs (as plain text, not
 * disabled inputs) and none of the officer's internal data (notification
 * flags, administrative-procedure dates and decision, data-entry date).
 * The "Asutused" wording is KLIM's.
 */
export function CitizenForeignViolationView({
  form,
}: {
  form: CitizenForeignViolationForm;
}) {
  const { t } = useTranslation();
  const { getByCode } = useClassifiers();

  const countryName = (code?: string | null): string =>
    code ? (getByCode('COUNTRY').find((c) => c.code === code)?.name ?? code) : '';

  // Estonian region/city/county are stored as EHAK classifier value keys
  // (only when that part of the card is in Estonia); foreign values are free
  // text, even when purely numeric (e.g. a French département '75').
  const placeName = (value?: string | null, countryCode?: string | null): string => {
    if (!value) return '';
    if (countryCode !== 'EE' || !/^\d+$/.test(value)) return value;
    return (
      getByCode('EHAK').find((e) => String(e.classifierValueKey) === value)?.name ?? ''
    );
  };

  const labelOf = (
    options: ReadonlyArray<{ value: string; labelKey: string }>,
    value?: string | null,
  ): string => {
    const opt = options.find((o) => o.value === value);
    return opt ? t(opt.labelKey) : (value ?? '');
  };

  const violations: ForeignViolationFormViolation[] = Array.isArray(form.violations)
    ? form.violations
    : [];
  const violationLabel = (code: string): string => {
    for (const group of EU_VIOLATION_GROUPS) {
      const item = group.items.find((i) => i.value === code);
      if (item) return t(item.labelKey);
    }
    return code;
  };
  const driverName = `${form.driverFirstName || ''} ${form.driverLastName || ''}`.trim();
  const additionalSanctions = (form.additionalSanctionCodes ?? []).map((code) =>
    labelOf(FOREIGN_VIOLATION_SANCTION_OPTIONS, code),
  );
  const p = (key: string) => t(`forms.foreign_violation.${key}`);

  return (
    <>
      <Section title={t('citizen.foreignViolationDetail.authoritiesSection')}>
        <Field label={t('citizen.foreignViolationDetail.performedBy')}>
          {[form.reportingAuthority, countryName(form.reportingCountryCode)]
            .filter(Boolean)
            .join(', ') || '—'}
        </Field>
        <Field label={t('citizen.foreignViolationDetail.createdBy')}>
          {dash(form.createdByAuthorityName)}
        </Field>
      </Section>

      <Section title={p('inspectionBasicInfo')}>
        <Field label={p('inspectionDate')}>{formatDate(form.inspectionDate?.slice(0, 10))}</Field>
        <Field label={p('inspectionTime')}>{dash(formatTime(form.inspectionTime))}</Field>
        <Field label={p('inspectionAddressLine1')}>{dash(form.inspectionAddressLine1)}</Field>
        <Field label={p('inspectionAddressLine2')}>{dash(form.inspectionAddressLine2)}</Field>
        <Field label={p('inspectionRegion')}>{dash(placeName(form.inspectionRegion, form.inspectionCountryCode))}</Field>
        <Field label={p('inspectionCity')}>{dash(placeName(form.inspectionCity, form.inspectionCountryCode))}</Field>
        <Field label={p('inspectionCountry')}>{dash(countryName(form.inspectionCountryCode))}</Field>
      </Section>

      <Section title={p('companyBasicInfo')}>
        <Field label={p('companyName')}>{dash(form.companyName)}</Field>
        <Field label={p('companyRegCode')}>{dash(form.companyRegCode)}</Field>
        <Field label={p('companyCountry')}>{dash(countryName(form.companyCountryCode))}</Field>
        <Field label={p('companyAddressLine1')}>{dash(form.companyAddressLine1)}</Field>
        <Field label={p('companyAddressLine2')}>{dash(placeName(form.companyAddressLine2, form.companyCountryCode))}</Field>
        <Field label={p('companyCity')}>{dash(placeName(form.companyCity, form.companyCountryCode))}</Field>
        <Field label={p('companyPostalCode')}>{dash(form.companyPostalCode)}</Field>
      </Section>

      <Section title={p('driverBasicInfo')}>
        <Field label={t('citizen.compoundDetail.driverName')}>{dash(driverName)}</Field>
      </Section>

      <Section title={p('vehicleBasicInfo')}>
        <Field label={p('vehicleRegNr')}>{dash(form.vehicleRegNr)}</Field>
        <Field label={p('vehicleMake')}>{dash(form.vehicleMake)}</Field>
        <Field label={p('vehicleModel')}>{dash(form.vehicleModel)}</Field>
        <Field label={p('vehicleCountry')}>{dash(countryName(form.vehicleCountryCode))}</Field>
        <Field label={p('vehicleVin')}>{dash(form.vehicleVin)}</Field>
        <Field label={p('vehicleFirstRegistration')}>
          {formatDate(form.vehicleFirstRegistration?.slice(0, 10))}
        </Field>
        <Field label={p('vehicleBodyType')}>{dash(form.vehicleBodyType)}</Field>
      </Section>

      <Section title={p('licenceCopyBasicInfo')}>
        <Field label={p('licenceCopyNumber')}>{dash(form.licenceCopyNumber)}</Field>
      </Section>

      <Section title={p('violationDescriptionBasicInfo')}>
        <Field label={p('violationDescription')}>{dash(form.violationDescription)}</Field>
        <Field label={p('minorViolationsCount')}>{dash(form.minorViolationsCount)}</Field>
      </Section>

      <Section title={p('euViolationsBasicInfo')} plain>
        {violations.length === 0 && <Text color="secondary">{t('citizen.foreignViolationDetail.noEuViolations')}</Text>}
        {violations.map((violation, index) => (
          <div key={`${violation.code}-${index}`} className="mb-1">
            <Heading element="h4">{violationLabel(violation.code)}</Heading>
            <FieldList>
            <Field label={p('sanctionCode')}>
              {dash(labelOf(FOREIGN_VIOLATION_SANCTION_OPTIONS, violation.sanctionCode))}
            </Field>
            {violation.sanctionNotes && (
              <Field label={p('sanctionNotes')}>{violation.sanctionNotes}</Field>
            )}
            <Field label={p('recommendedMeasureCode')}>
              {effectiveRecommendedMeasures(violation)
                .map((m) => labelOf(FOREIGN_VIOLATION_RECOMMENDED_MEASURE_OPTIONS, m))
                .join(', ')}
            </Field>
            {violation.recommendedMeasureNotes && (
              <Field label={p('recommendedMeasureNotes')}>{violation.recommendedMeasureNotes}</Field>
            )}
            </FieldList>
          </div>
        ))}
      </Section>

      {violations.length === 0 && (
        <Section title={p('sanctionBasicInfo')}>
          <Field label={p('sanctionCode')}>
            {dash(labelOf(FOREIGN_VIOLATION_SANCTION_OPTIONS, form.sanctionCode))}
          </Field>
          {additionalSanctions.length > 0 && (
            <Field label={p('additionalSanctions')}>{additionalSanctions.join(', ')}</Field>
          )}
          {form.sanctionNotes && <Field label={p('sanctionNotes')}>{form.sanctionNotes}</Field>}
          <Field label={p('recommendedMeasureCode')}>
            {dash(labelOf(FOREIGN_VIOLATION_RECOMMENDED_MEASURE_OPTIONS, form.recommendedMeasureCode))}
          </Field>
          {form.recommendedMeasureNotes && (
            <Field label={p('recommendedMeasureNotes')}>{form.recommendedMeasureNotes}</Field>
          )}
        </Section>
      )}

      {form.notes && (
        <Section title={p('recommendedMeasureGeneralNotes')} plain>
          <Text>{form.notes}</Text>
        </Section>
      )}
    </>
  );
}
