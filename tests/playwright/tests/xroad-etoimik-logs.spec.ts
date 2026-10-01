import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';

/**
 * Haldus > E-toimiku X-tee logid. Testandmed:
 * tests/bootstrap/seed_xroad_etoimik_logs.sql — 6 kirjet sorditult created_at
 * DESC (vaikefiltri eile-täna piires 5, vanem 1 väljas):
 *   0: VT-005 error     compound_form   /95002003
 *   1: VT-001 found     compound_form   /95002001
 *   2: VT-003 not_found compound_form   /95002002
 *   3: VT-002 found     sp_driver_form  /95002101
 *   4: VT-004 not_found tram_control_card /95002201
 *   (VT-006 found, 10 päeva tagasi — väljaspool vaikefiltrit)
 *
 * Tabel ei näita isikukoodi eraldi veeruna (vt XroadLogTable.tsx veerud),
 * seega assertid kasutavad nähtavaid väärtusi: tulemuste arvu, kuupäevi ja
 * modaalides avanevat JSON-sisu (reference_number/faultCode on unikaalsed).
 */

// Seedi kuupäevad (tests/bootstrap/seed_xroad_etoimik_logs.sql) on suhtelised
// (`now() - INTERVAL ...`), mitte fikseeritud — VT-006 kuupäev tuleb siin
// samamoodi jooksu-ajast tuletada, mitte kõvakoodida, muidu läheb assert
// iga päev valeks.
function formatEtDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

test.describe('E-toimiku X-tee logid', () => {
  test('vaikefilter näitab eile-täna kirjeid, vanem kirje ei ole nähtav', async ({ page }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /E-toimiku X-tee logid/i })).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });
    // VT-006 (10 päeva tagasi) kuupäev ei tohi olla nähtaval.
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    await expect(page.getByText(formatEtDate(tenDaysAgo))).toHaveCount(0);
  });

  test('"Kõik" checkbox eemaldamine tühjendab tabeli, tagasi märkimine taastab', async ({
    page,
  }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    const allCheckbox = page.getByRole('checkbox', { name: /^Kõik$/i });
    await allCheckbox.uncheck({ force: true });
    await page.getByRole('button', { name: 'Otsi' }).click();
    await expect(page.getByText(/Filtrile vastavaid kirjeid ei leitud/i)).toBeVisible();

    await allCheckbox.check({ force: true });
    await page.getByRole('button', { name: 'Otsi' }).click();
    await expect(page.getByText('5 tulemust')).toBeVisible();
  });

  test('ühe staatuse eemaldamine peidab vastavad read ja "Kõik" muutub märkimata', async ({
    page,
  }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('checkbox', { name: /Vigane/i }).uncheck({ force: true });
    await page.getByRole('button', { name: 'Otsi' }).click();

    // 1 error-kirje (VT-005) langeb välja -> 4 jääb alles. Filtririba enda
    // "Vigane" checkbox-silt jääb muidugi alles, seega piirdume tabeliga.
    await expect(page.getByText('4 tulemust')).toBeVisible();
    await expect(page.getByRole('table').getByText('Vigane')).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: /^Kõik$/i })).not.toBeChecked();
  });

  test('"Vaata päringut" avab modaali väljuva päringu sisuga', async ({ page }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    // Esimene rida (created_at DESC) on VT-005.
    await page.getByRole('button', { name: 'Vaata päringut' }).first().click();
    await expect(page.getByText('2026-VT-005')).toBeVisible();
    await page.getByRole('button', { name: 'Sulge' }).first().click();
  });

  test('"Vaata vastust" avab modaali saabunud vastuse sisuga', async ({ page }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    // Esimene rida (created_at DESC) on VT-005 — error, vastuses faultCode.
    await page.getByRole('button', { name: 'Vaata vastust' }).first().click();
    await expect(page.getByText(/ServiceFailed/i)).toBeVisible();
    await page.getByRole('button', { name: 'Sulge' }).first().click();
  });

  test('vormi veeru link vastab compound-vormi URL-mustrile', async ({ page }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    // getByRole('row') nth(0) on päisrida; nth(1) on esimene andmerida (VT-005),
    // nth(2) on teine andmerida = VT-001 -> compound_form/95002001.
    const rows = page.getByRole('row');
    await expect(rows.nth(2).getByRole('link')).toHaveAttribute(
      'href',
      '/control-forms/compound/95002001',
    );
  });

  test('kuupäevafilter: 10 päeva tagune vahemik näitab ainult vanemat kirjet', async ({ page }) => {
    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    const elevenDaysAgo = new Date();
    elevenDaysAgo.setDate(elevenDaysAgo.getDate() - 11);
    const nineDaysAgo = new Date();
    nineDaysAgo.setDate(nineDaysAgo.getDate() - 9);

    await test.step('sea vahemik 11…9 päeva tagasi ja otsi', async () => {
      for (const [id, date] of [
        ['xroad-log-filter-date-from', elevenDaysAgo],
        ['xroad-log-filter-date-to', nineDaysAgo],
      ] as const) {
        const input = page.locator(`#${id}`);
        await input.click();
        await input.fill('');
        await input.pressSequentially(formatEtDate(date), { delay: 15 });
        await input.press('Tab');
      }
      await page.getByRole('button', { name: 'Otsi' }).click();
    });
    await test.step('tulemuseks on ainult VT-006', async () => {
      await expect(page.getByText('1 tulemus', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: 'Vaata päringut' }).first().click();
      await expect(page.getByText('2026-VT-006')).toBeVisible();
      await page.getByRole('button', { name: 'Sulge' }).first().click();
    });
  });

  test('vaate lüliti "kõiki" näitab ka teiste X-tee teenuste päringuid (RR)', async ({ page }) => {
    await test.step('tee rahvastikuregistri päring (kirjutab X-tee integratsioonilogi)', async () => {
      const res = await page.request.post('/api/v1/xroad/rr/isikud', {
        data: { personalCode: '39001010001' },
      });
      // Tulemus sõltub X-tee keskkonnast (CI-s mock/viga); logikirje tekib mõlemal juhul.
      expect(res.status()).toBeLessThan(500);
    });

    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('5 tulemust')).toBeVisible({ timeout: 20_000 });

    await test.step('vaikimisi e-toimiku vaade: "Teenus" veergu pole', async () => {
      await expect(page.getByText(/Näidatakse/)).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Teenus' })).toHaveCount(0);
    });
    await test.step('lülita "kõiki" — lisandub "Teenus" veerg ja RR päring', async () => {
      await page.getByRole('button', { name: 'e-toimiku' }).click();
      await expect(page.getByRole('button', { name: 'kõiki' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Teenus' })).toBeVisible();
      await expect(page.locator('#xroad-log-table').getByText('rr.dde.v1').first()).toBeVisible();
    });
    await test.step('tagasi e-toimiku vaatesse', async () => {
      await page.getByRole('button', { name: 'kõiki' }).click();
      await expect(page.getByText('5 tulemust')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Teenus' })).toHaveCount(0);
    });
  });

  test('õigusteta kasutaja ei näe menüükirjet ega pääse otse lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: /E-toimiku X-tee logid/i })).toHaveCount(0);

    await page.goto('/admin/xroad-logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/puudub ligipääs/i)).toBeVisible({ timeout: 20_000 });

    await ctx.close();
  });
});
