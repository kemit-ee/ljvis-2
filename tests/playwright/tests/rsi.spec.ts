import { test, expect } from '../support/fixtures';
import { checkChoiceById } from '../support/tedi';

/** RSI kaart: UI struktuur, kontrollpunktide lubatud olekud ja printimise kutse. */
test.describe('RSI teade', () => {
  test('uus vorm avaneb ning „Ei kontrollitud” valikut ei kuvata', async ({ page }) => {
    await page.goto('/erru/rsi/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /RSI/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Kontrollitud punkt/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Ei kontrollitud/i)).toHaveCount(0);
    await expect(page.getByText(/Sõiduki sobivus/i)).toBeVisible();
    await expect(page.getByText(/Kinnitusmeetodid/i)).toBeVisible();
  });

  test('mittevastava kontrollpunkt avab rikkemodaliga valiku', async ({ page }) => {
    await page.goto('/erru/rsi/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Kontrollitud punkt/i)).toBeVisible({ timeout: 20_000 });
    const nonCompliant = page.getByRole('radio', { name: /Ei vasta nõuetele/i }).first();
    await expect(nonCompliant).toBeEnabled();
    const inputId = await nonCompliant.getAttribute('id');
    expect(inputId).toBeTruthy();
    await checkChoiceById(page, inputId!);
    await expect(page.getByRole('dialog')).toBeVisible();
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
