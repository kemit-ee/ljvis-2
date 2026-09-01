import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, RepresentationRole, RepresentedCompany } from './types';
import {
  getUserInfo,
  getRepresentationCompanies,
  switchRepresentation as apiSwitchRepresentation,
  logout as apiLogout,
} from './api';
import { setUnauthorizedHandler } from '../../shared/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  permissions: string[];
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  fetchRepresentationCompanies: () => Promise<RepresentedCompany[]>;
  switchRepresentation: (
    role: RepresentationRole,
    registryCode?: string,
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  refetchUser: async () => {},
  logout: async () => {},
  fetchRepresentationCompanies: async () => [],
  switchRepresentation: async () => false,
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
        setPermissions(
          Array.isArray(info.permissions)
            ? info.permissions.filter(Boolean)
            : (info.permissions as string).split(',').filter(Boolean),
        );
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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setPermissions([]);
    });
    return () => setUnauthorizedHandler(undefined);
  }, []);

  // Lazily fetches (and caches server-side, in the JWT) the companies the
  // current session's personal code may represent — called when the header
  // representation dropdown opens, not on every login.
  const fetchRepresentationCompanies = useCallback(async () => {
    return getRepresentationCompanies();
  }, []);

  const switchRepresentation = useCallback(
    async (role: RepresentationRole, registryCode?: string) => {
      const ok = await apiSwitchRepresentation(role, registryCode);
      if (ok) {
        await fetchUser();
      }
      return ok;
    },
    [fetchUser],
  );

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
        fetchRepresentationCompanies,
        switchRepresentation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
