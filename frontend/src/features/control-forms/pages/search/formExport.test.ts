import { describe, expect, it } from 'vitest';
import { buildExportTable, toCsv } from './formExport';
import { labelHeaders } from './formExportLabels';

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
      'Juhi perekonnanimi',
      'Juhi eesnimi',
      'Juhi sünniaeg',
      'Juhi Eesti isikukood',
      'Juhi kodakondsus',
      'Juhi välisriigi isikukood',
      'Meeskonnaliikme perekonnanimi',
      'Meeskonnaliikme eesnimi',
      'Meeskonnaliikme sünniaeg',
      'Meeskonnaliikme Eesti isikukood',
      'Meeskonnaliikme kodakondsus',
      'Meeskonnaliikme välisriigi isikukood',
      'b',
    ]);
    expect(t.rows[0].slice(0, 7)).toEqual([1, 'Verka', 'Rudolf', '1996-06-23', '', 'PL', '']);
    expect(t.rows[0].slice(7, 13)).toEqual(['', '', '', '', '', '']);
  });

  it('fills teammate from the second entry', () => {
    const t = buildExportTable([row({ drivers: [rudolf, { ...rudolf, firstName: 'Ann' }] })]);
    expect(t.rows[0][t.headers.indexOf('Meeskonnaliikme eesnimi')]).toBe('Ann');
  });
});

describe('buildExportTable trailers', () => {
  it('adds trailer_reg_nr before the trailers JSON column', () => {
    const t = buildExportTable([
      row({ a: 1, trailers: [{ regNr: '123ABC' }, { reg_nr: '456DEF' }, { regNr: '' }] }),
      row({ a: 2, trailers: [] }),
    ]);
    expect(t.headers).toEqual(['a', 'Haagise reg-nr', 'Haagised (JSON)']);
    expect(t.rows[0][1]).toBe('123ABC, 456DEF');
    expect(t.rows[1][1]).toBe('');
    expect(t.rows[0][2]).toContain('"regNr":"123ABC"');
  });
});

describe('buildExportTable sub-form parent', () => {
  it('adds compound form fields to a sub-form row; own fields win', () => {
    const t = buildExportTable([
      {
        formType: 'vehicle_technical',
        formKey: 1,
        data: JSON.stringify({ sub_form_number: 'T-1', status: 'published', notes: 'own' }),
        parent: JSON.stringify({
          id: 9,
          form_number: 'K-1',
          status: 'saved',
          notes: 'parent',
          vehicle_reg_nr: '123ABC',
          vehicle_vin: 'VIN1',
          trailers: [{ regNr: 'T1' }],
        }),
      },
    ]);
    const get = (h: string) => t.rows[0][t.headers.indexOf(h)];
    expect(get('Olek')).toBe('published');
    expect(get('Märkused')).toBe('own');
    expect(get('Koondvormi nr')).toBe('K-1');
    expect(get('Koondvormi olek')).toBe('saved');
    expect(get('Sõiduki reg-nr')).toBe('123ABC');
    expect(get('Sõiduki VIN-kood')).toBe('VIN1');
    expect(get('Haagise reg-nr')).toBe('T1');
    expect(t.headers).not.toContain('Versiooni ID');
  });
});

describe('labelHeaders', () => {
  it('translates known keys, keeps unknown and disambiguates duplicates', () => {
    expect(labelHeaders(['vehicle_vin', 'mystery'])).toEqual(['Sõiduki VIN-kood', 'mystery']);
    expect(labelHeaders(['inspection_date', 'control_date'])).toEqual([
      'Kontrolli kuupäev (inspection_date)',
      'Kontrolli kuupäev (control_date)',
    ]);
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
