import { test, expect } from '../support/fixtures';
import {
  fillGeneralPart,
  expectSaved,
  COMPOUND_DRIVER_IDS,
} from '../pages/CompoundGeneralPart';
import { checkChoiceById } from '../support/tedi';

/**
 * ADR kontrollkaart (alamvorm koondvormi sees).
 *
 * ADR vorm avaneb koondvormi loomisvoos (`/control-forms/compound/new?types=adr`),
 * salvestatakse koos üldosaga, ning kinnitatakse (`Kinnita`) seejärel vaatamisvaates.
 *
 * Kinnitamise test katab ka PR #311 fixi: DSL allowlist aktsepteerib nüüd
 * numbrilist id-d (id: type: string eemaldatud).
 *
 * Printimise test veendub, et „Prindi" nupp on nähtaval nii redigeerimis- kui
 * vaatamisvaates (PR #310: AdrFormEditCard + AdrFormViewCard).
 */

const NEW_WITH_ADR = '/control-forms/compound/new?types=adr';

/** Miinimumväljade täitmise abi ADR vormis (veoliik + tulemus). */
async function fillAdrMinimum(page: import('@playwright/test').Page) {
  const tab = page.getByRole('tab', { name: /ADR|ohtlik/i });
  await tab.click();
  // Veoliik (kohustuslik)
  const transportType = page.locator('input[name="transportType"]');
  if (await transportType.count()) {
    await checkChoiceById(page, (await transportType.first().getAttribute('id')) ?? 'transportType-0');
  } else {
    // Proovi radio label
    const cargoLabel = page.getByRole('radio', { name: /Veosevedu|Kaubavedu/i }).first();
    if (await cargoLabel.count()) await cargoLabel.check({ force: true });
  }
  // Kontrolli tulemus (kohustuslik)
  const resultOk = page.getByRole('radio', { name: /Korras/i }).first();
  if (await resultOk.count()) await resultOk.check({ force: true });
}

