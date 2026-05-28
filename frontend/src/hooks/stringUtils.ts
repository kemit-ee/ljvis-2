import type { Dispatch, SetStateAction } from 'react';
import type { PaginationState } from '@tanstack/react-table';

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function useSearchHandler(
  setSearch: Dispatch<SetStateAction<string>>,
  setPagination: Dispatch<SetStateAction<PaginationState>>
) {
  return (value: string) => {
    if (value.length >= 3 || value.length === 0) {
      setSearch(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };
}
