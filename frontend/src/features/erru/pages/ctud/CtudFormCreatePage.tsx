import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useCtudForm } from './useCtudForm';
import { CtudRequestFields } from '../../components/Ctud/CtudRequestFields';
import { useAuth } from '../../../auth/AuthContext';

/**
 * New outgoing CTUD request. The draft is created and immediately sent in one step —
 * unlike the edit view there is no intermediate "Algatatud" draft; the send happens
 * atomically after a successful create inside useCtudForm (sendAfterCreate option).
 */
export function CtudFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  const form = useCtudForm(
    undefined,
    (id) => navigate(id ? `/erru/ctud/${id}` : '/erru/ctud'),
    { sendAfterCreate: true },
  );

  if (!hasAnyPermission(['ctud.create']))
    return <Text>{t('common.forbidden')}</Text>;

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.ctud.form.titleNew')}</Heading>
        </Card.Content>
      </Card>

      <CtudRequestFields form={form} />

      {form.formError && (
        <Alert type="danger" size="small" className="mt-05">
          {form.formError}
        </Alert>
      )}
      {form.formik.submitCount > 0 && Object.keys(form.formik.errors).length > 0 && (
        <Alert type="danger" size="small" className="mt-05">
          {t('common.formHasErrors')}
        </Alert>
      )}

      <div className="page-actions">
        <div className="page-actions-buttons">
          <Button visualType="secondary" onClick={() => navigate('/erru/ctud')}>
            {t('erru.ctud.form.backToList')}
          </Button>
          <Button type="submit" disabled={form.formik.isSubmitting}>
            {t('erru.ctud.form.send')}
          </Button>
        </div>
      </div>
    </form>
  );
}
