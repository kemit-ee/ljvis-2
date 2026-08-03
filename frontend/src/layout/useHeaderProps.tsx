import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HeaderProps } from '@tedi-design-system/react/community';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  HeaderContent,
  HeaderLanguage,
  HeaderSettings,
  HeaderRole,
} from '@tedi-design-system/react/community';
import { Row, StretchContent, Button } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/useAuth';
import type { TediLocale } from '../AppProviders';
import { BREAKPOINTS } from '../constants/constants';
import './useHeaderProps.css';

const LANGUAGES: { code: TediLocale; label: string }[] = [
  { code: 'et', label: 'ET' },
  { code: 'en', label: 'EN' },
];

export function useHeaderProps(): HeaderProps<'a'> {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.slice(0, 2);

  return {
    logo: {
      imageUrl: '/assets/klim_logo.svg',
    },
    children: (
      <React.Fragment key=".0">
        <HeaderContent>
          <StretchContent direction="horizontal">
            <Row alignItems="center" justifyContent="end" gap={3}>
              <HeaderLanguage
                languages={LANGUAGES.map(({ code, label }) => ({
                  label,
                  isSelected: currentLang === code,
                  'aria-label': label,
                  onClick: ({ onToggle }) => {
                    i18n.changeLanguage(code);
                    onToggle(false);
                  },
                }))}
              />
            </Row>
          </StretchContent>
        </HeaderContent>
        {isDesktop && (
          <HeaderRole
            primaryInfo={`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
          >
            {() => (
              <Button visualType="link">
                {`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
              </Button>
            )}
          </HeaderRole>
        )}
        <HeaderSettings onActionClick={logout} iconName="account_circle">
          {!isDesktop
            ? () => (
                <div>
                  {user && (
                    <div className="header-role-border">
                      <HeaderRole
                        primaryInfo={`${user.firstname} ${user.lastname}`}
                        renderModal={true}
                        label=""
                      >
                        {() => (
                          <Button visualType="link">
                            {`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
                          </Button>
                        )}
                      </HeaderRole>
                    </div>
                  )}
                </div>
              )
            : undefined}
        </HeaderSettings>
      </React.Fragment>
    ),
    skipLinks: {
      links: [{ children: 'Skip to content', href: '#main-content' }],
    },
  };
}
