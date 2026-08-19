import { useCallback } from 'react';
import { useClassifiers } from './ClassifierProvider';

/**
 * Small convenience layer over useClassifiers() for the common "code -> Estonian label"
 * and "classifier -> Select options" lookups repeated across list/detail pages. Standardises
 * '—' for empty/unknown codes.
 */
export function useClassifierLabel() {
  const { getValue, getByCode } = useClassifiers();

  const label = useCallback(
    (classifierCode: string, code: string | null | undefined) =>
      code ? (getValue(classifierCode, code)?.name ?? code) : '—',
    [getValue],
  );

  const options = useCallback(
    (classifierCode: string) =>
      getByCode(classifierCode).map((c) => ({ value: c.code, label: c.name })),
    [getByCode],
  );

  return { label, options };
}
