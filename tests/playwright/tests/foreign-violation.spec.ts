import { test, expect } from '../support/fixtures';
import {
  fillMaskedDate,
  selectTediOption,
  checkChoiceById,
  checkFirstRadio,
  expectFieldError,
} from '../support/tedi';

/**
 * Välisriigis teostatud autoveoalase kontrolli kontrollkaart —
 * `/control-forms/foreign-violation/new`.
 */
const NEW = '/control-forms/foreign-violation/new';
const SAVE = { name: 'Salvesta' } as const;

test.describe('Välisriigi rikkumine — validatsioon', () => {
  test('tühja vormi esitamisel kuvatakse kohustuslike väljade vead', async ({
    page,
  }) => {
    await test.step('ava vorm', async () => {
      await page.goto(NEW);
      await expect(page.getByRole('button', SAVE)).toBeVisible();
    });
    await test.step('vajuta Salvesta', async () => {
      await page.getByRole('button', SAVE).click();
    });
    await test.step('kohustuslike väljade vead', async () => {
      for (const id of [
        'reportingCountry',
        'reportingAuthority',
        'inspectionDate',
        'inspectorOrganisation',
      ]) {
        await expectFieldError(page, id);
      }
    });
    await test.step('vormi ei salvestatud', async () => {
      await expect(page).toHaveURL(/\/foreign-violation\/new/);
    });
  });
});

test.describe('Välisriigi rikkumine — salvestamine', () => {
  test('miinimumväljadega kaart salvestub', async ({ page }) => {
    await page.goto(NEW);
    await selectTediOption(page, 'reportingCountry', 'Läti', false);
    await page.locator('#reportingAuthority').fill('Läti transpordiamet');
    await fillMaskedDate(page, 'inspectionDate', '01032026');
    await checkChoiceById(page, 'sanctionCode_KORRAS');
    await checkFirstRadio(page, 'recommendedMeasureCode');
    const first = page.locator('#inspectorFirstName');
    if (!(await first.inputValue())) await first.fill('PW');
    const last = page.locator('#inspectorLastName');
    if (!(await last.inputValue())) await last.fill('Test');
    await selectTediOption(
      page,
      'inspectorOrganisation',
      'Politsei- ja Piirivalveamet',
    );

    await page.getByRole('button', SAVE).click();
    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .toMatch(/\/control-forms\/foreign-violation\/\d+/);
  });
});
