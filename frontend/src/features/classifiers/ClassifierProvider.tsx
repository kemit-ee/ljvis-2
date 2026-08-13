import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listClassifierValues } from '../classifier-values/api';
import { fromClassifierValueData } from './adapters';
import type { ClassifierEntry } from './types';

interface ClassifierContextValue {
  values: ClassifierEntry[];
  loading: boolean;
  /** All values for a given classifier code (e.g. 'DRIVING_VIOLATION'). */
  getByCode: (classifierCode: string) => ClassifierEntry[];
  /** A single value by classifier code + value code. */
  getValue: (
    classifierCode: string,
    code: string,
  ) => ClassifierEntry | undefined;
  /** Direct children of a given parent value key within a classifier. */
  getChildren: (
    classifierCode: string,
    parentKey: number | null,
  ) => ClassifierEntry[];
  refetch: () => Promise<void>;
}

const ClassifierContext = createContext<ClassifierContextValue>({
  values: [],
  loading: true,
  getByCode: () => [],
  getValue: () => undefined,
  getChildren: () => [],
  refetch: async () => {},
});

export function ClassifierProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [values, setValues] = useState<ClassifierEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchValues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listClassifierValues();
      setValues(data.map(fromClassifierValueData));
    } catch (e) {
      console.error('Failed to load classifier values', e);
      setValues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchValues();
    } else {
      setValues([]);
      setLoading(false);
    }
  }, [user, fetchValues]);

  const getByCode = useCallback(
    (classifierCode: string) =>
      values.filter((v) => v.classifierCode === classifierCode),
    [values],
  );

  const getValue = useCallback(
    (classifierCode: string, code: string) =>
      values.find(
        (v) => v.classifierCode === classifierCode && v.code === code,
      ),
    [values],
  );

  const getChildren = useCallback(
    (classifierCode: string, parentKey: number | null) =>
      values.filter(
        (v) => v.classifierCode === classifierCode && v.parentKey === parentKey,
      ),
    [values],
  );

  const contextValue = useMemo(
    () => ({
      values,
      loading,
      getByCode,
      getValue,
      getChildren,
      refetch: fetchValues,
    }),
    [values, loading, getByCode, getValue, getChildren, fetchValues],
  );

  return (
    <ClassifierContext.Provider value={contextValue}>
      {children}
    </ClassifierContext.Provider>
  );
}

export function useClassifiers(): ClassifierContextValue {
  return useContext(ClassifierContext);
}
