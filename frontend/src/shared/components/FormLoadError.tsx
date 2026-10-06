import { useTranslation } from 'react-i18next';
import { Alert } from '@tedi-design-system/react/tedi';
import { recentFormLoadStatus } from '../api/formLoadStatus';

/**
 * Shown where a form page could not load its form. Tells the user whether they lack the right to
 * see the form (403) or the form does not exist (404); anything else keeps the generic message.
 */
export function FormLoadError() {
  const { t } = useTranslation();
  const status = recentFormLoadStatus();

  if (status === 403) {
    return (
      <Alert icon="lock" type="warning" size="small">
        <strong>{t('common.errors.formForbiddenTitle')}</strong>
        <br />
        {t('common.errors.formForbidden')}
      </Alert>
    );
  }
  if (status === 404) {
    return (
      <Alert icon="info" type="info" size="small">
        {t('common.errors.formNotFound')}
      </Alert>
    );
  }
  return (
    <Alert icon="error" type="danger" size="small">
      {t('common.error')}
    </Alert>
  );
}
