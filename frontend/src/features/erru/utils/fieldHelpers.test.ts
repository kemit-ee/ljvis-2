import { describe, expect, it } from 'vitest';
import {
  classifierOptions,
  dateFieldError,
  fieldError,
  infringementOptions,
  nestedDateFieldError,
  nestedFieldError,
  parseIsoDate,
  pickOptionValue,
  selectedClassifierOption,
} from './fieldHelpers';

const list = [
  { code: 'VSI10', name: 'b' },
  { code: 'MSI101', name: 'a' },
  { code: 'VSI9', name: 'c' },
  { code: 'weird', name: 'd' },
];

describe('options', () => {
  it('maps classifiers to select options', () => {
    expect(classifierOptions(list)[0]).toEqual({ value: 'VSI10', label: 'b' });
    expect(selectedClassifierOption(list, 'MSI101')).toEqual({ value: 'MSI101', label: 'a' });
    expect(selectedClassifierOption(list, 'nope')).toBeNull();
  });
  it('sorts infringements by prefix then number', () => {
    expect(infringementOptions(list).map((o) => o.value)).toEqual(['MSI101', 'VSI9', 'VSI10', 'weird']);
    expect(infringementOptions(list)[0].label).toBe('MSI101 – a');
  });
  it('picks values and parses dates', () => {
    expect(pickOptionValue({ value: 'x' })).toBe('x');
    expect(pickOptionValue(null)).toBe('');
    expect(parseIsoDate()).toBeUndefined();
    expect(parseIsoDate('2024-01-02')).toBeInstanceOf(Date);
  });
});

describe('error helpers', () => {
  const formik = (touched: Record<string, unknown>, errors: Record<string, unknown>, submitCount = 0) => ({ touched, errors, submitCount });
  const helper = { helper: { text: 'bad', type: 'error' } };

  it('shows flat errors once touched or submitted', () => {
    expect(fieldError(formik({}, { a: 'bad' }), 'a')).toEqual({});
    expect(fieldError(formik({ a: true }, { a: 'bad' }), 'a')).toEqual(helper);
    expect(fieldError(formik({}, { a: 'bad' }, 1), 'a')).toEqual(helper);
    expect(dateFieldError(formik({ a: true }, { a: 'bad' }), 'a')).toEqual({ inputProps: helper });
    expect(dateFieldError(formik({ a: true }, {}), 'a')).toEqual({});
  });

  it('handles array fields', () => {
    const f = formik({ rows: [{ x: true }] }, { rows: [{ x: 'bad' }] });
    expect(nestedFieldError(f, 'rows', 0, 'x')).toEqual(helper);
    expect(nestedFieldError(f, 'rows', 1, 'x')).toEqual({});
    expect(nestedFieldError(formik({}, { rows: 'str' }), 'rows', 0, 'x')).toEqual({});
    expect(nestedFieldError(formik({}, { rows: [{ x: 'bad' }] }, 1), 'rows', 0, 'x')).toEqual(helper);
    expect(nestedDateFieldError(f, 'rows', 0, 'x')).toEqual({ inputProps: helper });
    expect(nestedDateFieldError(f, 'rows', 3, 'x')).toEqual({});
    expect(nestedDateFieldError(formik({}, {}), 'rows', 0, 'x')).toEqual({});
  });
});
