import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';

/**
 * ERRU CGR päringu vastuse kuva (PR #658): leiuga riigid avatud kaartidena, leiuta riigid
 * kompaktse loeteluna, vastamata riigid (Timeout/NotAvailable) ühe reana. Igal riigil oma
 * „Saada uuesti". Päringu vastus mockitakse, sest ERRU taustsüsteemi vastuseid testis ei saa.
 */

const REQUEST_ID = 'cgr-response-test';

const FOUND_DETAILS = {
  respondingAuthority: 'Ministerstvo dopravy ČR',
  searchMethod: 'PhoneticName',
  nameDetails: {
    firstName: 'Leah',
    familyName: 'Brauer',
    dateOfBirth: '1931-05-06',
    placeOfBirth: 'København K',
  },
  addressDetails: { address: 'TILLER, Isdamvegen 135', postCode: '1000', city: 'Brussels', country: 'CZ' },
  certificateDetails: {
    certificateNumber: 'CPC001133',
    certificateIssueDate: '2017-09-14',
    certificateIssueCountry: 'DE',
    certificateValidity: 'Valid',
    fitness: { fitnessStatus: 'Fit', unfitStartDate: null, unfitEndDate: null },
  },
  transportUndertakings: {
    totalManagedUndertakings: 1,
    totalManagedVehicles: 12,
    undertaking: [
      {
        transportUndertakingName: "Raleigh's",
        communityLicenceNumber: 'CL665225',
        communityLicenceStatus: 'Withdrawn',
        numberOfVehicles: 12,
      },
    ],
  },
};

// Tahtlikult segatud järjekord: leiuga riigid ei ole algandmetes esimesed.
const MEMBER_STATES = [
  { memberStateCode: 'AT', statusCode: 'NotFound' },
  { memberStateCode: 'LV', statusCode: 'Timeout' },
  { memberStateCode: 'CZ', statusCode: 'Found', transportManagerDetails: FOUND_DETAILS },
  { memberStateCode: 'BE', statusCode: 'NotFound' },
  { memberStateCode: 'GR', statusCode: 'NotAvailable' },
  { memberStateCode: 'NO', statusCode: 'Found', transportManagerDetails: { ...FOUND_DETAILS, respondingAuthority: 'Statens Vegvesen' } },
];

async function mockRequest(page: Page, status = 'responded') {
  await page.route('**/v1/erru/cgr/get**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: {
          id: REQUEST_ID,
          version: 5,
          direction: 'outgoing',
          status,
          businessCaseId: 'CGR-EE-2026-00003',
          cgrFrom: 'EE',
          cgrTo: 'ZZ',
          originatingAuthority: 'KLIM',
          requestSource: 'CompetentAuthority',
          requestPurpose: 'Enforcement',
          tmFirstName: 'LEAH',
          tmFamilyName: 'BRAUER',
          tmDateOfBirth: '1931-05-06',
          memberStates: MEMBER_STATES,
        },
      }),
    }),
  );
}

async function openResponse(page: Page, status?: string) {
  await mockRequest(page, status);
  await page.goto(`/erru/cgr/${REQUEST_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Päringu vastus' })).toBeVisible({ timeout: 20_000 });
}

test.describe('CGR päringu vastuse kuva', () => {
  test('riigid on rühmitatud: leiuga, leiuta, vastamata', async ({ page }) => {
    await openResponse(page);

    const order = await page
      .locator('[id^="cgr-member-state-"]')
      .evaluateAll((els) => els.map((e) => e.id.replace('cgr-member-state-', '')));
    // Rühmade sees säilib algne järjekord.
    expect(order).toEqual(['CZ', 'NO', 'AT', 'BE', 'LV', 'GR']);
  });

  test('kokkuvõtte märked loevad riigid rühmade kaupa', async ({ page }) => {
    await openResponse(page);
    await expect(page.getByText(/^2 leiuga$/)).toBeVisible();
    await expect(page.getByText(/^2 leiuta$/)).toBeVisible();
    await expect(page.getByText(/^2 ei vastanud$/)).toBeVisible();
  });

  test('leiuga riigi andmed on nähtavad ilma lahti klõpsamata', async ({ page }) => {
    await openResponse(page);

    const cz = page.locator('#cgr-member-state-CZ');
    await expect(cz.getByText('Leah', { exact: true })).toBeVisible();
    await expect(cz.getByText('Brauer', { exact: true })).toBeVisible();
    await expect(cz.getByText('København K')).toBeVisible();
    await expect(cz.getByText('TILLER, Isdamvegen 135')).toBeVisible();
    await expect(cz.getByText('CPC001133')).toBeVisible();
    await expect(cz.getByText("Raleigh's")).toBeVisible();
    await expect(cz.getByText('Ministerstvo dopravy ČR')).toBeVisible();
    await expect(cz.getByText('Leid tuvastatud')).toBeVisible();

    // Avatud kuva: accordioni „Vaata" nuppe enam ei ole.
    await expect(page.getByRole('button', { name: /^Vaata/ })).toHaveCount(0);
  });

  test('leiuta ja vastamata riigid on üherealised, ilma andmeväljadeta', async ({ page }) => {
    await openResponse(page);

    for (const code of ['AT', 'BE']) {
      const row = page.locator(`#cgr-member-state-${code}`);
      await expect(row).toContainText(`(${code})`);
      await expect(row.getByText('Eesnimi')).toHaveCount(0);
    }
    for (const code of ['LV', 'GR']) {
      const row = page.locator(`#cgr-member-state-${code}`);
      await expect(row).toContainText(`(${code})`);
      await expect(row.getByText('Eesnimi')).toHaveCount(0);
    }
  });

  test('igal riigil on „Saada uuesti" ja see saadab päringu just selle riigi koodiga', async ({ page }) => {
    await openResponse(page);

    for (const code of ['CZ', 'NO', 'AT', 'BE', 'LV', 'GR']) {
      await expect(
        page.locator(`#cgr-member-state-${code}`).getByRole('button', { name: 'Saada uuesti' }),
      ).toBeVisible();
    }

    const sent: { body?: { id?: string; memberStateCode?: string } } = {};
    await page.route('**/v1/erru/cgr/resend', (route) => {
      sent.body = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: { id: REQUEST_ID, status: 'sent' } }),
      });
    });
    await page.locator('#cgr-member-state-LV').getByRole('button', { name: 'Saada uuesti' }).click();
    await expect.poll(() => sent.body?.memberStateCode).toBe('LV');
    expect(sent.body?.id).toBe(REQUEST_ID);
  });

  test('päise staatus „Vastus saadud" ja „Kopeeri päring" lehe all', async ({ page }) => {
    await openResponse(page);

    await expect(page.getByText('Vastus saadud', { exact: true }).first()).toBeVisible();
    const copy = page.getByRole('button', { name: 'Kopeeri päring' });
    await expect(copy).toBeVisible();

    const copyBox = await copy.boundingBox();
    const responseBox = await page.locator('#cgr-member-state-GR').boundingBox();
    expect(copyBox!.y).toBeGreaterThan(responseBox!.y);
  });
});
