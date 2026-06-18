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

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}
