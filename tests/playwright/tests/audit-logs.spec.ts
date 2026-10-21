import { readFile } from 'node:fs/promises';
import { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { apiGet, organisationId, seedAuditEvent } from '../support/api';
import { uniqueTag } from '../support/data';
import { searchTable } from '../support/tedi';

/**
 * Haldus > Logid (auditilogi; õigused audit.read, audit.read.local, audit.verify).
 *
 * beforeAll lisab kolm unikaalse markeriga auditisündmust (JUM, PPA, asutuseta)
 * sama Resql-i teega, mida Newmani audit-log kollektsioon kasutab. Ahela
 * terviklikkuse kontrollil (GET /v1/logs/verify) UI-d pole — see kontrollitakse
 * API kaudu sama spec'i sees.
 */

const MARKER = `PWAUDIT-${uniqueTag('')}`;

async function openLogs(page: Page) {
  await page.goto('/logs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Logid', exact: true })).toBeVisible({ timeout: 20_000 });
}

async function searchLogs(page: Page, query: string) {
  await searchTable(page, 'log-search', 'logs-table', query);
}

test.describe('Auditilogi', () => {
  test.beforeAll(async () => {
    await seedAuditEvent(`${MARKER} JUM`, await organisationId('JUM'));
    await seedAuditEvent(`${MARKER} PPA`, await organisationId('PPA'));
    await seedAuditEvent(`${MARKER} SYS`);
  });

  test('otsing ja auditikirje detailvaade', async ({ page }) => {
    await openLogs(page);
    await test.step('otsing markeri järgi leiab kõik kolm kirjet', async () => {
      await searchLogs(page, MARKER);
      const table = page.locator('#logs-table');
      await expect(table.getByText(`${MARKER} JUM`)).toBeVisible();
      await expect(table.getByText(`${MARKER} PPA`)).toBeVisible();
      await expect(table.getByText(`${MARKER} SYS`)).toBeVisible();
    });
    await test.step('ava kirje detailvaade', async () => {
      const row = page.locator('#logs-table').getByRole('row').filter({ hasText: `${MARKER} PPA` });
      await row.getByRole('link', { name: 'Vaata' }).or(row.getByRole('button', { name: 'Vaata' })).first().click();
      await expect(page).toHaveURL(/\/logs\/[^/]+$/);
      await expect(page.getByRole('heading', { name: 'Auditikirje', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Auditikirje andmed' })).toBeVisible();
      await expect(page.getByText(`${MARKER} PPA`)).toBeVisible();
      await expect(page.getByText('Playwright Audit Seeder')).toBeVisible();
    });
  });

  test('CSV eksport laadib alla semikooloniga eraldatud faili', async ({ page }) => {
    await openLogs(page);
    await searchLogs(page, MARKER);
    await expect(page.locator('#logs-table').getByText(`${MARKER} JUM`)).toBeVisible();

    const download = await test.step('vajuta "Ekspordi CSV"', async () => {
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Ekspordi CSV' }).click(),
      ]);
      return dl;
    });
    await test.step('failinimi ja sisu vastavad ootusele', async () => {
      expect(download.suggestedFilename()).toMatch(/^audit_log_export_\d{8}_\d{6}\.csv$/);
      const content = await readFile((await download.path())!, 'utf8');
      const header = content.replace(/^﻿/, '').split(/\r?\n/)[0];
      expect(header).toContain(';');
      expect(content).toContain(MARKER);
    });
  });

  test('auditiahela terviklikkuse kontroll (API): peakasutaja 200, kohalik admin 403', async () => {
    await test.step('Super Admin (audit.verify) saab kontrolli tulemuse', async () => {
      const res = await apiGet('superadmin', '/ljvis/v1/logs/verify');
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).toMatch(/"ok"\s*:\s*true/);
    });
    await test.step('Org Admin (ainult audit.read.local) saab 403', async () => {
      const res = await apiGet('orgadmin', '/ljvis/v1/logs/verify');
      expect(res.status).toBe(403);
    });
  });
});

test.describe('Auditilogi — asutusepõhine ulatus ja õigused', () => {
  test.describe('lokaalne kontohaldur', () => {
    test.use({ storageState: STORAGE_STATE.orgadmin });

    test('näeb ainult oma asutuse (JUM) auditikirjeid', async ({ page }) => {
      await seedAuditEvent(`${MARKER}-scope JUM`, await organisationId('JUM'));
      await seedAuditEvent(`${MARKER}-scope PPA`, await organisationId('PPA'));
      await openLogs(page);
      await searchLogs(page, `${MARKER}-scope`);
      const table = page.locator('#logs-table');
      await expect(table.getByText(`${MARKER}-scope JUM`)).toBeVisible();
      await expect(table.getByText(`${MARKER}-scope PPA`)).toHaveCount(0);
    });
  });

  test('ametnik ei näe menüükirjet ega pääse logide lehele', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('menuitem', { name: 'Logid', exact: true })).toHaveCount(0);
    await page.goto('/logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Teil puudub ligipääs sellele lehele')).toBeVisible({ timeout: 20_000 });
    await ctx.close();
  });
});
