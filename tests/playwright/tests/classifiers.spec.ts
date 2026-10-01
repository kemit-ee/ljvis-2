import { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { fillField, fillMaskedDate, searchTable } from '../support/tedi';
import { uniqueTag } from '../support/data';

/**
 * Haldus > Klassifikaatorid (kasutuslood PK-01…PK-08).
 *
 * Testandmed: tests/bootstrap/seed_test_data.sql — klassifikaator TEST
 * (VALUE_A, VALUE_B kehtivad; VALUE_C "Testiväärtus C (aegunud)" lõpetatud).
 * Spec muudab ainult TEST klassifikaatorit ja lisab sellele unikaalse koodiga
 * väärtusi — RTK jm loendustundlikke klassifikaatoreid ei puudutata.
 * Väärtuste kustutamist pole; väärtus lõpetatakse kehtivuse lõpukuupäevaga.
 */

function todayDigits(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
}

async function openTestClassifier(page: Page) {
  await page.goto('/classifiers', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Klassifikaatorid' })).toBeVisible({ timeout: 20_000 });
  await searchTable(page, 'classifier-search', 'classifiers-table', 'TEST');
  const row = page
    .locator('#classifiers-table')
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'TEST', exact: true }) });
  await row.getByRole('link', { name: 'Vaata' }).or(row.getByRole('button', { name: 'Vaata' })).first().click();
  await expect(page).toHaveURL(/\/classifiers\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Klassifikaatori andmed' })).toBeVisible();
}

