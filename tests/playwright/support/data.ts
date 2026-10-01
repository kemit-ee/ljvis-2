import { randomInt } from 'node:crypto';

/**
 * Testandmete generaatorid. Haldusmoodulite specid loovad ainult unikaalseid
 * kirjeid (seemnega loodud gruppe/kasutajaid ei muudeta), et kordusjooksud ja
 * `KEEP_STACK=1` ei põrkuks varasemate andmetega.
 */

/** Jooksu-unikaalne lühike tunnus nimede ja koodide jaoks, nt "PW-k3x9a". */
export function uniqueTag(prefix = 'PW'): string {
  return `${prefix}-${Date.now().toString(36).slice(-5)}${randomInt(36).toString(36)}`;
}

/** Eesti isikukoodi kontrollnumber (I ja II astme kaalud). */
function personalCodeChecksum(first10: string): number {
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];
  const sum = (w: number[]) => w.reduce((acc, k, i) => acc + k * Number(first10[i]), 0);
  let c = sum(w1) % 11;
  if (c === 10) {
    c = sum(w2) % 11;
    if (c === 10) c = 0;
  }
  return c;
}

/**
 * Juhuslik kehtiva kontrollsummaga Eesti isikukood (sünniaeg 1970–1999).
 * Ajatempel + juhuslik järjekorranumber hoiab kokkupõrked ebatõenäolisena.
 */
export function uniquePersonalCode(): string {
  const gender = randomInt(2) === 0 ? '3' : '4';
  const year = 70 + randomInt(30);
  const month = 1 + randomInt(12);
  const day = 1 + randomInt(28);
  const seq = randomInt(1000);
  const first10 =
    gender +
    String(year).padStart(2, '0') +
    String(month).padStart(2, '0') +
    String(day).padStart(2, '0') +
    String(seq).padStart(3, '0');
  return first10 + personalCodeChecksum(first10);
}

/** Kuupäev kujul PP.KK.AAAA (UI kuupäevaväljad), nihkega tänasest päevades. */
export function etDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
