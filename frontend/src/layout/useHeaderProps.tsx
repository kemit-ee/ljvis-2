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

/**
 * Officer <-> Kodanik view switcher, shared between the desktop and mobile
 * HeaderRole. The citizen dashboard shows every represented
 * company's data at once (independent of activeRole — see
 * CitizenDashboardPage/forms/search.yml's scope param), so there's no more
 * "which company am I representing right now" choice to make here — only
 * whether to view LJVIS as an officer or as a citizen.
 *
 * Always rendered (see useHeaderProps below), even for a pure citizen with
 * no officer account: with no dropdown content at all, TEDI's HeaderRole
 * silently falls back to plain, non-interactive text (no chevron, no
 * click target) which reads as a half-broken control next to the officer
 * variant's proper dropdown. Showing a single, already-active "Kodanik"
 * entry keeps the same dropdown affordance for every user — it's just not
 * actionable when there's nothing to switch to.
 */
function RepresentationMenu({
  officerAvailable,
  onToggle,
}: {
  officerAvailable: boolean;
  onToggle: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user, switchRepresentation } = useAuth();

  const handleSelect = async (role: 'officer' | 'citizen-self') => {
    await switchRepresentation(role);
    onToggle(false);
  };

  if (!officerAvailable) {
    return (
      <div className="header-role-menu">
        <Button
          visualType="link"
          className="header-role-menu-item-active"
          disabled
        >
          {t('auth.roleCitizen')}
        </Button>
      </div>
    );
  }

  return (
    <div className="header-role-menu">
      <Button
        visualType="link"
        className={
          user?.activeRole === 'officer' ? 'header-role-menu-item-active' : ''
        }
        onClick={() => handleSelect('officer')}
      >
        {t('auth.roleOfficer')}
      </Button>
      <Button
        visualType="link"
        className={
          user?.activeRole !== 'officer' ? 'header-role-menu-item-active' : ''
        }
        onClick={() => handleSelect('citizen-self')}
      >
        {t('auth.roleCitizen')}
      </Button>
    </div>
  );
}

export function useHeaderProps(): HeaderProps<'a'> {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.slice(0, 2);

  const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
  // Officer view just shows the officer's name. Every other case (citizen
  // dashboard — activeRole is only ever 'officer' or 'citizen-self' now,
  // there's no more per-company "Esindan" choice) shows the person's own
  // name + personal code — otherwise this would just be blank/the raw
  // isikukood for a citizen with no officer account.
  const selfDisplayName =
    user?.activeRole !== 'officer' && fullName && user?.personalcode
      ? `${fullName} (${user.personalcode})`
      : fullName;
  const displayName = selfDisplayName || user?.personalcode || '';

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
        {isDesktop && user && (
          <HeaderRole primaryInfo={displayName} label={t('auth.roleLabel')}>
            {({ onToggle }) => (
              <RepresentationMenu
                officerAvailable={user.officerAvailable}
                onToggle={onToggle}
              />
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
                        primaryInfo={displayName}
                        renderModal={true}
                        label={t('auth.roleLabel')}
                      >
                        {({ onToggle }) => (
                          <RepresentationMenu
                            officerAvailable={user.officerAvailable}
                            onToggle={onToggle}
                          />
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
