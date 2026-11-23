import { describe, expect, it } from 'vitest';
import {
  effectiveRecommendedMeasures,
  REQUESTED_PENALTY_TO_MEASURE,
} from './constants';

describe('REQUESTED_PENALTY_TO_MEASURE', () => {
  it.each([
    ['101', 'HOIATUS'],
    ['102', 'MUU'],
    ['301', 'TEGEVUSLOA_ARAKIRJADE_PEATAMINE'],
    ['302', 'MUU'],
    ['303', 'MUU'],
    ['304', 'TEGEVUSLUBA_KEHTETUKS'],
    ['305', 'JUHITUNNISTUSEST_KEELDUMINE'],
    ['306', 'JUHITUNNISTUS_KEHTETUKS'],
    ['307', 'MUU'],
  ])('ERRU kood %s -> %s', (code, measure) => {
    expect(REQUESTED_PENALTY_TO_MEASURE[code]).toBe(measure);
  });
});

describe('effectiveRecommendedMeasures', () => {
  it('eelistab sisestatud meedet', () => {
    expect(
      effectiveRecommendedMeasures({
        recommendedMeasureCode: 'OTSUS',
        requestedPenaltyCodes: ['101'],
      }),
    ).toEqual(['OTSUS']);
  });
  it('tuletab taotletud karistustest ja eemaldab korduvad', () => {
    expect(
      effectiveRecommendedMeasures({
        requestedPenaltyCodes: ['302', '303', '101'],
      }),
    ).toEqual(['MUU', 'HOIATUS']);
  });
  it('tundmatu kood annab MUU', () => {
    expect(
      effectiveRecommendedMeasures({ requestedPenaltyCodes: ['999'] }),
    ).toEqual(['MUU']);
  });
  it('taotluse puudumisel PUUDUVAD', () => {
    expect(effectiveRecommendedMeasures({})).toEqual(['PUUDUVAD']);
  });
});
