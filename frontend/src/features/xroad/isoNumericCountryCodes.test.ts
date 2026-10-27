import { describe, expect, it } from 'vitest';
import { mapRrCitizenshipToCountryCode } from './isoNumericCountryCodes';

describe('mapRrCitizenshipToCountryCode', () => {
  it('numbriline kood', () => {
    expect(mapRrCitizenshipToCountryCode('233')).toBe('EE');
  });
  it('eesolevate nullideta kood', () => {
    expect(mapRrCitizenshipToCountryCode('4')).toBe('AF');
  });
  it('XX koodis või nimes', () => {
    expect(mapRrCitizenshipToCountryCode('xx')).toBe('XX');
    expect(mapRrCitizenshipToCountryCode('', 'XX')).toBe('XX');
  });
  it('tühi või tundmatu', () => {
    expect(mapRrCitizenshipToCountryCode()).toBe('');
    expect(mapRrCitizenshipToCountryCode('999')).toBe('');
  });
});
