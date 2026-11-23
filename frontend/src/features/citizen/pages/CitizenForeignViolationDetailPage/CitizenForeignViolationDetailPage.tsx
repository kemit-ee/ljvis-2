import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heading, Text } from '@tedi-design-system/react/tedi';
import { FormNotFoundView } from '../../../../shared/components/FormNotFoundView';
import {
  getCitizenForeignViolationForm,
  type CitizenForeignViolationForm,
} from '../../api';
import { CitizenForeignViolationView } from './CitizenForeignViolationView';

/**
 * Read-only foreign_violation_form detail for a citizen company
 * representative, fed from GET/v1/citizen/forms/foreign-violation.yml.
 * Company scope only - see that endpoint's description for why citizen-self
 * isn't supported for this form type (no driver personal code stored on the
 * form). Rendered by CitizenForeignViolationView (a purpose-built, minimal
 * view) rather than the officer form component, so none of the officer's
 * internal fields reach the citizen and no officer-only requests are made.
 */
export function CitizenForeignViolationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [form, setForm] = useState<CitizenForeignViolationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getCitizenForeignViolationForm(Number(id))
      .then((data) => setForm(Array.isArray(data) ? data[0] : data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Text>{t('common.loading')}</Text>;
  if (notFound || !form)
    return <FormNotFoundView title={t('forms.foreign_violation_form')} />;

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">
          {form.formNumber || t('forms.foreign_violation_form')}
        </Heading>
      </div>

      <CitizenForeignViolationView form={form} />
    </div>
  );
}
