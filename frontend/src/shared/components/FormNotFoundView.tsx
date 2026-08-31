import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Heading } from '@tedi-design-system/react/tedi';

interface FormNotFoundViewProps {
  title: string;
}

/**
 * Generic "form not found / failed to load" view used on form detail pages
 * instead of a bare error text, so the user still sees the form-type header
 * and a way back.
 */
export function FormNotFoundView({ title }: FormNotFoundViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <Button visualType="link" onClick={() => navigate('/')} iconLeft="arrow_back">
        {t('common.back')}
      </Button>

      <div className="card-main">
        <Heading element="h1">{title}</Heading>
      </div>

      <Alert icon="error" type="danger" size="small">
        {t('common.error')}
      </Alert>
    </div>
  );
}
