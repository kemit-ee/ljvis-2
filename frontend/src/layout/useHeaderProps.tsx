import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HeaderProps } from '@tedi-design-system/react/community';
import {
  HeaderContent,
  HeaderLanguage,
  HeaderSettings,
  HeaderRole
} from '@tedi-design-system/react/community';
import { Row, StretchContent, Button } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/AuthContext';

const LANGUAGES = [
  { code: 'et', label: 'Eesti keeles' },
  { code: 'en', label: 'In English' },
  { code: 'ru', label: 'На русском' },
] as const;

export function useHeaderProps(): HeaderProps<'a'> {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const lang = i18n.language;

  return {
    logo: {
      imageUrl: '/assets/klim_logo.svg'
    },
    children: (
      <React.Fragment key=".0">
        <HeaderContent>
          <StretchContent direction="horizontal">
            <Row alignItems="center" justifyContent="end" gap={3} />
          </StretchContent>
        </HeaderContent>
          <HeaderRole
              primaryInfo={`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
          >
            {() => (
                  <Button visualType="link"
                  >
                    {`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
                  </Button>
            )}
          </HeaderRole>
        <HeaderSettings onActionClick={logout}>
        </HeaderSettings>
      </React.Fragment>
    ),
    skipLinks: {
      links: [{ children: 'Skip to content', href: '#main-content' }],
    },
  };
}
