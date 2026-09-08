import type { AdrInfringementRecord } from '../../types';

export const EMPTY_ADR_RECORD: AdrInfringementRecord = {
  riskCategory: '',
  adrReference: '',
  responsibleParticipants: [],
  reg2016403Code: null,
  reg2016403Severity: null,
  notes: '',
};

/**
 * Koostab kontrollkaardi märkuste välja kirjutuskaitstud koondteksti kõigi
 * rikkumiskirjete märkustest, kujul:
 *   "12. Veodokumendid, Rikkumine 1: tekst; 16. Veoks lubatud kaubad, Rikkumine 1: tekst, Rikkumine 2: tekst"
 * Ilma märkusteta kirjed ja plokid jäetakse välja.
 */
export function composeInfringementNotes(
  groups: { label: string; records: { notes?: string }[] }[],
): string {
  return groups
    .map(({ label, records }) => {
      const parts = records
        .map((r, i) => ({ i, text: (r.notes ?? '').trim() }))
        .filter((r) => r.text !== '')
        .map((r) => `Rikkumine ${r.i + 1}: ${r.text}`);
      return parts.length ? `${label}, ${parts.join(', ')}` : '';
    })
    .filter((s) => s !== '')
    .join('; ');
}

/** ADR_CONTROL_CHECKPOINT tase-2 klassifikaatori kood "RL10_P17" -> "10". */
export function regNumberFromCode(code: string): string {
  const m = code.match(/^RL0*(\d+)_/);
  return m ? m[1] : code;
}

/**
 * ADR_CONTROL_CHECKPOINT tase-2 nime algusest ametlik rikkumise kood
 * (määruse lisa 2 riskikategooriate tabel), nt
 * "VSI 856 – veetava aine kohta ..." -> "VSI 856".
 * Kui nimi ei alga koodiga, tagastatakse tühi string.
 */
export function infringementCodeFromName(name: string): string {
  const m = name.match(/^(MSI|VSI|SI)\s?(\d+)\b/);
  return m ? `${m[1]} ${m[2]}` : '';
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
