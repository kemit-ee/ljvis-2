import { test, expect } from '../support/fixtures';
import { expectFieldError } from '../support/tedi';

/**
 * Koondvormi alamvormid. Alamvormi loomislehed toimivad ainult koondvormi
 * kontekstis (`/compound/new?types=<liik>`), mitte eraldiseisvalt — seega
 * testime neid koondvormi loomisvoo kaudu.
 *
 * Autoveo katkestamise alamvormi salvestamist katab lisaks
 * `compound-form.spec.ts` „miinimumväljadega koondvorm salvestub" test, mis
 * kasutab `?types=transport-interruption`.
 */

test('autojuhi sõidu-/puhkeaja alamvorm — veo liik ja kontrolli tulemus on kohustuslikud', async ({
  page,
}) => {
  await test.step('ava koondvorm autojuhi alamvormiga', async () => {
    await page.goto('/control-forms/compound/new?types=driver');
    await page.getByRole('tab', { name: /Autojuhi|sõidu- ja puhkeaja/i }).click();
  });

  await test.step('vajuta Salvesta', async () => {
    await page.getByRole('button', { name: 'Salvesta' }).click();
  });

  await test.step('veo liik ja kontrolli tulemus näitavad viga', async () => {
    await expectFieldError(page, 'transportType');
    const resultErr =
      (await page.locator('#controlResult-helper').count()) +
      (await page.locator('#resultType-helper').count());
    expect(resultErr, 'kontrolli tulemuse viga peab olema nähtav').toBeGreaterThan(0);
  });

  await test.step('koondvormi ei salvestatud', async () => {
    await expect(page).toHaveURL(/\/control-forms\/compound\/new/);
  });
});

test('ADR alamvorm — koondvormi loomisvoos avaneb ja renderdab sisu', async ({
  page,
}) => {
  await page.goto('/control-forms/compound/new?types=adr');
  await expect(page.getByRole('tab', { name: /ADR|ohtlik/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('tab', { name: /ADR|ohtlik/i }).click();
  await expect(page.getByText(/ADR|ohtlike veoste|ohtlik veos/i).first()).toBeVisible();
});

test('sõiduki tehnoülevaatuse alamvorm — koondvormi loomisvoos avaneb', async ({
  page,
}) => {
  await page.goto('/control-forms/compound/new?types=vehicle-technical');
  await expect(
    page.getByRole('tab', { name: /tehno|sõiduki/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
});
