import { Locator, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { STORAGE_STATE } from '../playwright.config';
import { applyAndWait, fillField, selectTediOption } from '../support/tedi';
import { seedInAppNotification, seedOutboundLog } from '../support/api';
import { uniqueTag } from '../support/data';

/**
 * Teavitused (/notifications): rakendusesisesed teavitused ja "Saadetud kirjad"
 * (väljuvate kirjade logi, õigus notification.list; uuesti saatmine
 * notification.resend). Postkasti mallide seadeid katab eraldi
 * notification-template-mapping.spec.ts.
 *
 * Testandmed lisatakse Resql-i kaudu (sama tee, mida Newmani notifications
 * kollektsioon kasutab), igal jooksul unikaalse tunnusega.
 */

const TAG = uniqueTag();

/** Teavituse "rida" — lähim div, mis sisaldab pealkirja ja tegevusnuppe. */
function notificationRow(page: Page, title: string): Locator {
  return page.getByText(title, { exact: true }).locator('xpath=ancestor::div[.//button][1]');
}

const searchOutbound = (page: Page) =>
  applyAndWait(page, 'outbound-log-table', 'outbound-log/list', () =>
    page.getByRole('button', { name: 'Otsi', exact: true }).click(),
  );

async function openNotifications(page: Page) {
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Teavitused', exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('Rakendusesisesed teavitused', () => {
  const titleA = `PW teavitus A ${TAG}`;
  const titleB = `PW teavitus B ${TAG}`;

  test.beforeAll(async () => {
    await seedInAppNotification({ relatedEntityId: `PW-A-${TAG}`, title: titleA });
    await seedInAppNotification({ relatedEntityId: `PW-B-${TAG}`, title: titleB });
  });

  test('lugemata teavituse märkimine loetuks ja kella loendur', async ({ page }) => {
    await openNotifications(page);
    const bell = page.getByRole('button', { name: /^Teavitused \(\d+ lugemata\)$/ });

    const before = await test.step('kellal on lugemata teavituste arv', async () => {
      await expect(bell).toBeVisible();
      const label = (await bell.getAttribute('aria-label')) ?? '';
      return Number(label.match(/\((\d+) lugemata\)/)?.[1] ?? 0);
    });

    await test.step('teavitus A on märgitud "Lugemata"', async () => {
      const row = notificationRow(page, titleA);
      await expect(row.getByText('Lugemata')).toBeVisible();
      await expect(row.getByText(`${titleA} — sisu`)).toBeVisible();
    });

    await test.step('"Märgi loetuks" eemaldab märke ja vähendab loendurit', async () => {
      const row = notificationRow(page, titleA);
      await row.getByRole('button', { name: 'Märgi loetuks' }).click();
      await expect(row.getByText('Lugemata')).toHaveCount(0);
      await expect
        .poll(async () => {
          const label = (await page.getByRole('button', { name: /^Teavitused/ }).first().getAttribute('aria-label')) ?? '';
          return Number(label.match(/\((\d+) lugemata\)/)?.[1] ?? 0);
        })
        .toBeLessThan(before);
    });
  });

  test('"Märgi kõik loetuks" märgib kõik teavitused loetuks', async ({ page }) => {
    await openNotifications(page);
    await expect(notificationRow(page, titleB).getByText('Lugemata')).toBeVisible();
    await test.step('vajuta "Märgi kõik loetuks"', async () => {
      await page.getByRole('button', { name: 'Märgi kõik loetuks' }).click();
    });
    await test.step('ühtegi "Lugemata" märget ei jää ja kell on ilma loendurita', async () => {
      await expect(page.getByText('Lugemata', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Teavitused', exact: true })).toBeVisible();
    });
  });
});

test.describe('Saadetud kirjad (väljuvate teavituste logi)', () => {
  const key = `pw-${TAG}`;
  const recipient = `${TAG.toLowerCase()}@example.test`;

  test.beforeAll(async () => {
    await seedOutboundLog({ notificationKey: key, recipient });
  });

  async function openOutbound(page: Page) {
    await openNotifications(page);
    await page.getByRole('tab', { name: 'Saadetud kirjad' }).click();
    await expect(page.locator('#outbound-filter-notification-key')).toBeVisible();
  }

  test('filtrid ja saatmise raport', async ({ page }) => {
    await openOutbound(page);
    const table = page.locator('#outbound-log-table');

    await test.step('filtreeri teavituse tunnuse ja staatuse "Viga" järgi', async () => {
      await fillField(page, 'outbound-filter-notification-key', key);
      await selectTediOption(page, 'outbound-filter-status', 'Viga');
      await searchOutbound(page);
      const row = table.getByRole('row').filter({ hasText: key });
      await expect(row).toBeVisible();
      await expect(row.getByText(recipient)).toBeVisible();
      await expect(row.getByText('Viga')).toBeVisible();
    });

    await test.step('olematu tunnus annab tühja tulemuse', async () => {
      await fillField(page, 'outbound-filter-notification-key', `${key}-olematu`);
      await searchOutbound(page);
      await expect(page.getByText('Otsingule vastavaid teavitusi ei leitud.')).toBeVisible();
    });

    await test.step('"Tühista filtrid" lähtestab filtrid', async () => {
      await page.getByRole('button', { name: 'Tühista filtrid' }).click();
      await expect(page.locator('#outbound-filter-notification-key')).toHaveValue('');
    });

    await test.step('"Saatmise raport" näitab saaja andmeid', async () => {
      await fillField(page, 'outbound-filter-notification-key', key);
      await searchOutbound(page);
      await table.getByRole('row').filter({ hasText: key }).getByRole('button', { name: 'Saatmise raport' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Playwright Saaja')).toBeVisible();
      await expect(dialog.getByText(recipient)).toBeVisible();
      await dialog.getByRole('button', { name: 'Sulge' }).last().click();
      await expect(dialog).toHaveCount(0);
    });
  });

  test('vigase kirja uuesti saatmine lisab logisse uue rea', async ({ page }) => {
    await openOutbound(page);
    const table = page.locator('#outbound-log-table');
    await fillField(page, 'outbound-filter-recipient', recipient);
    await searchOutbound(page);
    await expect(table.getByRole('row').filter({ hasText: recipient })).toHaveCount(1);

    await test.step('"Saada uuesti" + kinnitusdialoog', async () => {
      page.once('dialog', (d) => {
        expect(d.message()).toBe('Kas saata teavitus uuesti muutmata kujul samale adressaadile?');
        void d.accept();
      });
      await table.getByRole('row').filter({ hasText: recipient }).getByRole('button', { name: 'Saada uuesti' }).click();
    });
    await test.step('samale adressaadile on logis nüüd kaks rida', async () => {
      await expect
        .poll(async () => {
          await searchOutbound(page);
          return table.getByRole('row').filter({ hasText: recipient }).count();
        }, { timeout: 20_000 })
        .toBeGreaterThanOrEqual(2);
    });
  });
});

test.describe('Teavitused — õigused', () => {
  test('ametnik näeb oma teavitusi, kuid mitte "Saadetud kirjad" sakki', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.officer });
    const page = await ctx.newPage();
    await openNotifications(page);
    await expect(page.getByRole('tab', { name: 'Teavitused' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Saadetud kirjad' })).toHaveCount(0);
    await ctx.close();
  });
});
