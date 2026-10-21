import { describe, expect, it } from 'vitest';
import { buildFormScopeOptions, filterForForm, isAvailableForForm } from './formScope';
import type { ClassifierEntry } from './types';

const entry = (over: Partial<ClassifierEntry>): ClassifierEntry => ({
  classifierValueKey: 1,
  classifierCode: 'X',
  code: 'A',
  name: 'A',
  parentKey: null,
  isValid: true,
  formTypes: [],
  ...over,
});

describe('isAvailableForForm', () => {
  it('tühi formTypes = lubatud kõigil vormidel', () => {
    expect(isAvailableForForm(entry({ formTypes: [] }), 'TI_KONTROLLKAART')).toBe(true);
  });

  it('piiratud väärtus on lubatud ainult loetletud vormidel', () => {
    const e = entry({ formTypes: ['TI_KONTROLLKAART'] });
    expect(isAvailableForForm(e, 'TI_KONTROLLKAART')).toBe(true);
    expect(isAvailableForForm(e, 'SP_DRIVER_FORM')).toBe(false);
  });

  it('filterForForm jätab piiramata väärtused alles', () => {
    const list = [
      entry({ code: 'ALL' }),
      entry({ code: 'TI', formTypes: ['TI_KONTROLLKAART'] }),
      entry({ code: 'PPA', formTypes: ['SP_DRIVER_FORM', 'SP_TEAMMATE_FORM'] }),
    ];
    expect(filterForForm(list, 'SP_DRIVER_FORM').map((e) => e.code)).toEqual(['ALL', 'PPA']);
  });
});

describe('buildFormScopeOptions', () => {
  const labels = {
    parentOwn: (name: string) => `${name} (üld)`,
    orphan: (code: string) => `${code}?`,
  };
  const formTypes = [
    entry({ classifierValueKey: 1, code: 'TI_KONTROLLKAART', name: 'TI' }),
    entry({ classifierValueKey: 2, code: 'SP_COMPOUND', name: 'SP' }),
    entry({ classifierValueKey: 3, code: 'SP_DRIVER_FORM', name: 'Autojuht', parentKey: 2 }),
    entry({ classifierValueKey: 4, code: 'OLD', name: 'Aegunud', isValid: false }),
  ];

  it('vanem koos alamvormidega on rühm, vanem ise on rühma esimene valik', () => {
    const opts = buildFormScopeOptions(formTypes, [], labels);
    expect(opts).toEqual([
      { value: 'TI_KONTROLLKAART', label: 'TI' },
      {
        label: 'SP',
        options: [
          { value: 'SP_COMPOUND', label: 'SP (üld)' },
          { value: 'SP_DRIVER_FORM', label: 'Autojuht' },
        ],
      },
    ]);
  });

  it('aegunud vormitüüp kuvatakse ainult siis, kui see on juba valitud; tundmatu kood lõpus', () => {
    const opts = buildFormScopeOptions(formTypes, ['OLD', 'GONE'], labels);
    expect(opts).toContainEqual({ value: 'OLD', label: 'Aegunud' });
    expect(opts[opts.length - 1]).toEqual({ value: 'GONE', label: 'GONE?' });
  });
});
