import { describe, it, expect } from 'vitest';
import {
  regNumberFromCode,
  infringementCodeFromName,
  composeInfringementNotes,
  normalizeAdrRecord,
  EMPTY_ADR_RECORD,
} from './adrRecordUtils';
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

describe('infringementCodeFromName', () => {
  it('eraldab ametliku koodi nime algusest', () => {
    expect(infringementCodeFromName('VSI 856 – veetava aine kohta puudub teave')).toBe('VSI 856');
    expect(infringementCodeFromName('MSI 401 – selliste ohtlike veoste vedu')).toBe('MSI 401');
    expect(infringementCodeFromName('SI 937 – sõiduki ja/või mahuti etiketid')).toBe('SI 937');
  });
  it('tagastab tühja stringi, kui nimi ei alga koodiga', () => {
    expect(infringementCodeFromName('10 – Veoühikus lubatud koguse piirangut')).toBe('');
    expect(infringementCodeFromName('')).toBe('');
  });
});

describe('composeInfringementNotes', () => {
  it('koostab koondteksti kujul "<pealkiri>, Rikkumine <n>: <tekst>; ..."', () => {
    const out = composeInfringementNotes([
      { label: '12. Veodokumendid', records: [{ notes: 'puudu' }] },
      { label: '16. Veoks lubatud kaubad', records: [{ notes: 'a' }, { notes: 'b' }] },
    ]);
    expect(out).toBe(
      '12. Veodokumendid, Rikkumine 1: puudu; 16. Veoks lubatud kaubad, Rikkumine 1: a, Rikkumine 2: b',
    );
  });
  it('jätab välja tühjade märkustega kirjed ja plokid ning säilitab kirjete numeratsiooni', () => {
    const out = composeInfringementNotes([
      { label: 'A', records: [{ notes: '' }, { notes: '  ' }] },
      { label: 'B', records: [{ notes: '' }, { notes: 'teine' }] },
    ]);
    expect(out).toBe('B, Rikkumine 2: teine');
  });
  it('tagastab tühja stringi, kui ühtki märkust pole', () => {
    expect(composeInfringementNotes([{ label: 'A', records: [{}] }])).toBe('');
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
