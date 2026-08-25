import { useAuth } from '../features/auth/AuthContext';
import { isAdminUser } from '../features/control-forms/hooks/useSubFormEditActive';

export function useIsAdmin(): boolean {
  const { hasPermission } = useAuth();
  return isAdminUser(hasPermission);
}
