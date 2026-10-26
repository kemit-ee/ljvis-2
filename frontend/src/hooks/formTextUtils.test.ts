import { describe, it, expect } from 'vitest';
import { sanitizeText } from './formTextUtils';

describe('sanitizeText', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('replaces newlines with a single space and trims', () => {
    expect(sanitizeText('  a\r\nb\n\nc  ')).toBe('a b c');
  });

  it('collapses consecutive spaces', () => {
    expect(sanitizeText('a    b')).toBe('a b');
  });
});
