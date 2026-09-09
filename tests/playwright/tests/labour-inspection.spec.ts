import { test, expect } from '../support/fixtures';
import { fillMaskedDate, checkChoiceById, expectFieldError } from '../support/tedi';

/** Tööinspektsiooni kontrollakt — `/control-forms/labour-inspection/new`. */
const NEW = '/control-forms/labour-inspection/new';
const SAVE = { name: 'Salvesta' } as const;

test.describe('Tööinspektsiooni akt — validatsioon', () => {
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
        'inspectorName',
        'inspectionDate',
        'companyName',
        'companyRegCode',
      ]) {
        await expectFieldError(page, id);
      }
    });
  });

  test('tulevikukuupäevaga akti ei salvestata', async ({ page }) => {
    await page.goto(NEW);
    await page.locator('#inspectorName').fill('Inspektor Test');
    await checkChoiceById(page, 'inspectionType_cargo');
    await page.locator('#companyName').fill('Testfirma OÜ');
    await page.locator('#companyRegCode').fill('10000000');
    await fillMaskedDate(page, 'inspectionDate', '01012099');
    await page.getByRole('button', SAVE).click();
    await page.waitForTimeout(1500);
    // muidu korrektne akt ei tohi tulevikukuupäevaga salvestuda
    await expect(page).toHaveURL(/\/labour-inspection\/new/);
  });
});

test.describe('Tööinspektsiooni akt — salvestamine', () => {
  test('miinimumväljadega akt salvestub', async ({ page }) => {
    await page.goto(NEW);
    await page.locator('#inspectorName').fill('Inspektor Test');
    await fillMaskedDate(page, 'inspectionDate', '01032026');
    await checkChoiceById(page, 'inspectionType_cargo');
    await page.locator('#companyName').fill('Testfirma OÜ');
    await page.locator('#companyRegCode').fill('10000000');

    await page.getByRole('button', SAVE).click();
    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .toMatch(/\/control-forms\/labour-inspection\/\d+/);
  });
});
