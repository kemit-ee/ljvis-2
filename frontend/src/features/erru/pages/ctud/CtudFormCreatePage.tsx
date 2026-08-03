import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useCtudForm } from './useCtudForm';
import { CtudRequestFields } from '../../components/Ctud/CtudRequestFields';
import { useAuth } from '../../../auth/AuthContext';

/**
 * New outgoing CTUD request. The draft is filled in manually — unlike CGR there is no
 * pre-fill from a control form and no "copy request" action. Saving leaves the request
 * in status "Algatatud"; sending happens from the detail view.
 */
export function CtudFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  const form = useCtudForm(undefined, (id) =>
    navigate(id ? `/erru/ctud/${id}` : '/erru/ctud'),
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

      {form.formError && <Text modifiers="bold">{form.formError}</Text>}

      <div className="page-actions">
        <div className="page-actions-buttons">
          <Button visualType="secondary" onClick={() => navigate('/erru/ctud')}>
            {t('common.back')}
          </Button>
          <Button type="submit" disabled={form.formik.isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
