import { useTranslation } from 'react-i18next';
import { Alert, Heading } from '@tedi-design-system/react/tedi';

interface FormNotFoundViewProps {
  title: string;
}

/**
 * Generic "form not found / failed to load" view used on form detail pages
 * instead of a bare error text, so the user still sees the form-type header.
 * Navigation back up the hierarchy is handled by the layout's breadcrumbs.
 */
export function FormNotFoundView({ title }: FormNotFoundViewProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">{title}</Heading>
      </div>

      <Alert icon="error" type="danger" size="small">
        {t('common.error')}
      </Alert>
    </div>
  );
}
