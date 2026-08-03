import { useTranslation } from 'react-i18next';
import {
  LabelProvider,
  PrintingProvider,
} from '@tedi-design-system/react/tedi';
import type { ReactNode } from 'react';

export type TediLocale = 'et' | 'en';

export function AppProviders({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.substring(0, 2) as TediLocale) || 'et';

  return (
    <LabelProvider locale={locale}>
      <PrintingProvider>{children}</PrintingProvider>
    </LabelProvider>
  );
}
