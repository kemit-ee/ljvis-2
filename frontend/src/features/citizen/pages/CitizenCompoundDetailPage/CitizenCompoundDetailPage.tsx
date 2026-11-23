import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { CompoundForm } from '../../../control-forms/types';
import { getCitizenCompoundForm, getCitizenCompoundSubForms } from '../../api';
import type { CitizenSubForm } from '../../types';
import { formatDate } from '../../../../hooks/dateUtils';
import { CitizenSubFormsSection } from './CitizenSubFormsSection';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-name mb-1">
      <Text modifiers="bold" color="secondary">
        {label}
      </Text>
      <div className="mt-025">{children}</div>
    </div>
  );
}

// Extras added by GET/v1/citizen/forms/compound.yml (compound-header.sql).
type CitizenCompoundForm = CompoundForm & {
  authorityName?: string | null;
  teammateFirstName?: string | null;
  teammateLastName?: string | null;
};

// '12:30:00' -> '12.30'
function formatTime(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[1].padStart(2, '0')}.${match[2]}` : '';
}

function fullName(first?: string | null, last?: string | null): string {
  return `${first || ''} ${last || ''}`.trim();
}

/**
 * Read-only compound_form (koondvorm) summary for a citizen representative
 * or self-view. Unlike LabourInspectionFormFields, CompoundFormPage has no
 * readOnly rendering mode (it's a large officer editor with many
 * permission-gated sub-form flows) — rebuilding that whole page for citizen
 * read-only use isn't warranted, so this is a purpose-built, simplified
 * summary card instead of a field-for-field replica.
 */
export function CitizenCompoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [form, setForm] = useState<CitizenCompoundForm | null>(null);
  const [subForms, setSubForms] = useState<CitizenSubForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getCitizenCompoundForm(Number(id))
      .then((data) => setForm(Array.isArray(data) ? data[0] : data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // Fetched independently of the main form request — a sub-forms fetch
    // failure (e.g. transient error) shouldn't block the page from showing
    // the koondvorm itself; it just renders an empty sub-forms section.
    getCitizenCompoundSubForms(Number(id))
      .then(setSubForms)
      .catch(() => setSubForms([]));
  }, [id]);

  const teammateName =
    fullName(form?.teammateFirstName, form?.teammateLastName) ||
    fullName(form?.drivers?.[1]?.firstName, form?.drivers?.[1]?.lastName);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.compound_form')} />;

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">
          {form.formNumber || t('forms.compound_form')}
        </Heading>
      </div>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h3">
            {t('citizen.compoundDetail.controlSection')}
          </Heading>
          <div className="mt-05">
            <Field label={t('citizen.compoundDetail.controlDate')}>
              {[formatDate(form.controlDate?.slice(0, 10)), formatTime(form.controlTime)]
                .filter((part) => part && part !== '—')
                .join(' ') || '—'}
            </Field>
            <Field label={t('citizen.compoundDetail.authority')}>
              {form.authorityName || '—'}
            </Field>
            <Field label={t('citizen.compoundDetail.driverName')}>
              {fullName(form.drivers?.[0]?.firstName, form.drivers?.[0]?.lastName) || '—'}
            </Field>
            {teammateName && (
              <Field label={t('citizen.compoundDetail.teammateName')}>
                {teammateName}
              </Field>
            )}
            <Field label={t('citizen.compoundDetail.vehicleRegNr')}>
              {form.vehicleRegNr || '—'}
            </Field>
            {form.roadTaxStatus && (
              <Field label={t('citizen.compoundDetail.roadTax')}>
                {form.roadTaxStatus}
                {form.roadTaxNotes ? ` – ${form.roadTaxNotes}` : ''}
              </Field>
            )}
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h3">
            {t('citizen.compoundDetail.companySection')}
          </Heading>
          <div className="mt-05">
            <Field label={t('citizen.compoundDetail.companyName')}>
              {form.companyName || '—'}
            </Field>
            <Field
              label={t('citizen.compoundDetail.companyRegCode', 'Registrikood')}
            >
              {form.companyRegCode || '—'}
            </Field>
          </div>
        </Card.Content>
      </Card>

      <CitizenSubFormsSection subForms={subForms} />
    </div>
  );
}
