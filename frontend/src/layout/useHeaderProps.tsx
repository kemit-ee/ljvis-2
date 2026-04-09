import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HeaderProps } from '@tedi-design-system/react/community';
import {
  HeaderContent,
  HeaderLanguage,
  HeaderSettings,
} from '@tedi-design-system/react/community';
import { Row, StretchContent } from '@tedi-design-system/react/tedi';
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
      imageUrl: '/assets/kemit-logo.svg',
      anchorProps: { href: '/' },
    },
    children: (
      <React.Fragment key=".0">
        <HeaderContent>
          <StretchContent direction="horizontal">
            <Row alignItems="center" justifyContent="end" gap={3} />
          </StretchContent>
        </HeaderContent>
        <HeaderLanguage
          languages={LANGUAGES.map((l) => ({
            label: l.label,
            isSelected: lang === l.code || lang.startsWith(l.code),
            onClick: async ({ onToggle }: { onToggle: (open: boolean) => void }) => {
              await i18n.changeLanguage(l.code);
              onToggle(false);
            },
          }))}
        />
        <HeaderSettings
          onActionClick={logout}
          iconName="account_circle"
        >
          {() => (
            <div style={{ padding: '0.75rem' }}>
              {user && (
                <p style={{ margin: 0, fontWeight: 500 }}>
                  {user.firstname} {user.lastname}
                </p>
              )}
            </div>
          )}
        </HeaderSettings>
      </React.Fragment>
    ),
    skipLinks: {
      links: [{ children: 'Skip to content', href: '#main-content' }],
    },
  };
}
