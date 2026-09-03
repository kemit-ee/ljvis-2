import { describe, it, expect } from 'vitest';
import { regNumberFromCode, normalizeAdrRecord, EMPTY_ADR_RECORD } from './adrRecordUtils';
import type { AdrInfringementRecord } from '../../types';

describe('regNumberFromCode', () => {
  it('eraldab 2016/403 numbri koodist RL<nr>_<Pnn>', () => {
    expect(regNumberFromCode('RL10_P17')).toBe('10');
    expect(regNumberFromCode('RL02_P17')).toBe('2');
    expect(regNumberFromCode('RL24_P13')).toBe('24');
  });
  it('sama liik erineva punkti all annab sama numbri', () => {
    expect(regNumberFromCode('RL10_P17')).toBe(regNumberFromCode('RL10_P19'));
    expect(regNumberFromCode('RL23_P21')).toBe(regNumberFromCode('RL23_P23'));
  });
  it('tundmatu kuju tagastatakse muutmata', () => {
    expect(regNumberFromCode('NONE')).toBe('NONE');
  });
});

describe('normalizeAdrRecord', () => {
  const withReg: AdrInfringementRecord = {
    ...EMPTY_ADR_RECORD,
    responsibleParticipants: ['P'],
    reg2016403Code: '10',
    reg2016403Severity: 'VSI',
  };

  it('tühjendab 2016/403 liigi ja raskusastme, kui vedaja (C) ei ole vastutav osaleja', () => {
    const out = normalizeAdrRecord(withReg);
    expect(out.reg2016403Code).toBeNull();
    expect(out.reg2016403Severity).toBeNull();
  });

  it('säilitab 2016/403 liigi, kui vedaja (C) on vastutav osaleja', () => {
    const out = normalizeAdrRecord({ ...withReg, responsibleParticipants: ['C', 'P'] });
    expect(out.reg2016403Code).toBe('10');
    expect(out.reg2016403Severity).toBe('VSI');
  });

  it('ei muuda kirjet, kus 2016/403 liiki pole seatud', () => {
    const rec = { ...EMPTY_ADR_RECORD, responsibleParticipants: ['P' as const] };
    expect(normalizeAdrRecord(rec)).toEqual(rec);
  });
});
