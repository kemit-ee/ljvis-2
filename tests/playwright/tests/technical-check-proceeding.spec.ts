import { test, expect } from '../support/fixtures';
import {
  fillGeneralPart,
  expectSaved,
  COMPOUND_DRIVER_IDS,
} from '../pages/CompoundGeneralPart';
import { checkChoiceById } from '../support/tedi';
import { apiGet } from '../support/api';

/**
 * Tehnokaardi (sõiduki tehnonõuetele vastavuse kontrollvorm) väärteomenetluse
 * märke eemaldamine: nupp „Eemalda märge“ viitenumbri välja all küsib kinnitust,
 * tühjendab menetluse liigi ja viitenumbri ning pärast salvestamist tekib
 * tehnokaardile uus salvestusversioon (`revision` kasvab, vana jääb ajalukku).
 */

const NEW = '/control-forms/compound/new?types=vehicle-technical';
const TAB = /Mootorsõiduki tehnonõuetele/i;
const TYPE_SUMMARY = 'vehicle-proceedingType-summary';
const REF = '#vehicle-proceedingReferenceNumber';
const CLEAR = '#vehicle-clearProceeding';

interface TechnicalSnapshot {
  revision: number;
  proceedingType?: string | null;
  proceedingReferenceNumber?: string | null;
}

/** Tehnokaardi viimane salvestatud seis API-st (koondvormi võtme järgi). */
async function latestSnapshot(compoundFormKey: string): Promise<TechnicalSnapshot> {
  const list = await apiGet(
    'superadmin',
    `/ljvis/v1/control-forms/vehicle-technical/get-by-compound-form-key?compoundFormKey=${compoundFormKey}`,
  );
  expect(list.status).toBe(200);
  const rows = (list.body as { response?: { id: string }[] }).response ?? [];
  expect(rows).toHaveLength(1);
  // loendi `id` on tehnokaardi võti; täisvorm (koos menetluse väljadega) tuleb võtme järgi
  const full = await apiGet('superadmin', `/ljvis/v1/control-forms/vehicle-technical?q=${rows[0].id}`);
  expect(full.status).toBe(200);
  return (full.body as { response: TechnicalSnapshot }).response;
}

const CONFIRM_TEXT = 'Kas oled kindel, et soovid menetluse info eemaldada?';

test('väärteomenetluse märke saab kinnitusega eemaldada, salvestada ja uus versioon tekib', async ({
  page,
}) => {
  const reg = `PW${Date.now() % 100000}`;
  const refNumber = `VM-PW-${Date.now() % 100000}`;
  const dialog = page.getByRole('dialog');
  await test.step('täida koondvorm ja tehnokaart menetluse märkega', async () => {
    await page.goto(NEW);
    await fillGeneralPart(page, {
      address: 'Testi tee 1',
      controlDate: '01032026',
      controlTime: '1200',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'A_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Juht',
        lastName: 'Testija',
        birthDate: '01011990',
      },
    });
    await page.getByRole('tab', { name: TAB }).click();
    await checkChoiceById(page, 'vehicle-resultType-extraordinary_inspection');
    await expect(page.locator(CLEAR)).toHaveCount(0);
    await checkChoiceById(page, TYPE_SUMMARY);
    await page.locator(REF).fill(refNumber);
    await expect(page.locator(CLEAR)).toBeVisible();
  });

  let id = '';
  await test.step('salvesta — esimene salvestusversioon kannab märget', async () => {
    await page.getByRole('button', { name: 'Salvesta' }).click();
    id = await expectSaved(page, '/control-forms/compound');
    await page.getByRole('tab', { name: TAB }).click();
    const first = await latestSnapshot(id);
    expect(first.revision).toBe(1);
    expect(first.proceedingType).toBe('summary');
    expect(first.proceedingReferenceNumber).toBe(refNumber);
  });

  await test.step('„Tühista“ jätab märke alles', async () => {
    await page.locator(CLEAR).click();
    await expect(dialog.getByText(CONFIRM_TEXT)).toBeVisible();
    await dialog.getByRole('button', { name: 'Tühista' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(`#${TYPE_SUMMARY}`)).toBeChecked();
    await expect(page.locator(REF)).toHaveValue(refNumber);
  });

  await test.step('kinnitamine tühjendab liigi ja viitenumbri', async () => {
    await page.locator(CLEAR).click();
    await expect(dialog.getByText(CONFIRM_TEXT)).toBeVisible();
    await dialog.getByRole('button', { name: 'Eemalda märge' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(`#${TYPE_SUMMARY}`)).not.toBeChecked();
    await expect(page.locator(REF)).toHaveCount(0);
    await expect(page.locator(CLEAR)).toHaveCount(0);
  });

  await test.step('liigi uuesti valimisel on viitenumbri väli tühi', async () => {
    await checkChoiceById(page, TYPE_SUMMARY);
    await expect(page.locator(REF)).toHaveValue('');
    await page.locator(CLEAR).click();
    await dialog.getByRole('button', { name: 'Eemalda märge' }).click();
    await expect(page.locator(REF)).toHaveCount(0);
  });

  await test.step('salvesta — tekib uus salvestusversioon ilma märketa', async () => {
    await page.getByRole('button', { name: 'Salvesta' }).click();
    await expect
      .poll(async () => (await latestSnapshot(id)).revision, { timeout: 15_000 })
      .toBe(2);
    const second = await latestSnapshot(id);
    expect(second.proceedingType ?? '').toBe('');
    expect(second.proceedingReferenceNumber ?? '').toBe('');
  });

  await test.step('uuesti laetud vormil märget enam ei ole', async () => {
    await page.goto(`/control-forms/compound/${id}`);
    await page.getByRole('tab', { name: TAB }).click({ timeout: 15_000 });
    await expect(
      page.locator('#vehicle-resultType-extraordinary_inspection'),
    ).toBeChecked();
    await expect(page.locator(`#${TYPE_SUMMARY}`)).not.toBeChecked();
    await expect(page.locator(REF)).toHaveCount(0);
  });
});
