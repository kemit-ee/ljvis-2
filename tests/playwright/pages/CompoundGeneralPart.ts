import { Page, expect, test } from '@playwright/test';
import {
  fillMaskedDate,
  selectTediOption,
  checkChoiceById,
} from '../support/tedi';

/**
 * Koondvormi „Üldosa" (jagatud koondvormi loomislehe ja TRAM kontrollkaardi
 * vahel). Väljade id-d erinevad ainult juhi plokis:
 *   - koondvorm (CompoundFormCreatePage): `driverFirstName`, `personalCodeEe`, …
 *   - TRAM (CompoundFormEditCard):        `driverFirstName_0`, `driverPersonalCodeEe_0`, …
 */
export interface DriverIds {
  firstName: string;
  lastName: string;
  personalCodeEe: string;
  birthDate: string;
}

export const COMPOUND_DRIVER_IDS: DriverIds = {
  firstName: 'driverFirstName',
  lastName: 'driverLastName',
  personalCodeEe: 'personalCodeEe',
  birthDate: 'driverBirthDate',
};

export const TRAM_DRIVER_IDS: DriverIds = {
  firstName: 'driverFirstName_0',
  lastName: 'driverLastName_0',
  personalCodeEe: 'driverPersonalCodeEe_0',
  birthDate: 'driverBirthDate_0',
};

export interface GeneralPartValues {
  address?: string;
  controlDate?: string; // "01032026"
  controlTime?: string; // "1200"
  county?: string; // nt "Harju maakond" (kohustuslik kui riik = Eesti)
  vehicleRegNr?: string;
  vehicleCategoryCode?: string; // radio id-sufiks, nt "A_2012"
  fillInspector?: boolean;
  driver?: {
    ids: DriverIds;
    firstName?: string;
    lastName?: string;
    birthDate?: string; // "01011990"
  };
}

/** Täidab Üldosa miinimumväljad korrektseks salvestuseks. */
export async function fillGeneralPart(
  page: Page,
  v: GeneralPartValues,
): Promise<void> {
  if (v.address !== undefined) await page.locator('#address').fill(v.address);
  if (v.controlDate) await fillMaskedDate(page, 'controlDate', v.controlDate);
  if (v.controlTime) await fillMaskedDate(page, 'controlTime', v.controlTime);
  if (v.county) await selectTediOption(page, 'county', v.county);
  if (v.vehicleRegNr) await page.locator('#vehicleRegNr').fill(v.vehicleRegNr);
  if (v.vehicleCategoryCode) {
    await checkChoiceById(page, `vehicleCat-${v.vehicleCategoryCode}`);
  }
  if (v.vehicleRegNr) {
    // sõiduki riik on kohustuslik
    await selectTediOption(page, 'vehicleCountryCode', 'Eesti');
  }

  if (v.driver) {
    const d = v.driver;
    if (d.firstName) await page.locator(`#${d.ids.firstName}`).fill(d.firstName);
    if (d.lastName) await page.locator(`#${d.ids.lastName}`).fill(d.lastName);
    if (d.birthDate) await fillMaskedDate(page, d.ids.birthDate, d.birthDate);
  }

  if (v.fillInspector) {
    await fillInspector(page);
  }
}

/** Täidab inspektori ploki (ees-/perekonnanimi on eeltäidetud kasutajast). */
export async function fillInspector(page: Page): Promise<void> {
  const first = page.locator('#inspectorFirstName');
  if (!(await first.inputValue())) await first.fill('PW');
  const last = page.locator('#inspectorLastName');
  if (!(await last.inputValue())) await last.fill('Test');
  const prof = page.locator('#inspectorProfession');
  if (!(await prof.inputValue())) await prof.fill('Inspektor');
  await selectTediOption(page, 'inspectorOrganisation', 'Politsei- ja Piirivalveamet');
  await selectTediOption(page, 'inspectorUnit', 'Lõuna prefektuur');
}

/**
 * Ootab eduka salvestuse: URL muutub /:id peale (kindel signaal, et vorm
 * salvestus andmebaasi ja server tagastas võtme). SPA-navigatsioon ei tekita
 * `load`-sündmust, seega pollime URL-i.
 *
 * „Vorm on salvestatud" teade on lisakinnitus; kui see ei ilmu (nt TRAM
 * kaardil), lisatakse annotatsioon, aga test ei kuku selle pärast läbi —
 * korrektset salvestumist kinnitab helper `expectPersisted`.
 */
export async function expectSaved(
  page: Page,
  routePrefix: string,
): Promise<string> {
  const re = new RegExp(`${routePrefix.replace(/\//g, '\\/')}\\/(\\d+)`);
  await expect
    .poll(() => page.url(), {
      timeout: 25_000,
      message: 'URL ei muutunud /:id peale (salvestus ebaõnnestus?)',
    })
    .toMatch(re);

  const alertVisible = await page
    .getByText('Vorm on salvestatud')
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (!alertVisible) {
    test.info().annotations.push({
      type: 'märkus',
      description: '„Vorm on salvestatud" teadet ei kuvatud (URL muutus siiski /:id peale)',
    });
  }
  return page.url().match(re)?.[1] ?? '';
}
