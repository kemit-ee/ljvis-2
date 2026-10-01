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
