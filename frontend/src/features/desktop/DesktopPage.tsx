import { useTranslation } from 'react-i18next';
import { Heading } from '@tedi-design-system/react/tedi';

export function DesktopPage() {
  const { t } = useTranslation();


  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Heading element="h1">{t('desktop.title')}</Heading>
        </div>
    </div>
  );
}
