import React, { useEffect, useState } from 'react';
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
import type { RepresentedCompany } from '../features/auth/types';
import type { TediLocale } from '../AppProviders';
import { BREAKPOINTS } from '../constants/constants';
import './useHeaderProps.css';

const LANGUAGES: { code: TediLocale; label: string }[] = [
  { code: 'et', label: 'ET' },
  { code: 'en', label: 'EN' },
];

/** "Esindan" role switcher content, shared between the desktop and mobile HeaderRole. */
function RepresentationMenu({ onToggle }: { onToggle: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { user, fetchRepresentationCompanies, switchRepresentation } =
    useAuth();
  const [companies, setCompanies] = useState<RepresentedCompany[]>(
    user?.representedCompanies ?? [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchRepresentationCompanies().then((result) => {
      if (!cancelled) setCompanies(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (
    role: 'officer' | 'citizen-self' | 'company',
    registryCode?: string,
  ) => {
    await switchRepresentation(role, registryCode);
    onToggle(false);
  };

  return (
    <div className="header-role-menu">
      {user?.officerAvailable && (
        <Button
          visualType="link"
          className={
            user?.activeRole === 'officer' ? 'header-role-menu-item-active' : ''
          }
          onClick={() => handleSelect('officer')}
        >
          {t('auth.roleOfficer', 'Ametnik')}
        </Button>
      )}
      <Button
        visualType="link"
        className={
          user?.activeRole === 'citizen-self'
            ? 'header-role-menu-item-active'
            : ''
        }
        onClick={() => handleSelect('citizen-self')}
      >
        {t('auth.roleCitizenSelf', 'Füüsiline isik')}
      </Button>
      {companies.map((company) => (
        <Button
          key={company.registryCode}
          visualType="link"
          className={
            user?.activeRole === 'company' &&
            user?.activeRegistryCode === company.registryCode
              ? 'header-role-menu-item-active'
              : ''
          }
          onClick={() => handleSelect('company', company.registryCode)}
        >
          {company.companyName}
        </Button>
      ))}
    </div>
  );
}

export function useHeaderProps(): HeaderProps<'a'> {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.slice(0, 2);

  const activeCompanyName =
    user?.activeRole === 'company'
      ? user.representedCompanies.find(
          (c) => c.registryCode === user.activeRegistryCode,
        )?.companyName
      : undefined;
  const displayName =
    activeCompanyName ||
    `${user?.firstname || ''} ${user?.lastname || ''}`.trim() ||
    user?.personalcode ||
    '';

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
          <HeaderRole primaryInfo={displayName} label={t('auth.roleLabel', 'Esindan')}>
            {({ onToggle }) => <RepresentationMenu onToggle={onToggle} />}
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
                        label={t('auth.roleLabel', 'Esindan')}
                      >
                        {({ onToggle }) => (
                          <RepresentationMenu onToggle={onToggle} />
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
