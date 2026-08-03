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
import { listClassifierValues } from '../classifier-values/api';
import type { ClassifierValueData } from '../classifier-values/types';
import { setUnauthorizedHandler } from '../../shared/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  permissions: string[];
  classifierValues: ClassifierValueData[];
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  permissions: [],
  classifierValues: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  refetchUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [classifierValues, setClassifierValues] = useState<ClassifierValueData[]>([]);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const [info, classifierData] = await Promise.all([
        getUserInfo(),
        listClassifierValues(),
      ]);
      setUser(info);
      setClassifierValues(classifierData);
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
      setClassifierValues([]);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        permissions,
        classifierValues,
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
