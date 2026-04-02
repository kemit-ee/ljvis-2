import type { FooterProps } from '@tedi-design-system/react/community';
import { useTranslation } from 'react-i18next';

export function useFooterProps(): FooterProps {
  const { t } = useTranslation();

  return {
    categories: [
      {
        heading: t('footer.copyright'),
        elements: [],
      },
    ],
  };
}
