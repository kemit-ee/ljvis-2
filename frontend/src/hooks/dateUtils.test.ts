import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { completeDateOnBlur, maskDateInput, maskTimeInput } from './dateUtils';

describe('maskDateInput', () => {
  it('returns an empty string unchanged', () => {
    expect(maskDateInput('')).toBe('');
  });

  it('keeps the first two digits without a separator', () => {
    expect(maskDateInput('3')).toBe('3');
    expect(maskDateInput('31')).toBe('31');
  });

  it('inserts the first dot after the day', () => {
    expect(maskDateInput('313')).toBe('31.3');
    expect(maskDateInput('3103')).toBe('31.03');
  });

  it('inserts both dots once the year starts', () => {
    expect(maskDateInput('31032')).toBe('31.03.2');
    expect(maskDateInput('31032026')).toBe('31.03.2026');
  });

  it('is idempotent on already-formatted input', () => {
    expect(maskDateInput('31.03.2026')).toBe('31.03.2026');
  });

  it('handles backspace-style shortening', () => {
    expect(maskDateInput('31.03.202')).toBe('31.03.202');
    expect(maskDateInput('31.03.')).toBe('31.03');
  });

  it('drops non-digits and caps at 8 digits', () => {
    expect(maskDateInput('31/03/2026')).toBe('31.03.2026');
    expect(maskDateInput('310320269999')).toBe('31.03.2026');
  });
});

describe('completeDateOnBlur', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fills the current year for a day+month shorthand', () => {
    expect(completeDateOnBlur('12.09')).toBe('12.09.2026');
    expect(completeDateOnBlur('1209')).toBe('12.09.2026');
  });

  it('expands a two-digit year to the 2000s', () => {
    expect(completeDateOnBlur('031225')).toBe('03.12.2025');
    expect(completeDateOnBlur('03.12.25')).toBe('03.12.2025');
  });

  it('leaves a complete or genuinely partial entry alone', () => {
    expect(completeDateOnBlur('31.03.2026')).toBe('31.03.2026');
    expect(completeDateOnBlur('31.03.202')).toBe('31.03.202');
    expect(completeDateOnBlur('3')).toBe('3');
    expect(completeDateOnBlur('')).toBe('');
  });
});

describe('maskTimeInput', () => {
  it('returns an empty string unchanged', () => {
    expect(maskTimeInput('')).toBe('');
  });

  it('keeps the first two digits without a colon', () => {
    expect(maskTimeInput('1')).toBe('1');
    expect(maskTimeInput('12')).toBe('12');
  });

  it('inserts a colon after the hour', () => {
    expect(maskTimeInput('123')).toBe('12:3');
    expect(maskTimeInput('1200')).toBe('12:00');
  });

  it('is idempotent on already-formatted input', () => {
    expect(maskTimeInput('12:00')).toBe('12:00');
  });

  it('drops non-digits and caps at 4 digits', () => {
    expect(maskTimeInput('12.00')).toBe('12:00');
    expect(maskTimeInput('120099')).toBe('12:00');
  });
});
