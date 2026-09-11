import { test, expect } from "../support/fixtures";

const draft = {
  id: "95110003",
  snapshotId: "95110101",
  snapshots: [
    {
      snapshotId: "95110101",
      version: 1,
      createdAt: "2026-09-11T10:00:00Z",
      createdBy: "60001019906",
      orgName: "Kliimaministeerium",
      status: "initiated",
    },
  ],
  version: 1,
  direction: "outgoing",
  status: "initiated",
  businessCaseId: "EE-NU-2026-00001",
  technicalId: null,
  workflowId: null,
  sentAt: null,
  receivedAt: null,
  nuFrom: "EE",
  nuTo: "DE",
  originatingAuthority: "EE-PPA",
  requestSource: "CA",
  requestPurpose: "Issue",
  sourceGoodReputeFormKey: "95110001",
  tmFirstName: "Mari",
  tmFamilyName: "Maasikas",
  tmDateOfBirth: "1980-01-01",
  tmPlaceOfBirth: "Tallinn",
  certificateNumber: "CPC-123",
  certificateIssueDate: "2020-01-01",
  certificateIssueCountry: "EE",
  unfitStartDate: "2026-09-01",
  memberStates: null,
  handlerPersonalCode: "60001019906",
  handlerName: "Test Kasutaja",
  errorMessage: null,
  createdAt: "2026-09-11T10:00:00Z",
  createdBy: "60001019906",
};

test.describe("NU sobimatusteated", () => {
  test("nimekiri kuvab NU teate ja avab detailvaate", async ({ page }) => {
    await page.route("**/v1/erru/nu/list/search**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          response: {
            content: [
              {
                id: draft.id,
                version: draft.version,
                direction: draft.direction,
                status: draft.status,
                businessCaseId: draft.businessCaseId,
                messageDate: draft.createdAt,
                countryCode: draft.nuTo,
                tmFirstName: draft.tmFirstName,
                tmFamilyName: draft.tmFamilyName,
                handlerName: draft.handlerName,
              },
            ],
            totalElements: 1,
            totalPages: 1,
            size: 10,
            number: 0,
          },
        }),
      }),
    );
    await page.route("**/v1/erru/nu/get**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ response: draft }),
      }),
    );

    await page.goto("/erru/nu", { waitUntil: "domcontentloaded" });
    const link = page.getByRole("link", { name: draft.businessCaseId });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/erru/nu/${draft.id}$`));
    await expect(
      page.getByRole("heading", { name: new RegExp(draft.businessCaseId) }),
    ).toBeVisible();
  });

  test("aegunud vormiversioon kuvab konflikti ja saadab expectedVersion väärtuse", async ({
    page,
  }) => {
    await page.route("**/v1/erru/nu/get**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ response: draft }),
      }),
    );

    let saveCalls = 0;
    let sentVersion: unknown;
    await page.route("**/v1/erru/nu/request/save", async (route) => {
      saveCalls += 1;
      sentVersion = (await route.request().postDataJSON()).expectedVersion;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          response: JSON.stringify({ code: "version_conflict" }),
        }),
      });
    });

    await page.goto(`/erru/nu/${draft.id}`, {
      waitUntil: "domcontentloaded",
    });
    const save = page.getByRole("button", { name: "Salvesta", exact: true });
    await expect(save).toBeVisible({ timeout: 20_000 });
    await save.click();

    await expect(
      page.getByText(/Teadet on teises sessioonis muudetud/i),
    ).toBeVisible();
    expect(sentVersion).toBe(draft.version);
    expect(saveCalls).toBe(1);
  });
});
