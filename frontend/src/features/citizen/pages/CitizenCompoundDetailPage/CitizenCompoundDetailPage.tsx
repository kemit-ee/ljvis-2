import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { CompoundForm } from '../../../control-forms/types';
import { getCitizenCompoundForm, getCitizenCompoundSubForms } from '../../api';
import type { CitizenSubForm } from '../../types';
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
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<CompoundForm | null>(null);
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

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.compound_form')} />;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => {
          // Reachable from both the dashboard (MyProtocolsTable/
          // CompanyControlsTable) and /my-companies (CompanyFormsListPage) —
          // both entry points pass state.from so we return to wherever the
          // citizen actually came from, not a hardcoded page. Direct URL/
          // bookmark access has no such state, so fall back to the
          // dashboard.
          if ((location.state as { from?: string })?.from === 'citizen-app') {
            navigate(-1);
          } else {
            navigate('/');
          }
        }}
        iconLeft="arrow_back"
      >
        {t('common.back')}
      </Button>

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
              {form.controlDate || '—'}
            </Field>
            <Field label={t('citizen.compoundDetail.county')}>
              {form.county || '—'}
            </Field>
            <Field label={t('citizen.compoundDetail.address')}>
              {form.address || '—'}
            </Field>
            <Field label={t('citizen.compoundDetail.vehicleRegNr')}>
              {form.vehicleRegNr || '—'}
            </Field>
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

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h3">
            {t('citizen.compoundDetail.driversSection')}
          </Heading>
          {(form.drivers ?? []).length === 0 && (
            <Text color="secondary">
              {t('citizen.compoundDetail.noDrivers')}
            </Text>
          )}
          {(form.drivers ?? []).map((driver, index) => (
            <div key={index} className="mt-05">
              <Field label={t('citizen.compoundDetail.driverName')}>
                {`${driver.firstName || ''} ${driver.lastName || ''}`.trim() ||
                  '—'}
              </Field>
              <Field
                label={t(
                  'citizen.compoundDetail.driverPersonalCode',
                  'Isikukood',
                )}
              >
                {driver.personalCodeEe || driver.personalCodeForeign || '—'}
              </Field>
            </div>
          ))}
        </Card.Content>
      </Card>

      <CitizenSubFormsSection subForms={subForms} />
    </div>
  );
}
