import { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { checkChoiceById, fillField, searchTable } from '../support/tedi';
import { uniqueTag } from '../support/data';

/**
 * Haldus > Kasutajagrupid (kasutuslood PA-10…PA-19, KH-09…KH-12).
 *
 * Spec loob iga jooksu jaoks uue unikaalse nimega grupi ja muudab ainult
 * seda — seemne grupid (Super Admin / Local Admin / Officer Group) jäävad
 * puutumata, sest teised specid sõltuvad nende õigustest. Grupi kustutamist
 * süsteemis pole.
 */

const PPA = 'Politsei- ja Piirivalveamet';
const JUM = 'Justiitsministeerium';

/** Märgib tabelireal (leitud nähtava teksti järgi) oleva checkboxi. */
async function checkRow(page: Page, table: Locator, rowText: string) {
  const id = await table
    .getByRole('row')
    .filter({ hasText: rowText })
    .first()
    .locator('input[type="checkbox"]')
    .getAttribute('id');
  if (!id) throw new Error(`Rida "${rowText}" checkboxi id-d ei leitud`);
  await checkChoiceById(page, id);
}

/** Märgib tabeli esimese andmerea checkboxi; tagastab rea teksti. */
async function checkFirstDataRow(page: Page, table: Locator): Promise<string> {
  const row = table.locator('tbody tr').first();
  const id = await row.locator('input[type="checkbox"]').getAttribute('id');
  if (!id) throw new Error('Esimese rea checkboxi id-d ei leitud');
  await checkChoiceById(page, id);
  return ((await row.textContent()) ?? '').trim();
}

async function createGroup(page: Page, name: string): Promise<string> {
  await page.goto('/user-groups/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Lisa kasutajagrupp' })).toBeVisible({ timeout: 20_000 });
  await fillField(page, 'groupName', name);
  await checkRow(page, page.locator('#organisations-table'), PPA);
  const perm = await checkFirstDataRow(page, page.locator('#permissions-table'));
  await page.getByRole('button', { name: 'Salvesta' }).click();
  await expect(page).toHaveURL(/\/user-groups\/\d+$/, { timeout: 20_000 });
  return perm;
}

/** Avab detailvaate akordioniploki (kui see on suletud). */
async function openBlock(page: Page, blockId: string) {
  const block = page.locator(`#${blockId}`);
  const look = block.getByRole('button', { name: 'Vaata' });
  if (await look.count()) await look.first().click();
  return block;
}

