import { test, expect } from '../support/fixtures';
import {
  fillGeneralPart,
  expectSaved,
  COMPOUND_DRIVER_IDS,
} from '../pages/CompoundGeneralPart';
import {
  checkChoiceById,
  expectFieldError,
  selectTediOption,
} from '../support/tedi';

/**
 * Koondvorm (PPA) — `/control-forms/compound/new`.
 * Loomisleht vajab vähemalt üht alamvormi vahekaarti (`?types=driver`),
 * muidu on „Salvesta" nupp keelatud.
 */

// Loomisleht vajab vähemalt üht avatud alamvormi vahekaarti, et „Salvesta"
// nupp lubatuks muutuks. Autoveo katkestamise alamvormil pole kohustuslikke
// välju, seega ei sega see Üldosa validatsiooni ega salvestamise testimist.
const NEW = '/control-forms/compound/new?types=transport-interruption';
const SAVE = { name: 'Salvesta' } as const;

test.describe('Koondvorm — validatsioon', () => {
  test('tühja vormi esitamisel kuvatakse kohustuslike väljade vead', async ({
    page,
  }) => {
    await test.step('ava uus koondvorm', async () => {
      await page.goto(NEW);
      await expect(
        page.getByRole('heading', { name: 'Kontrolli koht' }),
      ).toBeVisible();
    });

    await test.step('vajuta Salvesta ilma väljadeta', async () => {
      await page.getByRole('button', SAVE).click();
    });

    await test.step('kohustuslike väljade vead on nähtavad', async () => {
      // Inspektori plokk on kasutajaandmetest eeltäidetud — kontrollime
      // ainult kindlasti tühje välju.
      await expectFieldError(page, 'controlDate');
      await expectFieldError(page, 'controlTime');
      await expectFieldError(page, 'vehicleRegNr');
      await expectFieldError(page, 'vehicleCountryCode');
      await expectFieldError(page, 'vehicleCategoryCode');
      await expectFieldError(page, 'address'); // aadress-või-maantee reegel
    });

    await test.step('vormi ei salvestatud (URL ei muutunud)', async () => {
      await expect(page).toHaveURL(/\/control-forms\/compound\/new/);
      await expect(page.getByText('Vorm on salvestatud')).toHaveCount(0);
    });
  });

  test('maantee valimisel muutub kilomeeter kohustuslikuks', async ({ page }) => {
    await page.goto(NEW);
    await test.step('vali maantee', async () => {
      await selectTediOption(page, 'road', 'TALLINNA–NARVA TEE (TEE NR 1)');
      await expect(
        page.locator('#road-input').locator('xpath=ancestor::*[contains(@class,"select__control")][1]'),
      ).toContainText('TALLINNA');
    });
    await test.step('salvesta ilma kilomeetrita → viga', async () => {
      await page.getByRole('button', SAVE).click();
      await expectFieldError(page, 'kilometer');
    });
  });

  test('ettevõtte nime sisestamisel muutub riik kohustuslikuks', async ({
    page,
  }) => {
    await page.goto(NEW);
    await page.locator('#companyName').fill('Testfirma OÜ');
    await page.getByRole('button', SAVE).click();
    await expectFieldError(page, 'companyCountryCode');
  });

  test('sõiduki kategooria "Muu" nõuab täpsustust', async ({ page }) => {
    await page.goto(NEW);
    await test.step('vali kategooria "Muu"', async () => {
      await checkChoiceById(page, 'vehicleCat-OTHER_2012');
    });
    await test.step('täpsustuse väli ilmub', async () => {
      await expect(page.locator('#vehicleCategoryOther')).toBeVisible();
    });
    await test.step('salvesta tühja täpsustusega → viga', async () => {
      await page.getByRole('button', SAVE).click();
      await expectFieldError(page, 'vehicleCategoryOther');
    });
  });

  test('aadress ei tohi ületada 300 tähemärki', async ({ page }) => {
    await page.goto(NEW);
    await page.locator('#address').fill('x'.repeat(305));
    await expect(page.locator('#address')).toHaveValue('x'.repeat(300));
  });
});

test.describe('Koondvorm — salvestamine', () => {
  test('miinimumväljadega koondvorm salvestub ja väärtused püsivad', async ({
    page,
  }) => {
    const reg = `PW${Date.now() % 100000}`;

    await test.step('ava ja täida miinimumväljad', async () => {
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
    });

    let id = '';
    await test.step('salvesta', async () => {
      await page.getByRole('button', SAVE).click();
      id = await expectSaved(page, '/control-forms/compound');
      expect(id).not.toEqual('');
    });

    await test.step('lae vaade uuesti — sisestatud andmed on alles', async () => {
      await page.goto(`/control-forms/compound/${id}`);
      await expect(page.getByText(reg).first()).toBeVisible({ timeout: 15_000 });
    });
  });
});

test.describe('Koondvorm — #280 muudatused', () => {
  test('P2: kategooriad (e) M2 ja (f) M3 — sulgudes selgitus ei murra ridu', async ({
    page,
  }) => {
    await page.goto(NEW);
    const e = page.locator('label[for="vehicleCat-E_2012"]');
    const f = page.locator('label[for="vehicleCat-F_2012"]');
    await expect(e).toContainText('M2');
    await expect(f).toContainText('M3');
    // sildid on ühel visuaalsel real (kõrgus ≈ üks tekstirida, mitte topelt)
    const eBox = await e.boundingBox();
    const fBox = await f.boundingBox();
    expect(eBox && fBox).toBeTruthy();
    expect(eBox!.height, '(e) silt ei tohi murda kahele reale').toBeLessThan(30);
    expect(fBox!.height, '(f) silt ei tohi murda kahele reale').toBeLessThan(30);
  });

  test('P2: "Muu" täpsustusväli on "Muu" raadionupu vahetus läheduses', async ({
    page,
  }) => {
    await page.goto(NEW);
    await checkChoiceById(page, 'vehicleCat-OTHER_2012');
    const rBox = await page
      .locator('label[for="vehicleCat-OTHER_2012"]')
      .boundingBox();
    const fBox = await page.locator('#vehicleCategoryOther').boundingBox();
    expect(rBox && fBox).toBeTruthy();
    expect(fBox!.y).toBeGreaterThan(rBox!.y - 5);
    expect(fBox!.y - rBox!.y, '"Muu" väli peab olema raadio vahetus läheduses').toBeLessThan(
      160,
    );
  });

  test('P4: ettevõtte nime otsing kuvab "ei leitud" (X-tee mock)', async ({
    page,
  }) => {
    await page.goto(NEW);
    await page.locator('#companyName').fill('Mittetuntud Firma AS');
    // Nimevälja kõrval on eraldi otsingunupp (regikoodi otsingust eraldi).
    await page
      .locator('#companyName')
      .locator('xpath=following::button[1]')
      .click();
    await expect(
      page.getByText(/ei tagastanud|ei leitud|tulemus/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
