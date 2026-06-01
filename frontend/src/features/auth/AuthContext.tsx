import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from './types';
import { getUserInfo, logout as apiLogout } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  permissions: string[];
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  refetchUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getUserInfo();
      setUser(info);
      if (info?.permissions) {
        setPermissions(info.permissions.split(',').filter(Boolean));
      } else {
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((c) => permissions.includes(c)),
    [permissions],
  );

  const logoutUser = useCallback(async () => {
    await apiLogout();
    document.cookie = 'customJwtCookie=; Max-Age=0; Path=/;';
    setUser(null);
    setPermissions([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        permissions,
        hasPermission,
        hasAnyPermission,
        refetchUser: fetchUser,
        logout: logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