test.describe('Kasutajagruppide haldus — peakasutaja', () => {
  test('nimekiri ja otsing', async ({ page }) => {
    await test.step('ava kasutajagruppide nimekiri', async () => {
      await page.goto('/user-groups', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Kasutajagruppide haldus' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('button', { name: '+ Lisa kasutajagrupp' })).toBeVisible();
    });
    await test.step('otsi gruppi nime järgi', async () => {
      await searchTable(page, 'group-search', 'user-groups-table', 'Officer Group');
      const table = page.locator('#user-groups-table');
      await expect(table.getByText('Officer Group')).toBeVisible();
      await expect(table.getByText('Local Admin Group')).toHaveCount(0);
    });
    await test.step('ava grupi detailvaade', async () => {
      await page.locator('#user-groups-table').getByRole('link', { name: 'Vaata' }).first().click();
      await expect(page).toHaveURL(/\/user-groups\/\d+$/);
      await expect(page.getByRole('heading', { name: 'Kasutajagrupi andmed' })).toBeVisible();
    });
  });

  test('loomise vorm valideerib nime ja asutuse ning tühistamine küsib kinnitust', async ({ page }) => {
    await page.goto('/user-groups/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Lisa kasutajagrupp' })).toBeVisible({ timeout: 20_000 });

    await test.step('tühja vormi salvestamine näitab vigu', async () => {
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page.getByText('Kasutajagrupi nimetus on kohustuslik')).toBeVisible();
      await expect(page.getByText('Vähemalt üks asutus peab olema valitud')).toBeVisible();
      await expect(page).toHaveURL(/\/user-groups\/new$/);
    });
    await test.step('tühista → kinnitusmodaal → "Ei" jääb lehele', async () => {
      await fillField(page, 'groupName', 'Katkestatav grupp');
      await page.getByRole('button', { name: 'Tühista' }).click();
      await expect(page.getByText('Kas katkestada? Sisestatud andmeid ei salvestata.')).toBeVisible();
      await page.getByRole('button', { name: 'Ei' }).click();
      await expect(page).toHaveURL(/\/user-groups\/new$/);
    });
    await test.step('tühista → "Jah" viib nimekirja', async () => {
      await page.getByRole('button', { name: 'Tühista' }).click();
      await page.getByRole('button', { name: 'Jah' }).click();
      await expect(page).toHaveURL(/\/user-groups$/);
    });
  });

  test('grupi loomine, ümbernimetamine, asutuste ja õiguste muutmine', async ({ page }) => {
    const name = `PW grupp ${uniqueTag()}`;
    const renamed = `${name} (muudetud)`;

    await test.step('loo grupp asutusega PPA ja ühe õigusega', async () => {
      await createGroup(page, name);
      await expect(page.getByText(name).first()).toBeVisible();
    });

    await test.step('nimeta grupp ümber', async () => {
      const block = await openBlock(page, 'block-name');
      await block.getByRole('button', { name: 'Muuda' }).click();
      await fillField(page, 'groupName', renamed);
      await block.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page.getByText(renamed).first()).toBeVisible();
    });

    await test.step('lisa grupile teine asutus (JUM)', async () => {
      const block = await openBlock(page, 'block-orgs');
      await block.getByRole('button', { name: 'Muuda' }).click();
      await checkRow(page, block.locator('#organisations-table'), JUM);
      await block.getByRole('button', { name: 'Salvesta' }).click();
      await expect(block.getByText(JUM)).toBeVisible();
      await expect(block.getByText(PPA)).toBeVisible();
    });

    await test.step('lisa grupile veel üks õigus', async () => {
      const block = await openBlock(page, 'block-perms');
      const before = await block.getByRole('listitem').count();
      // Eelmise ploki salvestus renderdab lehe üle — kordame klõpsu, kuni muutmisrežiim avaneb.
      await expect(async () => {
        await block.getByRole('button', { name: 'Muuda' }).click({ timeout: 2_000 });
        await expect(block.locator('#permissions-table')).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
      const unchecked = block.locator('tbody tr').filter({
        has: page.locator('input[type="checkbox"]:not(:checked)'),
      });
      const id = await unchecked.first().locator('input[type="checkbox"]').getAttribute('id');
      await checkChoiceById(page, id!);
      await block.getByRole('button', { name: 'Salvesta' }).click();
      await expect(block.getByRole('button', { name: 'Muuda' })).toBeVisible();
      await expect.poll(() => block.getByRole('listitem').count()).toBeGreaterThan(before);
    });

    await test.step('muudetud nimi on nimekirjas otsitav', async () => {
      await page.goto('/user-groups', { waitUntil: 'domcontentloaded' });
      await searchTable(page, 'group-search', 'user-groups-table', renamed);
      await expect(page.locator('#user-groups-table').getByText(renamed)).toBeVisible();
    });
  });

  test('kasutaja lisamine gruppi ja eemaldamine grupist', async ({ page }) => {
    await createGroup(page, `PW liikmed ${uniqueTag()}`);
    const groupUrl = page.url();

    await test.step('lisa gruppi ametnik Mari Tamm', async () => {
      await page.getByRole('button', { name: '+ Lisa kasutaja gruppi' }).click();
      await expect(page.getByRole('heading', { name: 'Lisa kasutaja gruppi' })).toBeVisible();
      await searchTable(page, 'user-groupusers-search', 'users-table', 'Tamm');
      await checkRow(page, page.locator('#users-table'), '60002020202');
      await page.getByRole('button', { name: 'Salvesta' }).click();
      await expect(page).toHaveURL(groupUrl);
      await expect(page.getByText('Kasutaja(te) lisamine õnnestus.')).toBeVisible();
      await expect(page.locator('#users-table').getByText('60002020202')).toBeVisible();
    });

    await test.step('eemalda kasutaja grupist (kinnitusmodaal)', async () => {
      // "Eemalda" on href-ita <a> (ModalTrigger) — leiame teksti järgi.
      await page.locator('#users-table').getByRole('row').filter({ hasText: '60002020202' })
        .getByText('Eemalda', { exact: true }).click();
      await expect(page.getByText('Kas olete kindel, et soovite selle kasutaja grupist eemaldada?')).toBeVisible();
      await page.getByRole('button', { name: 'Jah' }).click();
      await expect(page.locator('#users-table').getByText('60002020202')).toHaveCount(0);
    });
  });
});

test.describe('Kasutajagruppide haldus — õigused', () => {
  test('ametnik ei pääse kasutajagruppide lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: 'Kasutajagrupid', exact: true })).toHaveCount(0);
    await page.goto('/user-groups', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Teil puudub ligipääs sellele lehele')).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });
});
