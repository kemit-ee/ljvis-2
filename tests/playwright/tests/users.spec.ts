import { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { searchTable, selectTediOption } from '../support/tedi';
import { etDate, uniquePersonalCode, uniqueTag } from '../support/data';

/**
 * Haldus > Kasutajad (kasutuslood PA-01…PA-09, KH-01…KH-08).
 *
 * Testandmed: tests/bootstrap/seed_test_data.sql — Super Admin (PPA),
 * Org Admin (JUM, lokaalne kontohaldur), Mari Tamm (PPA, ametnik).
 * Spec loob ainult unikaalse isikukoodiga uusi kasutajaid; seemne kasutajaid
 * ei muudeta. Kustutamist süsteemis pole — kasutaja deaktiveeritakse
 * ligipääsu lõppkuupäevaga.
 */

const PPA = 'Politsei- ja Piirivalveamet';
const JUM = 'Justiitsministeerium';

async function openUserList(page: Page) {
  await page.goto('/users', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Kasutajad', exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Tipib välja nagu kasutaja (klahv-klahvilt). Kasutaja vormil käivitab
 * isikukoodi sisestus RR-päringu ja asünkroonse duplikaadikontrolli; korraga
 * `fill()`-iga (sisuliselt kleepimine) pandud järgmiste väljade väärtused
 * võivad selle ajal Formikusse jõudmata jääda — vt testiraporti leid.
 */
async function typeField(page: Page, id: string, value: string) {
  const input = page.locator(`#${id}`);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay: 40 });
}

async function searchUsers(page: Page, query: string) {
  await searchTable(page, 'users-search', 'users-table', query);
}

/** Täidab kasutaja loomise vormi kohustuslikud väljad ja salvestab. */
async function createUser(page: Page, data: { firstName: string; lastName: string; personalCode: string }) {
  await page.goto('/users/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Lisa kasutaja' })).toBeVisible({ timeout: 20_000 });
  await typeField(page, 'firstName', data.firstName);
  await typeField(page, 'lastName', data.lastName);
  await typeField(page, 'personalCode', data.personalCode);
  // RR-päring + duplikaadikontroll lõpevad (CI-s RR vastab "Isikut ei leitud").
  await expect(page.getByText(/Isikut ei leitud|Sisestage kehtiv Eesti isikukood/)).toBeVisible().catch(() => {});
  await selectTediOption(page, 'organisationId', PPA);
  await typeField(page, 'jobTitleName', 'Testinspektor');
  await typeField(page, 'email', `${data.personalCode}@ljvis.test`);
  await fillDate(page, 'accessStart', etDate(0));
  await page.getByRole('button', { name: 'Salvesta' }).click();
  await expect(page).toHaveURL(/\/users\/\d+$/, { timeout: 20_000 });
  await expect(page.getByText('Uus kasutaja lisatud.')).toBeVisible();
}

/** Seob kasutaja grupiga detailvaate "Kasutajagrupid" kaardil. */
async function linkGroup(page: Page, groupName: string) {
  await page.getByRole('button', { name: 'Seo kasutajagrupp' }).first().click();
  // TEDI Select on siin readonly (aria-readonly) — avame ja valime valiku klõpsuga.
  const combo = page.getByRole('combobox', { name: 'Vali kasutajagrupp' });
  await combo.focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('option', { name: groupName, exact: true }).click();
  await page.getByRole('button', { name: 'Lisa seos' }).click();
  await page.getByRole('button', { name: 'Salvesta' }).last().click();
  await expect(page.getByText('Kasutajagrupid on salvestatud.')).toBeVisible();
  await expect(page.getByText(groupName).first()).toBeVisible();
}

/** TEDI DateField: tipime kogu kuupäeva PP.KK.AAAA ja lahkume väljalt. */
async function fillDate(page: Page, id: string, value: string) {
  const input = page.locator(`#${id}`);
  await input.click();
  await input.fill('');
  await input.pressSequentially(value, { delay: 15 });
  await input.press('Tab');
}

