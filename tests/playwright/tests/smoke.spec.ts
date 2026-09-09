import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Suitsutestid: sessioon toimib, rollid saavad õiged vaated, iga
 * kontrollvormi loomisleht avaneb ilma vigadeta.
 */

test.describe('Sessioon ja armatuurlaud', () => {
  test('Super Admin näeb ametniku töölauda', async ({ page }) => {
    await test.step('ava avaleht', async () => {
      await page.goto('/');
    });
    await test.step('töölaud on nähtav', async () => {
      await expect(
        page.getByRole('heading', { name: 'Töölaud' }),
      ).toBeVisible();
    });
  });

  test('õigusteta kasutaja ei näe ametniku kaarte', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.noperm });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Ei tohi näha kontrollvormi "Täida" nuppe.
    await expect(page.getByRole('link', { name: 'Täida' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Täida' })).toHaveCount(0);
    await ctx.close();
  });
});

const CREATE_ROUTES: { nimi: string; route: string; marker: RegExp }[] = [
  { nimi: 'Koondvorm', route: '/control-forms/compound/new', marker: /Kontrolli koht|Üldosa|Mootorsõiduk/ },
  { nimi: 'TRAM kontrollkaart', route: '/control-forms/tram-driver/new', marker: /Kontrolli koht|Mootorsõiduk|Sõidukijuhi andmed/ },
  { nimi: 'Välisriigi rikkumine', route: '/control-forms/foreign-violation/new', marker: /rikkumi|Kontrolli|andmed/i },
  { nimi: 'Tööinspektsioon', route: '/control-forms/labour-inspection/new', marker: /inspektsioon|Kontroll|akt/i },
  { nimi: 'Hea maine', route: '/control-forms/good-repute/new', marker: /maine|Isikuandmed|Tunnistus/i },
  { nimi: 'ERRU CTUD', route: '/erru/ctud/new', marker: /tegevusloa|CTUD/i },
  { nimi: 'ERRU CGR', route: '/erru/cgr/new', marker: /mainep|CGR/i },
  { nimi: 'ERRU RSI', route: '/erru/rsi/new', marker: /tehnokontrolli|RSI/i },
  { nimi: 'ERRU NCR', route: '/erru/ncr/new', marker: /kontrollitulemus|NCR/i },
];

test.describe('Loomislehed avanevad', () => {
  for (const { nimi, route, marker } of CREATE_ROUTES) {
    test(`${nimi} (${route})`, async ({ page }) => {
      const fatal: string[] = [];
      page.on('pageerror', (e) => {
        const m = String(e);
        // Ignoreeri teavituste WebSocketi / võrgu mürataset; loeme ainult
        // React renderdusvigu.
        if (/Minified React error|Cannot read propert|is not a function|Rendered more hooks/.test(m)) {
          fatal.push(m);
        }
      });

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toContainText('Ligipääs keelatud');
      await expect(page.locator('body')).not.toContainText('common.forbidden');
      // Vormi sisu renderdus.
      await expect(page.getByText(marker).first()).toBeVisible({ timeout: 20_000 });
      expect(fatal, `React renderdusvead: ${fatal.join(' | ')}`).toEqual([]);
    });
  }
});
