import { test, expect } from '../support/fixtures';
import { checkChoiceById, expectFieldError } from '../support/tedi';
import { STORAGE_STATE } from '../playwright.config';

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

test('PPA autojuhi vormil ei kuvata Transpordiameti liiniandmeid', async ({ page }) => {
  await page.goto('/control-forms/compound/new?types=driver');
  await page.getByRole('tab', { name: /Autojuhi|sõidu- ja puhkeaja/i }).click();
  await checkChoiceById(page, 'transport_type_passenger');
  await expect(page.locator('#liiniNumber')).toHaveCount(0);
  await expect(page.locator('#liiniNimetus')).toHaveCount(0);
});

test('autojuhi veo liik ja veoklass kanduvad meeskonna liikme vormile', async ({ page }) => {
  await page.goto('/control-forms/compound/new?types=driver,teammate');
  await page.getByRole('tab', { name: /^Autojuhi/i }).click();
  const driverPanel = page.locator('#tab-sp-driver-panel');
  await driverPanel.locator('#transport_type_cargo').check({ force: true });

  const firstTransportClass = driverPanel
    .locator('input[name="transportClasses"]')
    .first();
  await firstTransportClass.check({ force: true });
  const selectedClass = await firstTransportClass.getAttribute('value');
  expect(selectedClass).toBeTruthy();

  await page.getByRole('tab', { name: /Meeskonnaliikme/i }).click();
  const teammatePanel = page.locator('#tab-sp-teammate-panel');
  await expect(teammatePanel.locator('#teammate-transport_type_cargo')).toBeChecked();
  await expect(
    teammatePanel.locator(
      `input[name="teammate-transportClasses"][value="${selectedClass}"]`,
    ),
  ).toBeChecked();
  await teammatePanel.locator('label[for="teammate-transport_empty_run"]').click();
  await expect(teammatePanel.locator('#teammate-transport_empty_run')).toBeChecked();
  await expect(driverPanel.locator('#transport_empty_run')).not.toBeChecked();
});

test('sõidu- ja puhkeaja vormi faile saab lisada alles pärast esimest salvestamist', async ({ page }, testInfo) => {
  await page.goto('/control-forms/compound/new?types=driver');
  await page.getByRole('tab', { name: /^Autojuhi/i }).click();
  const panel = page.locator('#tab-sp-driver-panel');
  await expect(panel.locator('input[type="file"]')).toBeDisabled();
  const saveFirst = panel.getByText('Salvesta vorm enne failide lisamist');
  await expect(saveFirst).toBeVisible();
  await saveFirst.scrollIntoViewIfNeeded();
  await testInfo.attach('ppa-failid-enne-salvestamist', { body: await page.screenshot(), contentType: 'image/png' });
});

test('sama numbriga autojuhi ja meeskonnaliikme vormi failid on eraldi', async ({ page }) => {
  for (const type of ['driver', 'teammate']) {
    const response = await page.request.get(
      `/api/v1/control-forms/drive-rest-form/${type}/read/files/list`,
      { params: { form_number: 'sp-2026-pw-files' } },
    );
    expect(response.ok()).toBe(true);
    const { response: files } = await response.json();
    expect(files).toHaveLength(1);
    expect(files[0].fileName ?? files[0].file_name).toBe(`${type}-only.pdf`);
  }
});

test.describe('Kontrollvormi failide lugemisõigused', () => {
  test.use({ storageState: STORAGE_STATE.noperm });

  test('lugemisõiguseta kasutaja ei pääse uute vormide faililoendisse', async ({ page }) => {
    for (const path of ['compound-form', 'drive-rest-form/driver', 'drive-rest-form/teammate', 'labour-inspection']) {
      const response = await page.request.get(`/api/v1/control-forms/${path}/read/files/list`, {
        params: { form_number: 'sp-2026-pw-files' },
      });
      expect(response.status(), path).toBe(403);
    }
  });
});
