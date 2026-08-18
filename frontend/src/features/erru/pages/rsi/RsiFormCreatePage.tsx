import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Heading, Text } from '@tedi-design-system/react/tedi';
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
  const prevSubmitCount = useRef(0);

  const form = useRsiForm(undefined, (id) =>
    navigate(id ? `/erru/rsi/${id}` : '/erru/rsi', { state: { justSaved: true } }),
  );

  useEffect(() => {
    const count = form.formik.submitCount;
    if (count > prevSubmitCount.current && Object.keys(form.formik.errors).length > 0) {
      prevSubmitCount.current = count;
      setTimeout(() => {
        const first =
          document.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          document.querySelector<HTMLElement>('[class*="feedback-text--error"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [form.formik.submitCount, form.formik.errors]);

  if (!hasAnyPermission(['rsi.create'])) return <Text>{t('common.forbidden')}</Text>;

  return (
    <form onSubmit={form.formik.handleSubmit}>
      <Card className="mt-05">
        <Card.Content>
          <Heading element="h1">{t('erru.rsi.form.titleNew')}</Heading>
        </Card.Content>
      </Card>

      <RsiMessageFields form={form} />

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
