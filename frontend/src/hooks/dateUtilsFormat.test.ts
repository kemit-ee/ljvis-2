import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, toIsoDate, toIsoTime } from './dateUtils';

describe('formatDate', () => {
  it('formats ISO dates as dd.MM.yyyy', () => {
    expect(formatDate('2026-03-31')).toBe('31.03.2026');
  });
  it('handles empty and non-ISO values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('foo')).toBe('foo');
  });
});

describe('formatDateTime', () => {
  it('formats a valid datetime in local time', () => {
    expect(formatDateTime('2026-03-31T09:05:00')).toBe('31.03.2026 09:05');
  });
  it('handles empty and invalid values', () => {
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('nope')).toBe('nope');
  });
});

describe('toIsoDate', () => {
  it('handles Date, dayjs-like, primitives and empty', () => {
    expect(toIsoDate(new Date(2026, 2, 5))).toBe('2026-03-05');
    expect(toIsoDate({ $isDayjsObject: true, format: (f: string) => `fmt:${f}` })).toBe('fmt:YYYY-MM-DD');
    expect(toIsoDate('2026-01-01')).toBe('2026-01-01');
    expect(toIsoDate(null)).toBe('');
  });
});

describe('toIsoTime', () => {
  it('handles Date, dayjs-like, primitives and empty', () => {
    expect(toIsoTime(new Date(2026, 0, 1, 7, 4))).toBe('07:04:00');
    expect(toIsoTime({ $isDayjsObject: true, hour: () => 13, minute: () => 2 })).toBe('13:02:00');
    expect(toIsoTime('10:00')).toBe('10:00');
    expect(toIsoTime(undefined)).toBe('');
  });
});
