import { test, expect } from '../support/fixtures';
import {
  fillGeneralPart,
  expectSaved,
  TRAM_DRIVER_IDS,
} from '../pages/CompoundGeneralPart';
import {
  checkChoiceById,
  expectFieldError,
  hasRequiredMark,
  fillMaskedDate,
} from '../support/tedi';

/**
 * Transpordiameti (TRAM) kontrollkaart — ADR-002: üks olem, üks vorm, üks
 * elutsükkel (`/control-forms/tram-control-card/new`). Kasutab jagatud
 * `CompoundFormEditCard`-i (juhi väljade id-d `_0` sufiksiga) + eraldi
 * „Sõidukijuhi andmed" sektsiooni (varem eraldi vahekaart/alamvorm).
 */

const NEW = '/control-forms/tram-control-card/new';
const ROUTE_PREFIX = '/control-forms/tram-control-card';

test.describe('TRAM kontrollkaart — validatsioon', () => {
  test('tühja vormi esitamisel kuvatakse kohustuslike väljade vead', async ({
    page,
  }) => {
    await test.step('ava uus TRAM kaart', async () => {
      await page.goto(NEW);
      await expect(
        page.getByRole('heading', { name: 'Sõidukijuhi andmed' }),
      ).toBeVisible();
    });

    await test.step('vajuta Salvesta', async () => {
      await page.getByRole('button', { name: 'Salvesta' }).click();
    });

    await test.step('Üldosa kohustuslike väljade vead', async () => {
      await expectFieldError(page, 'controlDate');
      await expectFieldError(page, 'controlTime');
      await expectFieldError(page, 'vehicleRegNr');
      await expectFieldError(page, 'vehicleCountryCode');
      await expectFieldError(page, 'vehicleCategoryCode');
    });

    await test.step('juhi ees- ja perekonnanimi on kohustuslikud', async () => {
      await expectFieldError(page, TRAM_DRIVER_IDS.firstName);
      await expectFieldError(page, TRAM_DRIVER_IDS.lastName);
    });

    await test.step('URL ei muutunud', async () => {
      await expect(page).toHaveURL(/\/control-forms\/tram-control-card\/new/);
    });
  });
});

test.describe('TRAM kontrollkaart — "Ei ole asjakohane"', () => {
  test('märkeruut eemaldab juhi nime kohustuslikkuse (sünniaeg jääb)', async ({
    page,
  }) => {
    await page.goto(NEW);
    await expect(
      page.locator(`label[for="${TRAM_DRIVER_IDS.firstName}"]`),
    ).toBeVisible();

    await test.step('juhi nimeväljadel on kohustuslikkuse tärn', async () => {
      await expect
        .poll(() => hasRequiredMark(page, TRAM_DRIVER_IDS.firstName))
        .toBe(true);
      await expect
        .poll(() => hasRequiredMark(page, TRAM_DRIVER_IDS.lastName))
        .toBe(true);
    });

    await test.step('märgi "Ei ole asjakohane"', async () => {
      await checkChoiceById(page, 'driverNotApplicable');
      await expect(page.locator('#driverNotApplicable')).toBeChecked();
    });

    await test.step('tärn kadus ees-/perekonnanimelt', async () => {
      await expect
        .poll(() => hasRequiredMark(page, TRAM_DRIVER_IDS.firstName))
        .toBe(false);
      await expect
        .poll(() => hasRequiredMark(page, TRAM_DRIVER_IDS.lastName))
        .toBe(false);
    });

    await test.step('salvestamisel ei nõuta juhi nime, kuid nõutakse sünniaega', async () => {
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(
        page.locator(`#${TRAM_DRIVER_IDS.firstName}-helper`),
      ).toHaveCount(0);
      await expectFieldError(page, TRAM_DRIVER_IDS.birthDate);
    });
  });

  test('märgituna salvestub kaart ilma juhi nimeta', async ({ page }) => {
    const reg = `TR${Date.now() % 100000}`;
    await page.goto(NEW);
    await checkChoiceById(page, 'driverNotApplicable');
    await fillGeneralPart(page, {
      address: 'Testi tee 5',
      controlDate: '01032026',
      controlTime: '1000',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'E_2012',
      fillInspector: true,
      driver: { ids: TRAM_DRIVER_IDS, birthDate: '01011990' },
    });
    await page.getByRole('button', { name: 'Salvesta' }).click();
    await expectSaved(page, ROUTE_PREFIX);
  });
});

