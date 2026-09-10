import { test, expect } from '../support/fixtures';
import {
  fillMaskedDate,
  selectTediOption,
  checkChoiceById,
  expectFieldError,
} from '../support/tedi';

/** Hea maine vorm — `/control-forms/good-repute/new`. */
const NEW = '/control-forms/good-repute/new';
const SAVE = { name: 'Salvesta' } as const;

test.describe('Hea maine vorm — validatsioon', () => {
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
        'personalCode',
        'firstName',
        'lastName',
        'dateOfBirth',
        'certificateNumber',
        'certificateIssueDate',
        'certificateCountryCode',
      ]) {
        await expectFieldError(page, id);
      }
    });
    await test.step('vormi ei salvestatud', async () => {
      await expect(page).toHaveURL(/\/good-repute\/new/);
    });
  });

  test('sobimatuks tunnistamisel muutuvad perioodi väljad kohustuslikuks', async ({
    page,
  }) => {
    await page.goto(NEW);
    await test.step('vali "ei vasta nõuetele"', async () => {
      await checkChoiceById(page, 'fitnessStatus-unfit');
    });
    await test.step('salvesta → perioodi viga', async () => {
      await page.getByRole('button', SAVE).click();
      await expectFieldError(page, 'unfitFromDate');
    });
  });
});

test.describe('Hea maine vorm — salvestamine', () => {
  test('miinimumväljadega vorm salvestub', async ({ page }) => {
    await page.goto(NEW);
    await page.locator('#personalCode').fill('39001010000');
    await page.locator('#firstName').fill('Mati');
    await page.locator('#lastName').fill('Maine');
    await fillMaskedDate(page, 'dateOfBirth', '01011990');
    await page.locator('#certificateNumber').fill('CERT-001');
    await fillMaskedDate(page, 'certificateIssueDate', '01012020');
    await selectTediOption(page, 'certificateCountryCode', 'Eesti');
    await checkChoiceById(page, 'fitnessStatus-fit');

    await page.getByRole('button', SAVE).click();
    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .toMatch(/\/control-forms\/good-repute\/\d+/);
  });
});
