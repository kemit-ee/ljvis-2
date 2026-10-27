import { describe, expect, it } from 'vitest';
import { fromClassifierBundleValue, fromClassifierValueData } from './adapters';

describe('fromClassifierValueData', () => {
  it('täidab puuduvad väljad vaikeväärtustega', () => {
    const e = fromClassifierValueData({
      classifierValueKey: 1,
      classifierCode: 'C',
      code: 'A',
      name: 'Nimi',
      parentKey: null,
    });
    expect(e.isValid).toBe(true);
    expect(e.formTypes).toEqual([]);
    expect(e.parentKey).toBeNull();
  });

  it('säilitab antud väärtused', () => {
    const e = fromClassifierValueData({
      classifierValueKey: 1,
      classifierCode: 'C',
      code: 'A',
      name: 'Nimi',
      parentKey: 5,
      isValid: false,
      formTypes: ['X'],
    });
    expect(e).toMatchObject({ parentKey: 5, isValid: false, formTypes: ['X'] });
  });
});

describe('fromClassifierBundleValue', () => {
  it('kaardistab bundle väärtuse', () => {
    const e = fromClassifierBundleValue({
      classifierId: 1,
      classifierCode: 'C',
      classifierName: 'Klass',
      classifierValueId: 9,
      parentKey: null,
      code: 'A',
      name: 'N',
      validFrom: '2020-01-01',
      validUntil: null,
      isValid: true,
    });
    expect(e.classifierValueKey).toBe(9);
    expect(e.classifierName).toBe('Klass');
    expect(e.formTypes).toEqual([]);
  });
});