test.describe('Kasutajate haldus — peakasutaja', () => {
  test('kasutajate nimekiri, otsing nime järgi ja detailvaade', async ({ page }) => {
    await test.step('ava kasutajate nimekiri', async () => {
      await openUserList(page);
      await expect(page.locator('#users-table')).toBeVisible();
      await expect(page.getByRole('link', { name: '+ Lisa kasutaja' }).or(
        page.getByRole('button', { name: '+ Lisa kasutaja' }),
      )).toBeVisible();
    });
    await test.step('otsi ametnikku nime järgi "Tamm"', async () => {
      await searchUsers(page, 'Tamm');
      const table = page.locator('#users-table');
      await expect(table.getByText('60002020202')).toBeVisible();
      await expect(table.getByText('Mari')).toBeVisible();
      await expect(table.getByText('60001019906')).toHaveCount(0);
    });
    await test.step('ava kasutaja detailvaade', async () => {
      await page.locator('#users-table').getByRole('link', { name: 'Vaata' }).first().click();
      await expect(page).toHaveURL(/\/users\/\d+$/);
      await expect(page.getByRole('heading', { name: /Mari Tamm/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Isikuandmed' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Kasutajagrupid' })).toBeVisible();
    });
  });

  test('otsing isikukoodi järgi leiab kasutaja', async ({ page }) => {
    // Administraatori juhend (02-kasutajad.md §3) ja list_users.sql kirjeldus
    // lubavad otsingut ka isikukoodi järgi.
    await openUserList(page);
    await searchUsers(page, '60002020202');
    await expect(page.locator('#users-table').getByText('60002020202')).toBeVisible();
  });

  test('loomise vorm valideerib kohustuslikud väljad, isikukoodi ja e-posti', async ({ page }) => {
    await page.goto('/users/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Lisa kasutaja' })).toBeVisible({ timeout: 20_000 });

    await test.step('tühja vormi salvestamine näitab kohustuslike väljade vigu', async () => {
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page.getByText('Kohustuslik väli').first()).toBeVisible();
      await expect(page).toHaveURL(/\/users\/new$/);
    });
    await test.step('lühike isikukood ja vigane e-post annavad veateate', async () => {
      await typeField(page, 'personalCode', '12345');
      await typeField(page, 'email', 'vigane-epost');
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page.getByText('Isikukood peab olema 11 numbrit')).toBeVisible();
      await expect(page.getByText('Vigane e-posti formaat')).toBeVisible();
    });
    await test.step('olemasolev isikukood annab duplikaadi vea', async () => {
      await typeField(page, 'personalCode', '60002020202');
      await page.locator('#firstName').click();
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page.getByText('Sellise isikukoodiga kasutaja on juba olemas')).toBeVisible();
    });
  });

  test('uue kasutaja loomine, andmete muutmine, grupi sidumine ja deaktiveerimine', async ({ page }) => {
    const tag = uniqueTag();
    const personalCode = uniquePersonalCode();

    await test.step('loo uus kasutaja (PPA)', async () => {
      await createUser(page, { firstName: 'Test', lastName: tag, personalCode });
      await expect(page.getByRole('heading', { name: `Test ${tag}` })).toBeVisible();
      await expect(page.getByText('Aktiivne').first()).toBeVisible();
    });

    await test.step('uus kasutaja leitakse nimekirjast', async () => {
      const detailUrl = page.url();
      await openUserList(page);
      await searchUsers(page, tag);
      await expect(page.locator('#users-table').getByText(personalCode)).toBeVisible();
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: `Test ${tag}` })).toBeVisible({ timeout: 20_000 });
    });

    await test.step('muuda ametinimetust', async () => {
      await page.getByRole('button', { name: 'Muuda' }).first().click();
      await typeField(page, 'jobTitleName', `Vaneminspektor ${tag}`);
      await page.getByRole('button', { name: 'Salvesta' }).first().click();
      await expect(page.getByText('Muudatused on salvestatud.')).toBeVisible();
      await expect(page.getByText(`Vaneminspektor ${tag}`)).toBeVisible();
    });

    await test.step('seo kasutaja kasutajagrupiga "Officer Group"', async () => {
      await linkGroup(page, 'Officer Group');
    });

    await test.step('deaktiveeri kasutaja: ligipääsu lõpp tänane kuupäev', async () => {
      await page.getByRole('button', { name: 'Muuda' }).first().click();
      await fillDate(page, 'accessEnd', etDate(0));
      await page.getByRole('button', { name: 'Salvesta' }).first().click();
      await expect(page.getByText('Muudatused on salvestatud.')).toBeVisible();
      await expect(page.getByText(/Deaktiveeritakse|Mitteaktiivne/).first()).toBeVisible();
    });
  });

  test('grupiga kasutaja asutuse muutmine: kinnitusmodaal, tühistamine ja kinnitamine', async ({ page }) => {
    const tag = uniqueTag();
    await createUser(page, { firstName: 'Asutus', lastName: tag, personalCode: uniquePersonalCode() });
    await linkGroup(page, 'Officer Group');

    await test.step('vali muutmisel teine asutus ja salvesta → kinnitusmodaal', async () => {
      await page.getByRole('button', { name: 'Muuda' }).first().click();
      await selectTediOption(page, 'organisationId', JUM);
      await page.getByRole('button', { name: 'Salvesta' }).first().click();
      await expect(
        page.getByText('Asutuse muutmine eemaldab kasutajalt kõik kasutajagrupid. Kas soovite jätkata?'),
      ).toBeVisible();
    });
    await test.step('tühista modaal ja muutmine — asutus ja grupp jäävad alles', async () => {
      await page.getByRole('dialog').getByRole('button', { name: 'Tühista' }).click();
      await page.getByRole('button', { name: 'Tühista' }).first().click();
      await expect(page.getByText(PPA).first()).toBeVisible();
      await expect(page.getByText('Officer Group').first()).toBeVisible();
    });
    await test.step('muuda uuesti ja kinnita "Jah, muuda" — asutus muutub, grupid eemaldatakse', async () => {
      await page.getByRole('button', { name: 'Muuda' }).first().click();
      await selectTediOption(page, 'organisationId', JUM);
      await page.getByRole('button', { name: 'Salvesta' }).first().click();
      await page.getByRole('button', { name: 'Jah, muuda' }).click();
      await expect(page.getByText('Muudatused on salvestatud.')).toBeVisible();
      await expect(page.getByText(JUM).first()).toBeVisible();
      await expect(page.getByText('Kasutaja ei ole seotud ühegi kasutajagrupiga')).toBeVisible();
    });
  });
});

test.describe('Kasutajate haldus — lokaalne kontohaldur', () => {
  test.use({ storageState: STORAGE_STATE.orgadmin });

  test('näeb ainult oma asutuse (JUM) kasutajaid', async ({ page }) => {
    await openUserList(page);
    await test.step('oma asutuse kasutaja on nimekirjas', async () => {
      await searchUsers(page, 'Admin');
      await expect(page.locator('#users-table').getByText('60001017727')).toBeVisible();
    });
    await test.step('teise asutuse (PPA) kasutajat ei leita', async () => {
      await searchUsers(page, 'Tamm');
      await expect(page.locator('#users-table').getByText('60002020202')).toHaveCount(0);
    });
  });
});

test.describe('Kasutajate haldus — õigused', () => {
  test('ametnik ei näe menüükirjet ega pääse kasutajate lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: 'Kasutajad', exact: true })).toHaveCount(0);
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Teil puudub ligipääs sellele lehele')).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });
});
