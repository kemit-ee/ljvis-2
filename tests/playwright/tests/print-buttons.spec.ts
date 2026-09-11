import { test, expect } from '../support/fixtures';
import {
  fillGeneralPart,
  expectSaved,
  COMPOUND_DRIVER_IDS,
} from '../pages/CompoundGeneralPart';
import { checkChoiceById } from '../support/tedi';

/**
 * Printimise nuppude olemasolu kontroll koondvormi alamvormidel (PR #310).
 *
 * Iga test:
 *  1. Loob uue koondvormi koos vastava alamvormiga
 *  2. Täidab nii üldosa kui ka alamvormi kohustuslikud väljad
 *  3. Salvestab vormi
 *  4. Navigeerib salvestatud vormile tagasi
 *  5. Kontrollib, et „Prindi" nupp on nähtaval
 *
 * Testimisstrateegia:
 *  – SP driver / teammate: kohustuslikud väljad `transportType` ja `resultType`
 *    täidetakse enne salvestamist; seejärel navigeeritakse tagasi Üldosa tabile
 *    et tagada Formiku async-valideerimine jõuab lõpule enne salvestamist.
 *  – Sõiduki tehniline kontroll: `resultType` seatakse väärtusele, mis ei ole
 *    'ok', et partsSummary kohustuslik valideerimine vahele jäetaks.
 *  – Autoveo katkestamine: alamvormil kohustuslikud väljad puuduvad.
 */

const MOCK_PDF = (route: import('@playwright/test').Route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      base64: Buffer.from('PDF').toString('base64'),
      contentType: 'application/pdf',
      filename: 'test.pdf',
      warnings: [],
    }),
  });

/** Täidab SP driver / teammate alamvormi miinimumväljad (transportType + resultType). */
async function fillDriveRestSubForm(
  page: import('@playwright/test').Page,
  tabName: RegExp,
): Promise<void> {
  // Ava SP-vormide tab
  await page.getByRole('tab', { name: tabName }).click();
  await expect(
    page.getByText(/Veoliik/i).first(),
  ).toBeVisible({ timeout: 10_000 });
  // Täida kohustuslikud väljad
  await checkChoiceById(page, 'transport_type_cargo');  // Veosevedu
  await checkChoiceById(page, 'result_korras');          // Korras
  // Liigu Üldosa tabile tagasi — see ootab, kuni Formik async-valideerimine lõpeb
  await page.getByRole('tab', { name: /Üldosa/ }).click();
  await expect(
    page.getByText(/Kontrolli koht/i),
  ).toBeVisible({ timeout: 5_000 });
}

// ─── Sõidu- ja puhkeaja kontrollvorm — autojuht ──────────────────────────────

test.describe('Printimise nupud — autojuhi SP vorm', () => {
  test('salvestatud autojuhi SP alamvormil on „Prindi" dropdown kahe valikuga', async ({
    page,
  }) => {
    const reg = `PB${Date.now() % 100000}`;
    let formId = '';

    await page.goto('/control-forms/compound/new?types=driver');
    await expect(
      page.getByRole('tab', { name: /Autojuhi sõidu- ja puhkeaja kontrollvorm/ }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Prindi tee 1',
      controlDate: '20032026',
      controlTime: '1000',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'B_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Prindi',
        lastName: 'Test',
        birthDate: '15061990',
      },
    });

    await fillDriveRestSubForm(page, /Autojuhi sõidu- ja puhkeaja kontrollvorm/);

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    // Ava salvestatud vorm ja kliki SP driver tabile
    await page.goto(`/control-forms/compound/${formId}`);
    await expect(
      page.getByRole('tab', { name: /Autojuhi sõidu- ja puhkeaja kontrollvorm/ }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /Autojuhi sõidu- ja puhkeaja kontrollvorm/ }).click();

    // Prindi dropdown peab olema nähtaval
    await page.route('**/v1/control-forms/drive-rest-form/driver/read/print', MOCK_PDF);
    const printBtn = page.getByRole('button', { name: /^Prindi$/i });
    await expect(printBtn).toBeVisible({ timeout: 10_000 });

    // Mõlemad valikud on dropdown-is
    await printBtn.click();
    await expect(
      page.getByText(/Prindi täidetud vorm/i).first().or(
        page.getByRole('option', { name: /Täidetud vorm/i }).first()
      ),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(/Prindi tühi vorm/i).first().or(
        page.getByRole('option', { name: /Tühi vorm/i }).first()
      ),
    ).toBeVisible();
  });
});

