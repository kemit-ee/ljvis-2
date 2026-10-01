import { describe, expect, it } from 'vitest';
import { buildExportTable, toCsv } from './formExport';

const row = (data: object) => ({ formType: 'adr', formKey: 1, data: JSON.stringify(data) });

describe('buildExportTable', () => {
  it('uses the union of keys in first-seen order and blanks missing values', () => {
    const t = buildExportTable([row({ a: 1, b: 'x' }), row({ b: 'y', c: true })]);
    expect(t.headers).toEqual(['a', 'b', 'c']);
    expect(t.rows).toEqual([[1, 'x', ''], ['', 'y', true]]);
  });

  it('serialises nested values as JSON text', () => {
    const t = buildExportTable([row({ violations: [{ code: 'MSI1' }], n: null })]);
    expect(t.rows[0]).toEqual(['[{"code":"MSI1"}]', '']);
  });
});

describe('buildExportTable drivers', () => {
  const rudolf = {
    lastName: 'Verka',
    birthDate: '1996-06-23',
    firstName: 'Rudolf',
    personalCodeEe: '',
    citizenshipCode: 'PL',
    personalCodeForeign: '',
  };

  it('splits driver and teammate into separate columns in place of drivers', () => {
    const t = buildExportTable([row({ a: 1, drivers: [rudolf], b: 2 })]);
    expect(t.headers).toEqual([
      'a',
      'driver_last_name',
      'driver_first_name',
      'driver_birth_date',
      'driver_personal_code_ee',
      'driver_citizenship_code',
      'driver_personal_code_foreign',
      'teammate_last_name',
      'teammate_first_name',
      'teammate_birth_date',
      'teammate_personal_code_ee',
      'teammate_citizenship_code',
      'teammate_personal_code_foreign',
      'b',
    ]);
    expect(t.rows[0].slice(0, 7)).toEqual([1, 'Verka', 'Rudolf', '1996-06-23', '', 'PL', '']);
    expect(t.rows[0].slice(7, 13)).toEqual(['', '', '', '', '', '']);
  });

  it('fills teammate from the second entry', () => {
    const t = buildExportTable([row({ drivers: [rudolf, { ...rudolf, firstName: 'Ann' }] })]);
    expect(t.rows[0][t.headers.indexOf('teammate_first_name')]).toBe('Ann');
  });
});

describe('toCsv', () => {
  it('quotes separators, quotes and newlines', () => {
    const csv = toCsv({ headers: ['h'], rows: [['a;b'], ['say "hi"'], ['l1\nl2']] });
    expect(csv).toBe('h\r\n"a;b"\r\n"say ""hi"""\r\n"l1\nl2"');
  });

  it('neutralises formula-looking text but keeps negative numbers', () => {
    const csv = toCsv({ headers: ['h'], rows: [['=1+1'], [-5], ['-5']] });
    expect(csv).toBe("h\r\n'=1+1\r\n-5\r\n-5");
  });
});
