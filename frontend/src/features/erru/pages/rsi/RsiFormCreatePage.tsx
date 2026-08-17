import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useRsiForm } from './useRsiForm';
import { RsiMessageFields } from '../../components/Rsi/RsiMessageFields';
import { useAuth } from '../../../auth/AuthContext';

/**
 * New outgoing RSI message. Pre-fill from a published negative technical-check card
 * (LJVIS2-148 §4.1, "Lisa RSI teade") lands in a later stage — this page only supports
 * composing a blank draft by hand, per LJVIS2-147.
 */
export function RsiFormCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();

  const form = useRsiForm(undefined, (id) => navigate(id ? `/erru/rsi/${id}` : '/erru/rsi'));

  if (!hasAnyPermission(['rsi.create'])) return <Text>{t('common.forbidden')}</Text>;

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.rsi.form.titleNew')}</Heading>
        </Card.Content>
      </Card>

      <RsiMessageFields form={form} />

      {form.formError && <Text modifiers="bold">{form.formError}</Text>}
      {form.formik.submitCount > 0 && Object.keys(form.formik.errors).length > 0 && (
        <Text modifiers="bold">{t('erru.rsi.validation.formHasErrors')}</Text>
      )}

      <div className="page-actions">
        <div className="page-actions-buttons">
          <Button visualType="secondary" onClick={() => navigate('/erru/rsi')}>
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
