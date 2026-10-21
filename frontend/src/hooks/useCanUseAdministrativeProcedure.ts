import { useAuth } from '../features/auth/AuthContext';

/** Haldusmenetluse ploki ligipääsu otsustab server (sessioonivastuse `canUseAdministrativeProcedure`). */
export function useCanUseAdministrativeProcedure(): boolean {
  const { user } = useAuth();
  return user?.canUseAdministrativeProcedure === true;
}
