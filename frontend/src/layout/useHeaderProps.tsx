import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HeaderProps } from '@tedi-design-system/react/community';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  HeaderContent,
  HeaderLanguage,
  HeaderSettings,
  HeaderRole
} from '@tedi-design-system/react/community';
import { Row, StretchContent, Button } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/AuthContext';
import {BREAKPOINTS} from "../constants/constants";

const LANGUAGES = [
  { code: 'et', label: 'Eesti keeles' },
  { code: 'en', label: 'In English' },
  { code: 'ru', label: 'На русском' },
] as const;

export function useHeaderProps(): HeaderProps<'a'> {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const lang = i18n.language;
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

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
        {isDesktop && (
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
        )}
        <HeaderSettings
            onActionClick={logout}
            iconName="account_circle"
        >
          {!isDesktop ? () => (
              <div>
                {user && (
                    <div style={{borderBottom: '4px solid #005aa3'}}>
                      <HeaderRole
                          primaryInfo={`${user.firstname} ${user.lastname}`}
                          renderModal={true}
                          label=''
                      >
                        {() => (
                            <Button visualType="link"
                            >
                              {`${user?.firstname || ''} ${user?.lastname || ''}`.trim()}
                            </Button>
                        )}
                      </HeaderRole>
                    </div>
                )}
              </div>
          ) : undefined}
        </HeaderSettings>
      </React.Fragment>
    ),
    skipLinks: {
      links: [{ children: 'Skip to content', href: '#main-content' }],
    },
  };
}
