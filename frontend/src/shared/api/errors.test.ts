import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { ValidationError, applyValidationError } from './errors';

describe('ValidationError.from', () => {
  it('parses a valid body', () => {
    const ve = ValidationError.from({ type: 'VALIDATION_ERROR', code: 'c', field: 'f' });
    expect(ve).toMatchObject({ code: 'c', field: 'f' });
    expect(ValidationError.from({ type: 'VALIDATION_ERROR', code: 'c' })?.field).toBeNull();
  });

  it('rejects other bodies', () => {
    expect(ValidationError.from(null)).toBeNull();
    expect(ValidationError.from('x')).toBeNull();
    expect(ValidationError.from({ type: 'OTHER', code: 'c' })).toBeNull();
    expect(ValidationError.from({ type: 'VALIDATION_ERROR', code: 1 })).toBeNull();
  });
});

describe('applyValidationError', () => {
  const body = (field?: string) => ({ type: 'VALIDATION_ERROR', code: 'bad', field });
  const tr = (c: string) => `t:${c}`;

  it('ignores non-422 and non-ApiError', () => {
    const f = vi.fn();
    expect(applyValidationError(new Error('x'), f, tr)).toBe(false);
    expect(applyValidationError(new ApiError('x', 500, body('a')), f, tr)).toBe(false);
    expect(applyValidationError(new ApiError('x', 422, 'nope'), f, tr)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('sets field error when field is present', () => {
    const f = vi.fn();
    expect(applyValidationError(new ApiError('x', 422, body('a')), f, tr)).toBe(true);
    expect(f).toHaveBeenCalledWith('a', 't:bad');
  });

  it('sets form error when no field', () => {
    const f = vi.fn();
    const g = vi.fn();
    expect(applyValidationError(new ApiError('x', 422, body()), f, tr, g)).toBe(true);
    expect(g).toHaveBeenCalledWith('t:bad');
    expect(applyValidationError(new ApiError('x', 422, body()), f, tr)).toBe(true);
  });
});
