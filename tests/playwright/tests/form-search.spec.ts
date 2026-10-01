import { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { applyAndWait, fillField, selectTediOption } from '../support/tedi';
import { createCompoundForm, deleteCompoundForm, CreatedForm } from '../support/api';

/**
 * Otsing (/search, vormiotsing üle kõigi kontrollvormide; form_search VIEW).
 *
 * beforeAll loob API kaudu unikaalse sõiduki reg-nr, registrikoodi ja
 * ettevõtte nimega salvestatud koondvormi (kontrolli kuupäev 01.02.2026);
 * afterAll kustutab selle.
 */

const SUFFIX = String(Date.now()).slice(-6);
const REG_NR = `PWS${SUFFIX}`;
const COMPANY_CODE = `7${SUFFIX}1`;
const COMPANY_NAME = `Otsingu Test OÜ ${SUFFIX}`;

let form: CreatedForm;

async function openSearch(page: Page) {
  await page.goto('/search', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Otsing', exact: true })).toBeVisible({ timeout: 20_000 });
}

async function runSearch(page: Page) {
  await applyAndWait(page, 'form-search-table', 'control-forms/search/list', () =>
    page.getByRole('button', { name: 'Otsi', exact: true }).click(),
  );
}

/** Filtririba "Tühjenda" (mitte väljade sees olevad tühjendusristid). */
const clearButton = (page: Page) => page.locator('button[data-name="button"]', { hasText: 'Tühjenda' });

/** TEDI DateField: tipime kogu kuupäeva PP.KK.AAAA. */
async function fillDate(page: Page, id: string, value: string) {
  const input = page.locator(`#${id}`);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay: 15 });
  await input.press('Tab');
}

const resultRow = (page: Page) =>
  page.locator('#form-search-table').getByRole('row').filter({ hasText: REG_NR });

test.describe('Vormiotsing', () => {
  test.beforeAll(async () => {
    form = await createCompoundForm({
      vehicleRegNr: REG_NR,
      companyRegCode: COMPANY_CODE,
      companyName: COMPANY_NAME,
      controlDate: '2026-02-01',
    });
  });

  test.afterAll(async () => {
    if (form?.id) await deleteCompoundForm(form.id);
  });

  test('otsing sõiduki reg-nr, registrikoodi ja ettevõtte nime järgi', async ({ page }) => {
    await openSearch(page);

    await test.step('sõiduki registreerimismärgi järgi', async () => {
      await fillField(page, 'search-vehicle-reg-nr', REG_NR);
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(1);
      await expect(resultRow(page).getByText('Koondvorm')).toBeVisible();
      await expect(resultRow(page).getByText('Salvestatud')).toBeVisible();
    });

    await test.step('"Tühjenda" lähtestab filtrid', async () => {
      await clearButton(page).click();
      await expect(page.locator('#search-vehicle-reg-nr')).toHaveValue('');
    });

    await test.step('ettevõtte registrikoodi järgi', async () => {
      await fillField(page, 'search-company-reg-code', COMPANY_CODE);
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(1);
      await clearButton(page).click();
    });

    await test.step('ettevõtte nime järgi', async () => {
      await fillField(page, 'search-company-name', COMPANY_NAME);
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(1);
      await expect(resultRow(page).getByText(COMPANY_NAME)).toBeVisible();
    });
  });

  test('filtrid: vormi tüüp, staatus ja kontrolli kuupäev kitsendavad tulemust', async ({ page }) => {
    await openSearch(page);
    await fillField(page, 'search-vehicle-reg-nr', REG_NR);

    await test.step('vormi tüüp "Koondvorm" + staatus "Salvestatud" → vorm leitakse', async () => {
      await selectTediOption(page, 'search-form-type', 'Koondvorm');
      await selectTediOption(page, 'search-status', 'Salvestatud');
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(1);
    });

    await test.step('staatus "Avalikustatud" → vormi ei leita', async () => {
      await selectTediOption(page, 'search-status', 'Avalikustatud');
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(0);
      await expect(page.getByText('Otsingule vastavaid tulemusi ei leitud.')).toBeVisible();
      await selectTediOption(page, 'search-status', 'Salvestatud');
    });

    await test.step('kuupäevavahemik, mis sisaldab 01.02.2026 → vorm leitakse', async () => {
      await fillDate(page, 'search-date-from', '31.01.2026');
      await fillDate(page, 'search-date-to', '02.02.2026');
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(1);
    });

    await test.step('kuupäevavahemik pärast kontrolli kuupäeva → vormi ei leita', async () => {
      await fillDate(page, 'search-date-from', '02.02.2026');
      await fillDate(page, 'search-date-to', '28.02.2026');
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(0);
    });

    await test.step('vormi tüüp "Hea maine" → koondvormi ei leita', async () => {
      await clearButton(page).click();
      await fillField(page, 'search-vehicle-reg-nr', REG_NR);
      await selectTediOption(page, 'search-form-type', 'Hea maine');
      await runSearch(page);
      await expect(resultRow(page)).toHaveCount(0);
    });
  });

  test('välisriigi kontrollkaardi filtrid ilmuvad ainult selle vormi tüübi korral', async ({ page }) => {
    await openSearch(page);
    await test.step('vaikimisi VR-filtreid pole', async () => {
      await expect(page.locator('#search-vr-reporting-country-input')).toHaveCount(0);
      await expect(page.locator('#search-vr-sanction-code-input')).toHaveCount(0);
    });
    await test.step('vormi tüüp "Välisriigi kontrollkaart" → VR-filtrid kuvatakse', async () => {
      await selectTediOption(page, 'search-form-type', 'Välisriigi kontrollkaart');
      await expect(page.getByText('VR: teatav riik')).toBeVisible();
      await expect(page.getByText('VR: sanktsioon')).toBeVisible();
    });
  });

  test('"Vaata" avab leitud vormi', async ({ page }) => {
    await openSearch(page);
    await fillField(page, 'search-vehicle-reg-nr', REG_NR);
    await runSearch(page);
    await resultRow(page).getByRole('link', { name: 'Vaata' }).or(
      resultRow(page).getByRole('button', { name: 'Vaata' }),
    ).first().click();
    await expect(page).toHaveURL(new RegExp(`/control-forms/compound/${form.id}`));
  });
});

test.describe('Vormiotsing — õigused', () => {
  test.use({ storageState: STORAGE_STATE.orgadmin });

  test('ainult välisriigi kontrollkaardi lugemisõigusega kasutaja ei näe koondvorme', async ({ page }) => {
    const own = await createCompoundForm({ vehicleRegNr: `PWO${SUFFIX}` });
    try {
      await openSearch(page);
      await fillField(page, 'search-vehicle-reg-nr', `PWO${SUFFIX}`);
      await runSearch(page);
      await expect(page.locator('#form-search-table').getByText(`PWO${SUFFIX}`)).toHaveCount(0);
    } finally {
      await deleteCompoundForm(own.id);
    }
  });
});
