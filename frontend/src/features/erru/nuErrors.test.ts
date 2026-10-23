import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { ncrSendErrorMessage } from './ncrErrors';
import { nuErrorDetails, nuErrorMessage } from './nuErrors';

const t = (key: string) => key;
const err = (body: unknown) => new ApiError('x', 422, body);

describe('nuErrorDetails', () => {
  it('ignores non-ApiError values', () => {
    expect(nuErrorDetails(new Error('x'))).toEqual({});
  });
  it('reads code and field from an object body', () => {
    expect(nuErrorDetails(err({ code: 'required', field: 'tmFirstName' }))).toEqual({
      code: 'required',
      field: 'tmFirstName',
    });
    expect(nuErrorDetails(err({ code: 1, field: 2 }))).toEqual({ code: undefined, field: undefined });
  });
  it('parses serialised JSON bodies and tolerates garbage', () => {
    expect(nuErrorDetails(err('{"code":"required"}')).code).toBe('required');
    expect(nuErrorDetails(err('not json'))).toEqual({});
    expect(nuErrorDetails(err(null))).toEqual({});
    expect(nuErrorDetails(err('"str"'))).toEqual({});
  });
});

describe('nuErrorMessage', () => {
  it('falls back for unknown codes', () => {
    expect(nuErrorMessage(err({ code: 'weird' }), t)).toBe('common.errors.unexpected');
    expect(nuErrorMessage(err({}), t, 'custom')).toBe('custom');
  });
  it('translates known codes, prefixing source fields', () => {
    expect(nuErrorMessage(err({ code: 'required' }), t)).toBe('erru.nu.validation.required');
    expect(nuErrorMessage(err({ code: 'required', field: 'unknownField' }), t)).toBe(
      'erru.nu.validation.required',
    );
    expect(nuErrorMessage(err({ code: 'required', field: 'tmFirstName' }), t)).toBe(
      'erru.nu.form.tmFirstName: erru.nu.validation.required',
    );
  });
  it('uses source_not_found for source lookups', () => {
    expect(nuErrorMessage(err({ code: 'not_found' }), t, undefined, true)).toBe(
      'erru.nu.validation.source_not_found',
    );
  });
});

describe('ncrSendErrorMessage', () => {
  it('maps known codes and defaults to sendFailed', () => {
    expect(ncrSendErrorMessage(err({ code: 'send_unknown' }), t)).toBe('erru.ncr.form.sendUnknown');
    expect(ncrSendErrorMessage(err({ code: 'other' }), t)).toBe('erru.ncr.form.sendFailed');
    expect(ncrSendErrorMessage(new Error('x'), t)).toBe('erru.ncr.form.sendFailed');
  });
});
