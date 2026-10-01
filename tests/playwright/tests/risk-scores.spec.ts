import { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { applyAndWait, fillField, selectTediOption } from '../support/tedi';
import { recalculateRiskScore } from '../support/api';

/**
 * Riskitasemed (/admin/risk-scores, õigus risk_report.list).
 *
 * Testandmed: DSL/Liquibase/test/20260827100001-risk-score-test-fixtures.sql
 * ja …100002-risk-score-kollane-fixture.sql. Nimekiri täitub alles pärast
 * ümberarvutust — beforeAll kutsub sisemist recalculate'i (nagu Newmani
 * risk-scores kollektsioon):
 *   90000001 "Riskiskoori Test AS Punane"       → Punane
 *   90000002 "Riskiskoori Test OU Nullpunkt"    → Roheline
 *   90000003 "Riskiskoori Test AS Valistatud"   → Kontrollimata (Hall)
 *   90000006 "Riskiskoori Test AS Kollane"      → Kollane
 */

const COMPANIES = ['90000001', '90000002', '90000003', '90000006'];

async function openRiskScores(page: Page) {
  await page.goto('/admin/risk-scores', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Riskitasemed' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#risk-scores-table').getByText('90000001')).toBeVisible();
}

const clickAndReload = (page: Page, name: string) =>
  applyAndWait(page, 'risk-scores-table', 'risk-scores/list', () =>
    page.getByRole('button', { name, exact: true }).click(),
  );

test.describe('Riskitasemed', () => {
  test.beforeAll(async () => {
    for (const regCode of COMPANIES) await recalculateRiskScore(regCode);
  });

  test('nimekiri kuvab arvutatud riskitasemed', async ({ page }) => {
    await openRiskScores(page);
    const table = page.locator('#risk-scores-table');
    await test.step('kõik neli testettevõtet on tabelis', async () => {
      for (const regCode of COMPANIES) await expect(table.getByText(regCode)).toBeVisible();
    });
    await test.step('Punane ettevõte kannab märget "Punane"', async () => {
      const row = table.getByRole('row').filter({ hasText: '90000001' });
      await expect(row.getByText('Punane', { exact: true })).toBeVisible();
    });
  });

  test('filtrid: ettevõtja nimi, registrikood ja riskitase; "Tühjenda" lähtestab', async ({ page }) => {
    await openRiskScores(page);
    const table = page.locator('#risk-scores-table');

    await test.step('ettevõtja nime järgi "Nullpunkt"', async () => {
      await fillField(page, 'risk-scores-filter-company', 'Nullpunkt');
      await clickAndReload(page, 'Otsi');
      await expect(table.getByText('90000002')).toBeVisible();
      await expect(table.getByText('90000001')).toHaveCount(0);
    });

    await test.step('"Tühjenda" taastab täisnimekirja', async () => {
      await clickAndReload(page, 'Tühjenda');
      await expect(page.locator('#risk-scores-filter-company')).toHaveValue('');
      await expect(table.getByText('90000001')).toBeVisible();
    });

    await test.step('registrikoodi järgi 90000006 → Kollane', async () => {
      await fillField(page, 'risk-scores-filter-reg-code', '90000006');
      await clickAndReload(page, 'Otsi');
      const row = table.getByRole('row').filter({ hasText: '90000006' });
      await expect(row.getByText('Kollane', { exact: true })).toBeVisible();
      await expect(table.getByText('90000002')).toHaveCount(0);
      await clickAndReload(page, 'Tühjenda');
    });

    await test.step('riskitaseme järgi "Kontrollimata" → ainult Valistatud', async () => {
      await selectTediOption(page, 'risk-scores-filter-band', 'Kontrollimata');
      await clickAndReload(page, 'Otsi');
      await expect(table.getByText('90000003')).toBeVisible();
      await expect(table.getByText('90000001')).toHaveCount(0);
      await expect(table.getByText('90000006')).toHaveCount(0);
    });
  });
});

test.describe('Riskitasemed — õigused', () => {
  test('ametnik ei näe menüükirjet ega pääse lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: 'Riskitasemed', exact: true })).toHaveCount(0);
    await page.goto('/admin/risk-scores', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Teil puudub ligipääs sellele lehele')).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });
});
