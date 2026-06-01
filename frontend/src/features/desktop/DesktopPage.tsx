import { useTranslation } from 'react-i18next';
import { Heading } from '@tedi-design-system/react/tedi';

export function DesktopPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="card-main">
        <Heading element="h1">{t('desktop.title')}</Heading>
      </div>
    </div>
  );
}
