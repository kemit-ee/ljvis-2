import type { Dispatch, SetStateAction } from 'react';
import type { PaginationState, SortingState } from '@tanstack/react-table';

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function buildSortString(
  sorting: SortingState,
  defaultSort = 'name asc',
): string {
  return sorting.length
    ? `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`
    : defaultSort;
}

export function useSearchHandler(
  setSearch: Dispatch<SetStateAction<string>>,
  setPagination: Dispatch<SetStateAction<PaginationState>>,
) {
  return (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };
}

export function sanitizeDecimalInput(v: string): string {
  const stripped = v
    .replace(/[^0-9.,]/g, '')
    .replace(/^[.,]/, '')
    .replace(/^0(\d)/, '$1');
  const commaIdx = stripped.indexOf(',');
  const dotIdx = stripped.indexOf('.');
  if (commaIdx !== -1 && dotIdx !== -1) {
    const sepIdx = Math.min(commaIdx, dotIdx);
    const sep = stripped[sepIdx];
    const integer = stripped.slice(0, sepIdx);
    const decimal = stripped.slice(sepIdx + 1).replace(/[.,]/g, '');
    return integer + sep + decimal;
  } else if (commaIdx !== -1) {
    const integer = stripped.slice(0, commaIdx);
    const decimal = stripped.slice(commaIdx + 1).replace(/,/g, '');
    return integer + ',' + decimal;
  } else if (dotIdx !== -1) {
    const integer = stripped.slice(0, dotIdx);
    const decimal = stripped.slice(dotIdx + 1).replace(/\./g, '');
    return integer + '.' + decimal;
  }
  return stripped;
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}
