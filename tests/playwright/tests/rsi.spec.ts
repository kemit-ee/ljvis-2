import { test, expect } from '../support/fixtures';
import { checkChoiceById } from '../support/tedi';

/** RSI kaart: UI struktuur, kontrollpunktide lubatud olekud ja printimise kutse. */
test.describe('RSI teade', () => {
  test('uus vorm kuvab 12 ERRU kontrollpunkti märkeruutudega', async ({ page }) => {
    await page.goto('/erru/rsi/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /RSI/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Kontrollitud punkt/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Ei kontrollitud/i)).toHaveCount(0);
    // RSI_FAILED_REASON 1. tase = ERRU rsiItemType 0..10, 20 (direktiiv 2014/47/EL).
    await expect(page.locator('input[id^="rsi-item-"][id$="-non-compliant"]')).toHaveCount(12);
    await expect(page.getByText('Sõiduki sobivus', { exact: true })).toBeVisible();
    await expect(page.getByText('Kinnitusmeetodid', { exact: true })).toBeVisible();
  });

  test('„Ei vasta nõuetele” avab põhjuste tabeli lubatud hinnangutega', async ({ page }) => {
    await page.goto('/erru/rsi/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Kontrollitud punkt/i)).toBeVisible({ timeout: 20_000 });
    await checkChoiceById(page, 'rsi-item-1-non-compliant');
    await expect(page.locator('#rsi-item-1-checked')).toBeChecked();
    // 1.1.2 a) lubab ainult olulise ja ohtliku hinnangu.
    await expect(page.locator('#rsi-reason-1\\.1\\.2\\.a-OV')).toHaveCount(1);
    await expect(page.locator('#rsi-reason-1\\.1\\.2\\.a-VO')).toHaveCount(0);
    await checkChoiceById(page, 'rsi-reason-1.1.2.a-EOV');
    await expect(page.locator('#rsi-reason-1\\.1\\.2\\.a-EOV')).toBeChecked();
  });

  test('RSI detailis kuvatakse printimise nupp ja print endpointi kasutatakse', async ({ page }) => {
    await page.route('**/v1/erru/rsi/get**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: {
          id: 'rsi-test',
          version: 1,
          direction: 'outgoing',
          status: 'sent',
          businessCaseId: 'EE-RSI-TEST',
          rsiFrom: 'EE',
          rsiTo: 'FI',
          checkedItems: [],
        },
      }),
    }));
    let printCalled = false;
    await page.route('**/v1/erru/rsi/print', (route) => {
      printCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            filename: 'rsi.pdf',
            contentType: 'application/pdf',
            base64: btoa('PDF'),
            warnings: [],
          },
        }),
      });
    });
    await page.goto('/erru/rsi/rsi-test', { waitUntil: 'domcontentloaded' });
    const print = page.getByRole('button', { name: /Prindi/i });
    await expect(print).toBeVisible({ timeout: 20_000 });
    await print.click();
    await expect.poll(() => printCalled).toBe(true);
  });
});
