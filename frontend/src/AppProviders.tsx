import { useTranslation } from 'react-i18next';
import { LabelProvider } from '@tedi-design-system/react/tedi';
import type { ReactNode } from 'react';

type TediLocale = 'et' | 'en' | 'ru';

export function AppProviders({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.substring(0, 2) as TediLocale) || 'et';

  return (
    <LabelProvider locale={locale}>
      {children}
    </LabelProvider>
  );
}
