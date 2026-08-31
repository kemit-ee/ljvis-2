import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Heading, Text } from '@tedi-design-system/react/tedi';
import { useAuth } from '../../../auth/AuthContext';
import type { RepresentedCompany } from '../../../auth/types';
import { CompanyCard } from './CompanyCard';
import { MyProtocolsTable } from './MyProtocolsTable';

/**
 * Citizen dashboard: two always-visible sections, independent of the
 * header's officer/kodanik view switch — "Minu ettevõtted" (one
 * CompanyCard per represented company, only rendered when the citizen
 * represents at least one) and "Minu protokollid" (own forms, always
 * shown even with zero represented companies). The same protocol can
 * legitimately appear in both sections at once, since each section queries
 * its own independent scope (POST/v1/citizen/forms/search.yml's
 * scope=company/self) rather than being gated by a single active role.
 */
export function CitizenDashboardPage() {
  const { t } = useTranslation();
  const { user, fetchRepresentationCompanies } = useAuth();
  // user.representedCompanies only reflects what's cached in the JWT — that
  // cache is populated lazily by representation/companies.yml, previously
  // only triggered by opening the header's "Esindan" dropdown. Since that
  // dropdown no longer lists companies at all (see useHeaderProps.tsx),
  // the dashboard must trigger the same lazy AR lookup itself on mount, or
  // a representative would see an empty "Minu ettevõtted" section on
  // first load until something else refreshed it.
  const [representedCompanies, setRepresentedCompanies] = useState<
    RepresentedCompany[]
  >(user?.representedCompanies ?? []);

  useEffect(() => {
    let cancelled = false;
    fetchRepresentationCompanies().then((result) => {
      if (!cancelled) setRepresentedCompanies(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-05">
      {representedCompanies.length > 0 && (
        <Card className="mb-1">
          <Card.Content>
            <Heading element="h1">
              {t('citizen.dashboard.companiesTitle')}
            </Heading>
            {representedCompanies.map((company) => (
              <CompanyCard
                key={company.registryCode}
                registryCode={company.registryCode}
                companyName={company.companyName}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Content>
          <div className="card-main">
            <Heading element="h1">
              {t('citizen.dashboard.protocolsTitle')}
            </Heading>
            <Text color="secondary">
              {t(
                'citizen.dashboard.protocolsSubtitle',
                'Vormid, kus olete osaline (juht, karistatud isik või usaldusväärsuse kontrolli subjekt).',
              )}
            </Text>
          </div>
          <MyProtocolsTable />
        </Card.Content>
      </Card>
    </div>
  );
}
