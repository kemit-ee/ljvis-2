import { useAuth } from '../features/auth/AuthContext';
import { useIsAdmin } from './useIsAdmin';

/** Haldusmenetluse plokk on Transpordiameti ja Kliimaministeeriumi ametnikule (ja administraatorile); PPA ametnik seda ei näe. */
export const ADMINISTRATIVE_PROCEDURE_ORGANISATIONS = ['TRAM', 'KLIM'];

export function useCanUseAdministrativeProcedure(): boolean {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  return (
    isAdmin ||
    ADMINISTRATIVE_PROCEDURE_ORGANISATIONS.includes(user?.organisationcode ?? '')
  );
}