// ─── Sõidu- ja puhkeaja kontrollvorm — meeskonnaliige ────────────────────────

test.describe('Printimise nupud — meeskonnaliikme SP vorm', () => {
  test('salvestatud meeskonnaliikme SP alamvormil on „Prindi" nupp', async ({
    page,
  }) => {
    const reg = `PBT${Date.now() % 100000}`;
    let formId = '';

    await page.goto('/control-forms/compound/new?types=teammate');
    await expect(
      page.getByRole('tab', { name: /Meeskonnaliikme sõidu- ja puhkeaja kontrollvorm/ }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Prindi tee 2',
      controlDate: '20032026',
      controlTime: '1000',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'B_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Prindi',
        lastName: 'Test',
        birthDate: '15061990',
      },
    });

    await fillDriveRestSubForm(page, /Meeskonnaliikme sõidu- ja puhkeaja kontrollvorm/);

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    await page.goto(`/control-forms/compound/${formId}`);
    await expect(
      page.getByRole('tab', { name: /Meeskonnaliikme sõidu- ja puhkeaja kontrollvorm/ }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /Meeskonnaliikme sõidu- ja puhkeaja kontrollvorm/ }).click();

    await page.route('**/v1/control-forms/drive-rest-form/teammate/read/print', MOCK_PDF);
    const printBtn = page.getByRole('button', { name: /^Prindi$/i });
    await expect(printBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Sõiduki tehniline kontroll ───────────────────────────────────────────────

test.describe('Printimise nupud — sõiduki tehniline kontroll', () => {
  test('salvestatud sõiduki tehnilise kontrollkaardil on „Prindi" nupp', async ({
    page,
  }) => {
    const reg = `PVT${Date.now() % 100000}`;
    let formId = '';

    await page.goto('/control-forms/compound/new?types=vehicle-technical');
    await expect(
      page.getByRole('tab', { name: /Mootorsõiduki tehnonõuetele vastavuse kontrollvorm/ }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Prindi tee 3',
      controlDate: '20032026',
      controlTime: '0900',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'B_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Prindi',
        lastName: 'Test',
        birthDate: '15061990',
      },
    });

    // Ava sõiduki TK tab ja seadista resultType (ei ole 'ok'),
    // et partsSummary valideerimine vahele jäetaks
    await page.getByRole('tab', { name: /Mootorsõiduki tehnonõuetele vastavuse kontrollvorm/ }).click();
    await expect(
      page.getByText(/Kontrolli tulemus/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await checkChoiceById(page, 'resultType-extraordinary_inspection');
    // Liigu Üldosa tabile tagasi (async-valideerimine jõuab lõpule)
    await page.getByRole('tab', { name: /Üldosa/ }).click();
    await expect(page.getByText(/Kontrolli koht/i)).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    await page.goto(`/control-forms/compound/${formId}`);
    await expect(
      page.getByRole('tab', { name: /Mootorsõiduki tehnonõuetele vastavuse kontrollvorm/ }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /Mootorsõiduki tehnonõuetele vastavuse kontrollvorm/ }).click();

    await page.route('**/v1/control-forms/vehicle-technical/read/print', MOCK_PDF);
    const printBtn = page.getByRole('button', { name: /^Prindi$/i });
    await expect(printBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Autoveo katkestamine ─────────────────────────────────────────────────────

test.describe('Printimise nupud — autoveo katkestamine', () => {
  test('salvestatud autoveo katkestamise alamvormil on „Prindi" nupp', async ({
    page,
  }) => {
    const reg = `PTI${Date.now() % 100000}`;
    let formId = '';

    // TI alamvormil kohustuslikud väljad puuduvad — ainult üldosa täidab
    await page.goto('/control-forms/compound/new?types=transport-interruption');
    await expect(
      page.getByRole('tab', { name: /Autoveo katkestamine/ }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Prindi tee 5',
      controlDate: '20032026',
      controlTime: '0800',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'A_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Prindi',
        lastName: 'Test',
        birthDate: '15061990',
      },
    });

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    await page.goto(`/control-forms/compound/${formId}`);
    await expect(
      page.getByRole('tab', { name: /Autoveo katkestamine/ }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /Autoveo katkestamine/ }).click();

    await page.route('**/v1/control-forms/transport-interruption/read/print', MOCK_PDF);
    const printBtn = page.getByRole('button', { name: /^Prindi$/i });
    await expect(printBtn).toBeVisible({ timeout: 10_000 });
  });
});
