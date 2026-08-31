import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import type { CompoundForm } from '../../../control-forms/types';
import { getCitizenCompoundForm } from '../../api';
import styles from './CitizenCompoundDetailPage.module.css';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.field}>
      <Text modifiers="bold" color="secondary">
        {label}
      </Text>
      <Text>{value || '—'}</Text>
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

  const [form, setForm] = useState<CompoundForm | null>(null);
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
  }, [id]);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.compound_form')} />;

  return (
    <div>
      <Button
        visualType="link"
        onClick={() => navigate('/minu-ettevotte')}
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
          <div className={styles.grid}>
            <Field
              label={t('citizen.compoundDetail.controlDate')}
              value={form.controlDate}
            />
            <Field
              label={t('citizen.compoundDetail.county')}
              value={form.county}
            />
            <Field
              label={t('citizen.compoundDetail.address')}
              value={form.address}
            />
            <Field
              label={t('citizen.compoundDetail.vehicleRegNr')}
              value={form.vehicleRegNr}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mt-05">
        <Card.Content>
          <Heading element="h3">
            {t('citizen.compoundDetail.companySection')}
          </Heading>
          <div className={styles.grid}>
            <Field
              label={t('citizen.compoundDetail.companyName')}
              value={form.companyName}
            />
            <Field
              label={t(
                'citizen.compoundDetail.companyRegCode',
                'Registrikood',
              )}
              value={form.companyRegCode}
            />
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
            <div key={index} className={styles.grid}>
              <Field
                label={t('citizen.compoundDetail.driverName')}
                value={`${driver.firstName || ''} ${driver.lastName || ''}`.trim()}
              />
              <Field
                label={t(
                  'citizen.compoundDetail.driverPersonalCode',
                  'Isikukood',
                )}
                value={driver.personalCodeEe || driver.personalCodeForeign}
              />
            </div>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}
