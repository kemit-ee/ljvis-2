import { get } from '../../../../shared/api/client';

export interface OtherRoadValue {
  code: string;
  name: string;
}

/** Riigitee number: ainult numbrid, kuni 5 kohta (sama piirang mis Ruuteri route'il). */
export function normalizeRoadNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 5);
}

/**
 * Otsib ROAD_OTHER klassifikaatorist (muude riigiteede loetelu) kehtiva tee nime
 * numbri järgi. ROAD_OTHER (~3 200 väärtust) ei ole klassifikaatorite vahemälus
 * (`useClassifiers`), seega küsitakse üks tee korraga: GET /v1/roads/other.
 * Vaste puudumisel tagastab `undefined` — kasutaja sisestab nime käsitsi.
 */
export async function findOtherRoadName(
  roadNumber: string,
): Promise<string | undefined> {
  const number = roadNumber.trim();
  if (!/^\d{1,5}$/.test(number)) return undefined;
  const roads = await get<OtherRoadValue[]>('/v1/roads/other', { number });
  return roads?.find((road) => road.code === number)?.name;
}
