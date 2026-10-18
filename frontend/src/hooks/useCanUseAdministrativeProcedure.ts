import { useAuth } from '../features/auth/AuthContext';
import { useIsAdmin } from './useIsAdmin';

/**
 * Haldusmenetluse plokk on Transpordiameti ja Kliimaministeeriumi ametnikule
 * ning administraatorile (süsteemi- või asutuse oma, ka PPA asutuse admin).
 * PPA tavaametnik seda ei näe.
 */
export const ADMINISTRATIVE_PROCEDURE_ORGANISATIONS = ['TRAM', 'KLIM'];

export function useCanUseAdministrativeProcedure(): boolean {
  const { user, hasAnyPermission } = useAuth();
  const isSystemAdmin = useIsAdmin();
  const isOrganisationAdmin = hasAnyPermission([
    'user.edit.admin',
    'user.edit.local',
  ]);
  return (
    isSystemAdmin ||
    isOrganisationAdmin ||
    ADMINISTRATIVE_PROCEDURE_ORGANISATIONS.includes(
      user?.organisationcode ?? '',
    )
  );
}