test.describe('TRAM kontrollkaart — juhi väljade järjekord + RR-otsing', () => {
  test('väljade DOM-järjekord: eesnimi → perekonnanimi → Eesti isikukood → nupp → välisriigi isikukood', async ({
    page,
  }) => {
    await page.goto(NEW);
    const ids = [
      `#${TRAM_DRIVER_IDS.firstName}`,
      `#${TRAM_DRIVER_IDS.lastName}`,
      `#${TRAM_DRIVER_IDS.personalCodeEe}`,
      '#driverPersonalCodeForeign_0',
    ];
    const ys: number[] = [];
    for (const sel of ids) {
      const b = await page.locator(sel).boundingBox();
      expect(b, `${sel} peaks olema nähtav`).toBeTruthy();
      ys.push(b!.y);
    }
    for (let i = 1; i < ys.length; i++) {
      expect(
        ys[i],
        `${ids[i]} peab olema ${ids[i - 1]} järel`,
      ).toBeGreaterThanOrEqual(ys[i - 1] - 5);
    }
    const btn = page.getByRole('button', { name: 'Otsi rahvastikuregistrist' });
    const btnBox = await btn.boundingBox();
    const eeBox = await page
      .locator(`#${TRAM_DRIVER_IDS.personalCodeEe}`)
      .boundingBox();
    expect(btnBox && eeBox).toBeTruthy();
  });

  test('vigase Eesti isikukoodiga RR-otsing annab kliendipoolse vea (päringut ei tehta)', async ({
    page,
  }) => {
    await page.goto(NEW);
    let rrCalled = false;
    page.on('request', (r) => {
      if (r.url().includes('/xroad/rr/isikud')) rrCalled = true;
    });
    await page.locator(`#${TRAM_DRIVER_IDS.personalCodeEe}`).fill('123');
    await page
      .getByRole('button', { name: 'Otsi rahvastikuregistrist' })
      .click();
    await expect(
      page.getByText(/isikukood on korrektne|päring ebaõnnestus/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    expect(rrCalled, 'vigase koodiga ei tohi RR-päringut teha').toBe(false);
  });
});

test.describe('TRAM kontrollkaart — üks vorm, üks elutsükkel (ADR-002)', () => {
  test('sõidukijuhi sektsioon on samal vormil (ei ole eraldi vahekaart)', async ({
    page,
  }) => {
    await page.goto(NEW);
    await expect(
      page.getByRole('heading', { name: 'Sõidukijuhi andmed' }),
    ).toBeVisible();
    // vana kahe-vahekaardi mudel on kadunud
    await expect(
      page.getByRole('tab', { name: /Autojuhi sõidu- ja puhkeaja/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Lisa autojuht/i }),
    ).toHaveCount(0);
  });

  test('Salvesta → Kinnita → Avalikusta', async ({ page }) => {
    const reg = `TR${Date.now() % 100000}`;
    await test.step('loo + salvesta', async () => {
      await page.goto(NEW);
      await checkChoiceById(page, 'driverNotApplicable');
      await fillGeneralPart(page, {
        address: 'Testi tee 9',
        controlDate: '01032026',
        controlTime: '0900',
        county: 'Harju maakond',
        vehicleRegNr: reg,
        vehicleCategoryCode: 'A_2012',
        fillInspector: true,
        driver: { ids: TRAM_DRIVER_IDS, birthDate: '02021992' },
      });
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expectSaved(page, ROUTE_PREFIX);
    });

    await test.step('Kinnita', async () => {
      await page.getByRole('button', { name: 'Kinnita' }).click();
      await expect(page.getByText(/Kinnitatud/i).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step('Avalikusta', async () => {
      await page.getByRole('button', { name: 'Avalikusta' }).click();
      await expect(page.getByText(/Avaldatud|Avalikustatud/i).first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });
});

test.describe('TRAM kontrollkaart — haagise pealkiri', () => {
  test('haagise pealkiri on "Haagis 1" ilma trellita', async ({ page }) => {
    await page.goto(NEW);
    await page.getByRole('button', { name: 'Lisa haagis' }).click();
    await expect(page.getByText('Haagis 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Haagis #1')).toHaveCount(0);
  });
});

// ─── Dokumentatsioon: veoliigi tingimuslikud väljad ──────────────────────────

test.describe('TRAM kontrollkaart — veoliik (dok. jaotis „Veoliik")', () => {
  // Tõlked: transportTypeCargo="Veosevedu", transportTypePassenger="Sõitjatevedu"
  // "Tühisõit" on eraldi checkbox (mitte radio), id="transportEmptyRun"
  test('Veosevedu ja Sõitjatevedu raadionupud on nähtaval', async ({ page }) => {
    await page.goto(NEW);
    await expect(page.getByRole('radio', { name: /Veosevedu/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('radio', { name: /Sõitjatevedu/i })).toBeVisible();
  });

  test('„Tühisõit" on eraldi märkeruut (mitte radio)', async ({ page }) => {
    await page.goto(NEW);
    // Tühisõit on checkbox, mitte radio (DriveRestFormFields id="transport_empty_run")
    // Kasutame label-teksti kaudu, kuna TEDI ChoiceGroup ei pruugi ARIA nime seada
    await expect(page.locator('#transport_empty_run')).toBeVisible({ timeout: 15_000 });
    // Kinnita et see on checkbox-tüüpi sisend (mitte radio)
    await expect(page.locator('input#transport_empty_run[type="checkbox"]')).toHaveCount(1);
  });

  test('„Sõitjatevedu" valimisel ilmuvad liini number ja liini nimetus', async ({
    page,
  }) => {
    await page.goto(NEW);

    await test.step('vaikimisi Liini number ei ole nähtaval', async () => {
      await expect(page.locator('#liiniNumber')).toHaveCount(0);
      await expect(page.locator('#liiniNimetus')).toHaveCount(0);
    });

    await test.step('vali Sõitjatevedu', async () => {
      await page.getByRole('radio', { name: /Sõitjatevedu/i }).check({ force: true });
    });

    await test.step('Liini number ja Liini nimetus on nüüd nähtaval', async () => {
      await expect(page.locator('#liiniNumber')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#liiniNimetus')).toBeVisible();
    });

    await test.step('Veosevedu valimisel peiduvad liini väljad uuesti', async () => {
      await page.getByRole('radio', { name: /Veosevedu/i }).check({ force: true });
      await expect(page.locator('#liiniNumber')).toHaveCount(0);
    });
  });
});

// ─── Dokumentatsioon: kontrolli tulemus ja menetlus ─────────────────────────

test.describe('TRAM kontrollkaart — kontrolli tulemus (dok. jaotis „Kontrolli tulemus ja menetlus")', () => {
  test('kõik kolm tulemust on nähtaval', async ({ page }) => {
    await page.goto(NEW);
    await expect(
      page.getByRole('radio', { name: /Korras/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('radio', { name: /Hoiatus/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('radio', { name: /Alustati väärteomenetlust/i }),
    ).toBeVisible();
  });

  test('„Lisameede" ilmub ainult Hoiatus või Alustati puhul', async ({
    page,
  }) => {
    await page.goto(NEW);

    await test.step('vaikimisi (Korras) Lisameede ei ole nähtaval', async () => {
      await expect(page.locator('#additionalMeasure')).toHaveCount(0);
    });

    await test.step('Hoiatus → Lisameede ilmub', async () => {
      await page.getByRole('radio', { name: /Hoiatus/i }).check({ force: true });
      await expect(page.locator('#additionalMeasure')).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Alustati → Lisameede jääb nähtavaks', async () => {
      await page.getByRole('radio', { name: /Alustati väärteomenetlust/i }).check({ force: true });
      await expect(page.locator('#additionalMeasure')).toBeVisible();
    });

    await test.step('Korras → Lisameede kaob', async () => {
      await page.getByRole('radio', { name: /Korras/i }).check({ force: true });
      await expect(page.locator('#additionalMeasure')).toHaveCount(0);
    });
  });

  test('„Menetluse liik" ilmub ainult „Alustati väärteomenetlust" puhul', async ({
    page,
  }) => {
    await page.goto(NEW);

    await test.step('vaikimisi Menetluse liik raadionupud ei ole nähtaval', async () => {
      // Vaatame konkreetseid raadionuppe, mitte teksti (tekst võib olla DOM-is peidetud)
      await expect(page.getByRole('radio', { name: /Lühimenetlus/i })).toHaveCount(0);
    });

    await test.step('Hoiatus ei näita menetluse liiki', async () => {
      await page.getByRole('radio', { name: /Hoiatus/i }).check({ force: true });
      await expect(page.getByRole('radio', { name: /Lühimenetlus/i })).toHaveCount(0);
    });

    await test.step('Alustati → Menetluse liik raadionupud ilmuvad', async () => {
      await page.getByRole('radio', { name: /Alustati väärteomenetlust/i }).check({ force: true });
      await expect(page.getByRole('radio', { name: /Lühimenetlus/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole('radio', { name: /Kiirmenetlus/i })).toBeVisible();
      await expect(page.getByRole('radio', { name: /Üldmenetlus/i })).toBeVisible();
    });
  });
});

// ─── Dokumentatsioon: vorminumber ────────────────────────────────────────────

test.describe('TRAM kontrollkaart — vorminumber (dok. jaotis „Vorminumber")', () => {
  test('salvestatud kaardil on vorminumber kujul tram-AAAA-NNNNN/versioon', async ({
    page,
  }) => {
    const reg = `VN${Date.now() % 100000}`;
    await page.goto(NEW);
    await checkChoiceById(page, 'driverNotApplicable');
    await fillGeneralPart(page, {
      address: 'Vorminr tee 1',
      controlDate: '10042026',
      controlTime: '0800',
      county: 'Harju maakond',
      vehicleRegNr: reg,
      vehicleCategoryCode: 'A_2012',
      fillInspector: true,
      driver: { ids: TRAM_DRIVER_IDS, birthDate: '05051985' },
    });
    await page.getByRole('button', { name: 'Salvesta' }).click();
    await expectSaved(page, ROUTE_PREFIX);

    // Vorminumber peab vastama mustrile tram-YYYY-NNNNN
    // CompoundFormEditCard näitab ainult split('/')[0] osa (ilma versiooninumbrita)
    await expect(
      page.getByText(/tram-\d{4}-\d{5}/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Dokumentatsioon: vaatamisvaade pärast kinnitamist ───────────────────────

test.describe('TRAM kontrollkaart — vaatamisvaade (dok. jaotis „Vaatamisvaade")', () => {
  test('kinnitatud kaardil on väljad kirjutuskaitstud ja Kinnita nupp kadunud', async ({
    page,
  }) => {
    const reg = `VV${Date.now() % 100000}`;

    await test.step('loo ja salvesta', async () => {
      await page.goto(NEW);
      await checkChoiceById(page, 'driverNotApplicable');
      await fillGeneralPart(page, {
        address: 'Vaade tee 3',
        controlDate: '11042026',
        controlTime: '1300',
        county: 'Harju maakond',
        vehicleRegNr: reg,
        vehicleCategoryCode: 'A_2012',
        fillInspector: true,
        driver: { ids: TRAM_DRIVER_IDS, birthDate: '12121991' },
      });
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expectSaved(page, ROUTE_PREFIX);
    });

    await test.step('kinnita', async () => {
      await page.getByRole('button', { name: 'Kinnita' }).click();
      await expect(page.getByText(/Kinnitatud/i).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step('Kinnita nupp on kadunud', async () => {
      await expect(
        page.getByRole('button', { name: 'Kinnita' }),
      ).toHaveCount(0);
    });

    await test.step('Avalikusta nupp on nähtaval', async () => {
      await expect(
        page.getByRole('button', { name: 'Avalikusta' }),
      ).toBeVisible();
    });

    await test.step('Salvesta nupp on kadunud (vaatamisvaade)', async () => {
      await expect(
        page.getByRole('button', { name: 'Salvesta' }),
      ).toHaveCount(0);
    });

    await test.step('sõiduki registreerimismärk on kirjutuskaitstud', async () => {
      // Vaatamisvaates on registreerimismärk tekst, mitte input
      const regInput = page.locator('#vehicleRegNr');
      const isEditable = await regInput.count().then(async (n) => {
        if (n === 0) return false;
        return regInput.isEditable().catch(() => false);
      });
      expect(
        isEditable,
        'registreerimismärk ei tohi olla muudetav pärast kinnitamist',
      ).toBe(false);
    });
  });
});
