import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useNcrRequestForm } from './useNcrRequestForm';
import { NcrRequestFields } from '../../components/Ncr/NcrRequestFields';
import { useAuth } from '../../../auth/AuthContext';

/**
 * New outgoing NCR request ("Uus rikkumisteade", LJVIS2-65 §4). Unlike the SP/TH
 * control-form eeltäitmine (LJVIS2-64 §4.1), this composes a completely blank draft —
 * no fields are pre-filled.
 */
export function NcrFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  const form = useNcrRequestForm(undefined, (businessCaseId) =>
    navigate(businessCaseId ? `/erru/ncr/${businessCaseId}` : '/erru/ncr'),
  );

  if (!hasAnyPermission(['ncr.create'])) return <Text>{t('common.forbidden')}</Text>;

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.ncr.list.newMessage')}</Heading>
        </Card.Content>
      </Card>

      <NcrRequestFields form={form} />

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
          <Button visualType="secondary" onClick={() => navigate('/erru/ncr')}>
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
