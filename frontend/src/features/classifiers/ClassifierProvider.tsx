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
import { filterForForm } from './formScope';
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
  /** Valid COUNTRY entries that are EU ERRU member states, sorted alphabetically by name. */
  getErruMemberCountries: () => ClassifierEntry[];
  refetch: () => Promise<void>;
}

const EMPTY_CONTEXT: ClassifierContextValue = {
  values: [],
  loading: true,
  getByCode: () => [],
  getValue: () => undefined,
  getChildren: () => [],
  getErruMemberCountries: () => [],
  refetch: async () => {},
};

const ClassifierContext = createContext<ClassifierContextValue>(EMPTY_CONTEXT);

/**
 * Filtreerimata kontekst. ClassifierScopeProvider arvutab oma vaate alati sellest,
 * et pesastatud skoop (nt koondvormi sees alamvorm) ei filtreeriks juba
 * filtreeritud nimekirja.
 */
const RootClassifierContext = createContext<ClassifierContextValue>(EMPTY_CONTEXT);

const getByCodeFrom = (values: ClassifierEntry[], classifierCode: string) => {
  const seen = new Set<string>();
  return values.filter((v) => {
    if (v.classifierCode !== classifierCode) return false;
    if (seen.has(v.code)) return false;
    seen.add(v.code);
    return true;
  });
};

const getChildrenFrom = (
  values: ClassifierEntry[],
  classifierCode: string,
  parentKey: number | null,
) =>
  values.filter(
    (v) => v.classifierCode === classifierCode && v.parentKey === parentKey,
  );

export function ClassifierProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [values, setValues] = useState<ClassifierEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isCitizen = user?.activeRole !== 'officer';

  const fetchValues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listClassifierValues(isCitizen);
      setValues(data.map(fromClassifierValueData));
    } catch (e) {
      console.error('Failed to load classifier values', e);
      setValues([]);
    } finally {
      setLoading(false);
    }
  }, [isCitizen]);

  useEffect(() => {
    if (user) {
      fetchValues();
    } else {
      setValues([]);
      setLoading(false);
    }
  }, [user, fetchValues]);

  const getByCode = useCallback(
    (classifierCode: string) => getByCodeFrom(values, classifierCode),
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
      getChildrenFrom(values, classifierCode, parentKey),
    [values],
  );

  const getErruMemberCountries = useCallback(
    () =>
      values
        .filter(
          (v) =>
            v.classifierCode === 'ERRU_MEMBER' &&
            v.isValid !== false,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [values],
  );

  const contextValue = useMemo(
    () => ({
      values,
      loading,
      getByCode,
      getValue,
      getChildren,
      getErruMemberCountries,
      refetch: fetchValues,
    }),
    [values, loading, getByCode, getValue, getChildren, getErruMemberCountries, fetchValues],
  );

  return (
    <RootClassifierContext.Provider value={contextValue}>
      <ClassifierContext.Provider value={contextValue}>
        {children}
      </ClassifierContext.Provider>
    </RootClassifierContext.Provider>
  );
}

export function useClassifiers(): ClassifierContextValue {
  return useContext(ClassifierContext);
}

const ScopeActivationContext = createContext<(active: boolean) => void>(() => {});

/**
 * ADR-011: piirab sees olevate komponentide `getByCode()` / `getChildren()` / `values`
 * vastu FORM_TYPE koodile `formType` (väärtused, millel `formTypes` on tühi, jäävad alati
 * alles). `getValue()` (sildid) jääb filtreerimata, et varem salvestatud väärtuse nimi
 * kuvatakse ka siis, kui väärtus on hiljem vormilt piiratud.
 *
 * Filter kehtib ainult muutmisrežiimis — vaaterežiimis ehitavad vormid silte samadest
 * nimekirjadest (sama loogika nagu aegunud väärtuste `isValid !== false` filtril):
 *  - `active` antud → fikseeritud (nt alamvormi muutmiskomponent: alati `true`);
 *  - `active` puudub → leht lülitab ise `useClassifierScopeActive(isEditActive)`-ga;
 *    vaikimisi filtrit pole.
 */
export function ClassifierScopeProvider({
  formType,
  active,
  children,
}: {
  formType: string;
  active?: boolean;
  children: ReactNode;
}) {
  const root = useContext(RootClassifierContext);
  const [registeredActive, setRegisteredActive] = useState(false);
  const effectiveActive = active ?? registeredActive;

  const scoped = useMemo<ClassifierContextValue>(() => {
    if (!effectiveActive) return root;
    const scopedValues = filterForForm(root.values, formType);
    return {
      ...root,
      values: scopedValues,
      getByCode: (classifierCode) => getByCodeFrom(scopedValues, classifierCode),
      getChildren: (classifierCode, parentKey) =>
        getChildrenFrom(scopedValues, classifierCode, parentKey),
    };
  }, [root, formType, effectiveActive]);

  return (
    <ScopeActivationContext.Provider value={setRegisteredActive}>
      <ClassifierContext.Provider value={scoped}>{children}</ClassifierContext.Provider>
    </ScopeActivationContext.Provider>
  );
}

/**
 * Lülitab lähima ClassifierScopeProvider'i filtri sisse/välja (vt ADR-011).
 * Kutsuda lehekomponendis, mis teab oma muutmisrežiimi.
 */
export function useClassifierScopeActive(active: boolean): void {
  const setActive = useContext(ScopeActivationContext);
  useEffect(() => {
    setActive(active);
    return () => setActive(false);
  }, [active, setActive]);
}
