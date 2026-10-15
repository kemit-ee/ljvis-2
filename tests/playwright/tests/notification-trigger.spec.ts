import { Browser, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import {
  createCompoundForm,
  deleteCompoundForm,
  publishVehicleTechnicalForm,
  resaveVehicleTechnicalForm,
} from '../support/api';

/**
 * Teavituse täielik ahel: reaalne sündmus (tehnokontrollvormi avalikustamine,
 * mitte Resql-i kaudu seemnestatud rida — vt notifications.spec.ts) käivitab
 * `notification/evaluate-technical-publish`, mis loob teavituse, ning
 * konkreetne desktop-kanali saaja (lisatud haldusvaate kaudu, vt
 * notification-template-mapping.spec.ts) näeb seda oma teavituste vaates.
 *
 * `extraordinary_inspection` ja `cargo_securing` nõuavad `rsi.read` õigust,
 * mida ametniku (Mari Tamm, 60002020202, "Officer Group") testkasutajal EI
 * ole (vt tests/bootstrap/seed_test_data.sql) — seega ainus viis, kuidas tema
 * neid teavitusi näeb, on desktop_recipient_personal_codes kaudu. See test
 * seob kaks varem eraldi testitud osa (päästiku loogika ja saaja-admini UI)
 * kokku ühte tõestatud ahelasse.
 *
 * Saajate ring tardistatakse teavituse LOOMISE hetkel (ADR-006, vt
 * 20261125110000-notification-desktop-recipients.sql) — seega Mari tuleb
 * lisada saajaks ENNE avalikustamist, mitte pärast.
 */

const RECIPIENT_SEARCH = 'Mari';
const RECIPIENT_NAME = 'Mari Tamm (60002020202)';
const TYPES = ['extraordinary_inspection', 'cargo_securing'] as const;

async function setMariAsRecipient(page: Page, type: string, add: boolean): Promise<void> {
  await page.goto(`/notification-template-mapping/${type}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Muuda' }).click();

  if (add) {
    await page.getByPlaceholder('Otsi kasutajat nime järgi').fill(RECIPIENT_SEARCH);
    await page.getByPlaceholder('Otsi kasutajat nime järgi').press('Enter');
    await expect(page.getByText(RECIPIENT_NAME)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Lisa' }).click();
    await expect(page.getByText(RECIPIENT_NAME)).toBeVisible();
  } else {
    const removeButtons = page.getByRole('button', { name: 'Eemalda' });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
    }
  }

  await page.getByRole('button', { name: 'Salvesta' }).click();
  await expect(page.getByText('Seadistus on muudetud')).toBeVisible({ timeout: 15_000 });
}

async function withSuperadminPage(browser: Browser, fn: (page: Page) => Promise<void>): Promise<void> {
  const ctx = await browser.newContext({ storageState: STORAGE_STATE.superadmin });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    await ctx.close();
  }
}

test.describe('Teavituse täielik ahel — avalikustamine → desktop-saaja vaade', () => {
  const reg = `PW${Date.now() % 100000}`;
  let compoundId: number;

  test.beforeAll(async ({ browser }) => {
    // 1. Lisa Mari saajaks ENNE avalikustamist — saajate ring tardistatakse
    //    teavituse loomise hetkel, mitte haldusseadistuse praeguse seisuga.
    await withSuperadminPage(browser, async (page) => {
      for (const type of TYPES) {
        await setMariAsRecipient(page, type, true);
      }
    });

    // 2. Reaalne sündmus: loo koondvorm + avalikusta tehnokontrollvorm API kaudu.
    const compound = await createCompoundForm({
      vehicleRegNr: reg,
      vehicleCountryCode: 'CZ',
      companyName: `PW Tšehhi vedaja ${Date.now()}`,
      companyCountryCode: 'CZ',
    });
    compoundId = compound.id;

    // Üks avalikustamine käivitab korraga nii "erakorralise ülevaatuse" (resultType)
    // kui "veose kinnituse" (CAA_10 defekt) teavituse — mõlemad on EL-liikmesriigi
    // sõiduki (CZ) jaoks kohaldatavad ega välista teineteist.
    await publishVehicleTechnicalForm(compoundId, {
      resultType: 'extraordinary_inspection',
      partsSummary: '[{"partCode":"CAA_10","checked":true}]',
      partsDefects: '[{"partCode":"CAA_10","defectCode":"CAA_10.1.1a","severity":"OV"}]',
    });
  });

  test.afterAll(async ({ browser }) => {
    await deleteCompoundForm(compoundId);
    // Eemalda saaja uuesti, et test oleks korduvkäivitatav ega jätaks halduse
    // seadistust muudetuks (vt notification-template-mapping.spec.ts).
    await withSuperadminPage(browser, async (page) => {
      for (const type of TYPES) {
        await setMariAsRecipient(page, type, false);
      }
    });
  });

  test('desktop-saajaks lisatud ametnik näeb erakorralise ülevaatuse ja veose kinnituse teavitust', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();

    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Teavitused', exact: true })).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByText(
        'Saabus teade Eestis erakorralisele tehnoülevaatusele suunatud Euroopa Liidu liikmesriigi sõiduki kohta',
      ),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(
        'Saabus teade Eestis avastatud veoseveo kinnitamise nõude mittevastavuse kohta Euroopa Liidu liikmesriigi vedaja sõiduki kontrollimisel',
      ),
    ).toBeVisible();

    await ctx.close();
  });
});

test.describe('Teavituse täielik ahel — saaja lisatud alles pärast avalikustamist, siis resave', () => {
  // Saajate ring tardistatakse teavituse LOOMISE hetkel — kui saaja lisatakse
  // alles pärast esimest avalikustamist, ei ilmu see algne teavitus talle
  // tagantjärele. Aga juba avalikustatud vormi uuesti salvestamine (resave,
  // vt edit/save.yml checkNotifyOnResave) loob UUE teavituse uue event_key'ga
  // — selle loomise hetkel loetakse haldusseadistus uuesti ja saaja on siis
  // juba sees.
  const reg = `PW${Date.now() % 100000}`;
  const RESAVE_TYPE = 'driving_ban';
  let compoundId: number;
  let subFormId: number;

  test.beforeAll(async () => {
    const compound = await createCompoundForm({
      vehicleRegNr: reg,
      vehicleCountryCode: 'CZ',
      companyName: `PW Tšehhi vedaja (resave) ${Date.now()}`,
      companyCountryCode: 'CZ',
    });
    compoundId = compound.id;

    // Esimene avalikustamine — Mari EI OLE veel saajate seas, seega see
    // algne sündmus (kui teavitus üldse tekib) jääb talle nähtamatuks.
    const published = await publishVehicleTechnicalForm(compoundId, {
      resultType: 'driving_ban',
      resultTransportInterruption: true,
    });
    subFormId = published.id;
  });

  test.afterAll(async ({ browser }) => {
    await deleteCompoundForm(compoundId);
    await withSuperadminPage(browser, async (page) => {
      await setMariAsRecipient(page, RESAVE_TYPE, false);
    });
  });

  test('saaja, kes lisati pärast avalikustamist, näeb teavitust alles pärast vormi uuesti salvestamist (resave)', async ({
    browser,
  }) => {
    // 1. Lisa Mari saajaks alles NÜÜD — pärast esimest avalikustamist.
    await withSuperadminPage(browser, async (page) => {
      await setMariAsRecipient(page, RESAVE_TYPE, true);
    });

    // 2. Muuda ja salvesta juba avalikustatud vorm uuesti (status jääb
    //    "published", aga tekib uus versioon/event_key).
    await resaveVehicleTechnicalForm(subFormId, {
      resultType: 'driving_ban',
      resultTransportInterruption: true,
      notes: `resave ${Date.now()}`,
    });

    // 3. Ametnik näeb nüüd sõidukeelu teavitust — resave'i hetkel tekkinud,
    //    mitte algsest avalikustamisest.
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Teavitused', exact: true })).toBeVisible({ timeout: 20_000 });

    await expect(
      page.getByText('Saabus teade Eestis sõidukeelu rakendamise kohta'),
    ).toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
