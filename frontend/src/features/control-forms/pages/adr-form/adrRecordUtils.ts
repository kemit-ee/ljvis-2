import type { AdrInfringementRecord } from '../../types';

export const EMPTY_ADR_RECORD: AdrInfringementRecord = {
  riskCategory: '',
  adrReference: '',
  responsibleParticipants: [],
  reg2016403Code: null,
  reg2016403Severity: null,
};

/** ADR_CONTROL_CHECKPOINT tase-2 klassifikaatori kood "RL10_P17" -> "10". */
export function regNumberFromCode(code: string): string {
  const m = code.match(/^RL0*(\d+)_/);
  return m ? m[1] : code;
}

/**
 * "ADR Kontrollkaardi tehniline suunis" p 6 / p 9.11: määruse (EL) 2016/403
 * rikkumisliik täidetakse ainult siis, kui vastutavaks osalejaks on valitud
 * vedaja (C). Kui vedaja eemaldatakse, tühjendatakse liik ja raskusaste.
 */
export function normalizeAdrRecord(rec: AdrInfringementRecord): AdrInfringementRecord {
  if (!rec.responsibleParticipants.includes('C') && rec.reg2016403Code != null) {
    return { ...rec, reg2016403Code: null, reg2016403Severity: null };
  }
  return rec;
}