test.describe('ADR alamvorm — kinnitamine', () => {
  test('ADR alamvorm salvestub ja kinnitatakse edukalt (PR #311 id-tüübi fix)', async ({
    page,
  }) => {
    const reg = `ADR${Date.now() % 100000}`;
    let formId = '';

    await test.step('loo koondvorm ADR alamvormiga', async () => {
      await page.goto(NEW_WITH_ADR);
      await expect(
        page.getByRole('tab', { name: /ADR|ohtlik/i }),
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('täida üldosa miinimumväljad', async () => {
      await fillGeneralPart(page, {
        address: 'Testi tee 99',
        controlDate: '15032026',
        controlTime: '1430',
        county: 'Harju maakond',
        vehicleRegNr: reg,
        vehicleCategoryCode: 'A_2012',
        fillInspector: true,
        driver: {
          ids: COMPOUND_DRIVER_IDS,
          firstName: 'Juht',
          lastName: 'ADR',
          birthDate: '01011985',
        },
      });
    });

    await test.step('täida ADR alamvormi miinimumväljad', async () => {
      await fillAdrMinimum(page);
    });

    await test.step('salvesta koondvorm', async () => {
      // Lülitu tagasi üldosale et salvesta nupp oleks aktiivne
      await page.getByRole('tab', { name: /Üldosa|Kontroll/i }).first().click();
      await page.getByRole('button', { name: 'Salvesta' }).click();
      formId = await expectSaved(page, '/control-forms/compound');
      expect(formId).not.toEqual('');
    });

    await test.step('ava ADR vahekaart ja kinnita', async () => {
      // Pärast salvestamist on koondvorm vaatamisvaates; ADR vahekaart
      await page.goto(`/control-forms/compound/${formId}`);
      await expect(
        page.getByRole('tab', { name: /ADR|ohtlik/i }),
      ).toBeVisible({ timeout: 20_000 });
      await page.getByRole('tab', { name: /ADR|ohtlik/i }).click();

      // Kinnita nupp peaks olema nähtaval (ADR on saved staatuses)
      const confirmBtn = page.getByRole('button', { name: 'Kinnita' });
      await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
      await confirmBtn.click();

      // Kinnitumine — nupp kaob või olek muutub
      await expect(
        page.getByText(/Kinnitatud|kinnitatud/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});

test.describe('ADR alamvorm — prindi nupp (PR #310)', () => {
  test('uuel (salvestamata) koondvormil on ADR vahekaalil „Tühi vorm" nupp', async ({
    page,
  }) => {
    await page.goto(NEW_WITH_ADR);
    await expect(
      page.getByRole('tab', { name: /ADR|ohtlik/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('tab', { name: /ADR|ohtlik/i }).click();

    // Uuel vormil (id puudub) peab olema „Tühi vorm" nupp otse (mitte dropdown)
    await expect(
      page.getByRole('button', { name: /Tühi vorm|tühi/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Aga „Täidetud vorm" EI tohi olla (salvestamata vorm)
    await expect(
      page.getByText(/Täidetud vorm/i).first(),
    ).toHaveCount(0);
  });

  test('salvestatud ADR vormil on „Prindi" dropdown koos mõlema valikuga', async ({
    page,
  }) => {
    const reg = `PRT${Date.now() % 100000}`;
    let formId = '';

    // Loo ja salvesta vorm
    await page.goto(NEW_WITH_ADR);
    await expect(
      page.getByRole('tab', { name: /ADR|ohtlik/i }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Prindi tee 1',
      controlDate: '20032026',
      controlTime: '1000',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'B_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Prindi',
        lastName: 'Test',
        birthDate: '15061990',
      },
    });

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    // Ava ADR vahekaart salvestatud vormil
    await page.goto(`/control-forms/compound/${formId}`);
    await expect(
      page.getByRole('tab', { name: /ADR|ohtlik/i }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: /ADR|ohtlik/i }).click();

    // Prindi dropdown peab olema nähtaval
    const printDropdown = page.getByRole('button', { name: /Prindi/i });
    await expect(printDropdown).toBeVisible({ timeout: 10_000 });

    // Mõlemad valikud on olemas (mock vastus — API kutset ei tehta)
    await page.route('**/v1/control-forms/adr-form/read/print', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          base64: btoa('PDF'),
          contentType: 'application/pdf',
          filename: 'adr-test.pdf',
        }),
      }),
    );

    await printDropdown.click();
    await expect(
      page.getByRole('option', { name: /Täidetud vorm/i }).or(
        page.getByText(/Täidetud vorm/i),
      ).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole('option', { name: /Tühi vorm/i }).or(
        page.getByText(/Tühi vorm/i),
      ).first(),
    ).toBeVisible();
  });

  test('kinnitatud ADR vormil on „Prindi" dropdown vaatamisvaates', async ({
    page,
  }) => {
    const reg = `PRV${Date.now() % 100000}`;
    let formId = '';

    await page.goto(NEW_WITH_ADR);
    await expect(
      page.getByRole('tab', { name: /ADR|ohtlik/i }),
    ).toBeVisible({ timeout: 15_000 });

    await fillGeneralPart(page, {
      address: 'Vaata tee 2',
      controlDate: '21032026',
      controlTime: '1100',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'A_2012',
      fillInspector: true,
      driver: {
        ids: COMPOUND_DRIVER_IDS,
        firstName: 'Vaata',
        lastName: 'Test',
        birthDate: '10101988',
      },
    });

    await page.getByRole('button', { name: 'Salvesta' }).click();
    formId = await expectSaved(page, '/control-forms/compound');

    // Kinnita ADR alamvorm
    await page.goto(`/control-forms/compound/${formId}`);
    await page.getByRole('tab', { name: /ADR|ohtlik/i }).click();
    const confirmBtn = page.getByRole('button', { name: 'Kinnita' });
    await expect(confirmBtn).toBeVisible({ timeout: 15_000 });
    await confirmBtn.click();
    await expect(page.getByText(/Kinnitatud/i).first()).toBeVisible({ timeout: 15_000 });

    // Vaatamisvaates peab Prindi dropdown olema
    await expect(
      page.getByRole('button', { name: /Prindi/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
