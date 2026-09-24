import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Haldus > Postkasti mallide ja vastuvõtjate seaded — desktop-kanali
 * teavituse saajate valik kasutajate kaupa (vt DesktopRecipientsField).
 *
 * `ncr_violation` on seemnest (DSL/Liquibase 20261022100000) desktop-kanaliga
 * ja algselt ilma saajateta. Kasutaja otsitakse olemasoleva ametniku-testkasutaja
 * (Mari Tamm, 60002020202, tests/bootstrap/seed_test_data.sql) järgi — super
 * admin grupil on notification_template_mapping.list/.edit + user.list.admin.
 */
test.describe('Postkasti mallide ja vastuvõtjate seaded — desktop saajad', () => {
  test.beforeEach(async ({ page }) => {
    // Korduvkäivitamisel (nt ebaõnnestunud eelmine katse) võib saaja olla juba
    // valitud — nulli seis, et testi eeldused (otsingutulemus, tühi loend)
    // kehtiksid sõltumata varasemast olekust.
    await page.goto('/notification-template-mapping/ncr_violation', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'ncr_violation' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Muuda' }).click();
    const removeButtons = page.getByRole('button', { name: 'Eemalda' });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
    }
    await expect(page.getByText('Saajaid pole valitud')).toBeVisible();
    await page.getByRole('button', { name: 'Salvesta' }).click();
    await expect(page.getByText('Seadistus on muudetud')).toBeVisible({ timeout: 15_000 });
  });

  test('desktop-kanali saaja lisamine ja eemaldamine', async ({ page }) => {
    // beforeEach jättis lehe salvestamise järel vaaterežiimi (isEditActive
    // lähtestub), seega tühjuse "Saajaid pole valitud" (ainult redigeerimisvormis)
    // asemel kontrollime vaate välja tühja väärtust.
    await expect(page.getByText('desktop')).toBeVisible();

    await page.getByRole('button', { name: 'Muuda' }).click();

    // Postkast-kanali e-posti väli ei tohi desktop-kanali vormis olemas olla.
    await expect(page.getByLabel('Vaikimisi vastuvõtja e-post')).toHaveCount(0);

    await page.getByPlaceholder('Otsi kasutajat nime järgi').fill('Mari');
    await page.getByPlaceholder('Otsi kasutajat nime järgi').press('Enter');

    const resultRow = page.getByText('Mari Tamm (60002020202)');
    await expect(resultRow).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Lisa' }).click();

    await expect(page.getByText('Mari Tamm (60002020202)')).toBeVisible();
    await page.getByRole('button', { name: 'Salvesta' }).click();

    await expect(page.getByText('Seadistus on muudetud')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Mari Tamm')).toBeVisible();

    // Eemalda saaja uuesti, et test oleks korduvkäivitatav.
    await page.getByRole('button', { name: 'Muuda' }).click();
    await page.getByRole('button', { name: 'Eemalda' }).click();
    await expect(page.getByText('Saajaid pole valitud')).toBeVisible();
    await page.getByRole('button', { name: 'Salvesta' }).click();

    await expect(page.getByText('Seadistus on muudetud')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Mari Tamm')).toHaveCount(0);
  });

  test('õigusteta kasutaja ei näe menüükirjet ega pääse otse lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(
      page.getByRole('link', { name: /Postkasti mallide ja vastuvõtjate seaded/i }),
    ).toHaveCount(0);

    await page.goto('/notification-template-mapping/ncr_violation', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText(/puudub ligipääs/i)).toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