test.describe('Klassifikaatorite haldus — peakasutaja', () => {
  test('nimekiri, otsing ja detailvaade', async ({ page }) => {
    await test.step('ava klassifikaatorite nimekiri', async () => {
      await page.goto('/classifiers', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Klassifikaatorid' })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#classifiers-table')).toBeVisible();
    });
    await test.step('otsing koodi järgi kitsendab tulemusi', async () => {
      await searchTable(page, 'classifier-search', 'classifiers-table', 'RTK');
      const table = page.locator('#classifiers-table');
      await expect(table.getByRole('cell', { name: 'RTK', exact: true })).toBeVisible();
      await expect(table.getByRole('cell', { name: 'TEST', exact: true })).toHaveCount(0);
    });
    await test.step('ava TEST klassifikaator — väärtuste tabel kuvatakse', async () => {
      await openTestClassifier(page);
      await expect(page.locator('#classifiers-values-table').getByText('VALUE_A')).toBeVisible();
    });
  });

  test('"Kuva ainult kehtivad väärtused" peidab lõpetatud väärtuse', async ({ page }) => {
    await openTestClassifier(page);
    const table = page.locator('#classifiers-values-table');
    await test.step('vaikimisi on aegunud VALUE_C peidetud', async () => {
      await expect(table.getByText('VALUE_A')).toBeVisible();
      await expect(table.getByText('VALUE_C')).toHaveCount(0);
    });
    await test.step('filtri eemaldamisel kuvatakse VALUE_C olekuga "Lõpetatud"', async () => {
      await page.locator('label[for="valid-check"]').click();
      const row = table.getByRole('row').filter({ hasText: 'VALUE_C' });
      await expect(row).toBeVisible();
      await expect(row.getByText('Lõpetatud')).toBeVisible();
    });
  });

  test('klassifikaatori selgituse muutmine', async ({ page }) => {
    const description = `Playwright selgitus ${uniqueTag()}`;
    await openTestClassifier(page);
    await test.step('muuda selgitust ja salvesta', async () => {
      await page.getByRole('button', { name: 'Muuda' }).first().click();
      await fillField(page, 'description', description);
      await page.getByRole('button', { name: 'Salvesta' }).click();
    });
    await test.step('teade ja uus selgitus kuvatakse', async () => {
      await expect(page.getByText('Klassifikaator on muudetud')).toBeVisible();
      await expect(page.getByText(description)).toBeVisible();
    });
  });

  test('väärtuse lisamine, duplikaadi kontroll ja kehtivuse lõpetamine', async ({ page }) => {
    const code = `PW_${uniqueTag('').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
    const name = `Playwright väärtus ${code}`;
    await openTestClassifier(page);
    const classifierUrl = page.url();

    await test.step('lisa uus väärtus', async () => {
      await page.getByRole('button', { name: '+ Lisa väärtus' }).click();
      await expect(page.getByRole('heading', { name: 'Lisa klassifikaatori väärtus' })).toBeVisible();
      await fillField(page, 'code', code);
      await fillField(page, 'name', name);
      await fillMaskedDate(page, 'validFrom', todayDigits(-2));
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page).toHaveURL(classifierUrl);
      await expect(page.getByText('Klassifikaatori väärtus on lisatud')).toBeVisible();
      await expect(page.locator('#classifiers-values-table').getByRole('cell', { name: code, exact: true })).toBeVisible();
    });

    await test.step('sama koodiga väärtust ei saa teist korda lisada', async () => {
      await page.getByRole('button', { name: '+ Lisa väärtus' }).click();
      await fillField(page, 'code', code);
      await fillField(page, 'name', `${name} (duplikaat)`);
      await fillMaskedDate(page, 'validFrom', todayDigits(-2));
      await page.getByRole('button', { name: 'Salvesta' }).click();
      // Oodatav: salvestus lükatakse tagasi ja koodiga ridu jääb täpselt üks.
      await page.goto(classifierUrl, { waitUntil: 'domcontentloaded' });
      await expect(
        page.locator('#classifiers-values-table').getByRole('cell', { name: code, exact: true }),
      ).toHaveCount(1);
    });

    await test.step('lõpeta väärtuse kehtivus (kood ja nimetus pole muudetavad)', async () => {
      const row = page.locator('#classifiers-values-table').getByRole('row').filter({ hasText: code });
      await row.getByRole('link', { name: 'Muuda' }).or(row.getByRole('button', { name: 'Muuda' })).first().click();
      await expect(page.getByRole('heading', { name: 'Muuda klassifikaatori väärtust' })).toBeVisible();
      await expect(page.locator('#code')).toBeDisabled();
      await expect(page.locator('#name')).toBeDisabled();
      await fillMaskedDate(page, 'validUntil', todayDigits(-1));
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page).toHaveURL(classifierUrl);
      await expect(page.getByText('Klassifikaatori väärtus on muudetud')).toBeVisible();
    });

    await test.step('lõpetatud väärtus kaob kehtivate vaatest', async () => {
      await expect(page.locator('#classifiers-values-table').getByRole('cell', { name: code, exact: true })).toHaveCount(0);
      await page.locator('label[for="valid-check"]').click();
      const row = page.locator('#classifiers-values-table').getByRole('row').filter({ hasText: code });
      await expect(row.getByText('Lõpetatud')).toBeVisible();
    });
  });
});

test.describe('Klassifikaatorite haldus — kehtivusperioodi valideerimine', () => {
  test('kehtivuse lõpp, mis võrdub algusega, annab veateate (muudatust ei teatata õnnestunuks)', async ({ page }) => {
    // Andmebaasi piirang ck_cv_period nõuab valid_until > valid_from.
    const code = `PW_${uniqueTag('').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
    await openTestClassifier(page);
    const classifierUrl = page.url();
    await page.getByRole('button', { name: '+ Lisa väärtus' }).click();
    await fillField(page, 'code', code);
    await fillField(page, 'name', `Playwright periood ${code}`);
    await fillMaskedDate(page, 'validFrom', todayDigits(-1));
    await page.getByRole('button', { name: 'Salvesta' }).click();
    await expect(page).toHaveURL(classifierUrl);

    await test.step('sea kehtivuse lõpp võrdseks algusega ja salvesta', async () => {
      const row = page.locator('#classifiers-values-table').getByRole('row').filter({ hasText: code });
      await row.getByRole('link', { name: 'Muuda' }).or(row.getByRole('button', { name: 'Muuda' })).first().click();
      await fillMaskedDate(page, 'validUntil', todayDigits(-1));
      await page.getByRole('button', { name: 'Salvesta' }).click();
    });
    await test.step('kasutajale kuvatakse viga, mitte "Klassifikaatori väärtus on muudetud"', async () => {
      await expect(page.getByText('Lõppkuupäev peab olema hilisem kui alguskuupäev')).toBeVisible();
      await expect(page.getByText('Klassifikaatori väärtus on muudetud')).toHaveCount(0);
    });
  });
});

test.describe('Klassifikaatorite haldus — õigused', () => {
  test('ametnik ei pääse klassifikaatorite nimekirja', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: 'Klassifikaatorid', exact: true })).toHaveCount(0);
    await page.goto('/classifiers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Teil puudub ligipääs sellele lehele')).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });
});
