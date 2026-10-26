// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  buildSortString,
  decodeHtmlEntities,
  sanitizeDecimalInput,
  toSnakeCase,
  useSearchHandler,
} from './stringUtils';

describe('toSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('createdAtDate')).toBe('created_at_date');
    expect(toSnakeCase('name')).toBe('name');
  });
});

describe('buildSortString', () => {
  it('uses the default when sorting is empty', () => {
    expect(buildSortString([])).toBe('name asc');
    expect(buildSortString([], 'id desc')).toBe('id desc');
  });

  it('builds from the first sorting entry', () => {
    expect(buildSortString([{ id: 'createdAt', desc: true }])).toBe('created_at desc');
    expect(buildSortString([{ id: 'code', desc: false }])).toBe('code asc');
  });
});

describe('useSearchHandler', () => {
  it('applies search only for length >= 3 or empty and resets page', () => {
    const setSearch = vi.fn();
    const setPagination = vi.fn();
    const { result } = renderHook(() => useSearchHandler(setSearch, setPagination));

    result.current('ab');
    expect(setSearch).not.toHaveBeenCalled();

    result.current('abc');
    expect(setSearch).toHaveBeenCalledWith('abc');
    const updater = setPagination.mock.calls[0][0];
    expect(updater({ pageIndex: 4, pageSize: 20 })).toEqual({ pageIndex: 0, pageSize: 20 });

    result.current('');
    expect(setSearch).toHaveBeenCalledWith('');
  });
});

describe('sanitizeDecimalInput', () => {
  it('strips invalid characters and leading separators/zeros', () => {
    expect(sanitizeDecimalInput('a1b')).toBe('1');
    expect(sanitizeDecimalInput(',5')).toBe('5');
    expect(sanitizeDecimalInput('05')).toBe('5');
  });

  it('keeps only the first separator when comma and dot are mixed', () => {
    expect(sanitizeDecimalInput('1,2.3')).toBe('1,23');
    expect(sanitizeDecimalInput('1.2,3')).toBe('1.23');
  });

  it('handles single separator kinds', () => {
    expect(sanitizeDecimalInput('1,2,3')).toBe('1,23');
    expect(sanitizeDecimalInput('1.2.3')).toBe('1.23');
    expect(sanitizeDecimalInput('123')).toBe('123');
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes known entities', () => {
    expect(decodeHtmlEntities('&quot;a&quot; &#x27;b&#x27; &#x3D; &amp;')).toBe('"a" \'b\' = &');
  });

  it('returns empty string for empty input', () => {
    expect(decodeHtmlEntities('')).toBe('');
  });
});
