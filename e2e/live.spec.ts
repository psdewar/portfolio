import { test, expect, Page } from "@playwright/test";

async function gotoWithMock(page: Page, path: string) {
  await page.route("**/api/live/status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ online: false, viewerCount: 0 }),
    });
  });
  await page.route("**/api/live/chat", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      route.continue();
    }
  });
  // Using domcontentloaded instead of load because Next.js 16 Turbopack
  // keeps HMR connections open which prevents the load event from firing
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
}

test.describe("Live page - Offline", () => {
  test("shows I AM OFFLINE marquee", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText("I AM OFFLINE").first()).toBeVisible();
  });

  test("shows next stream info", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText("Next Live").first()).toBeVisible();
    await expect(page.getByText(/\d{1,2}(AM|PM) PT/i).first()).toBeVisible();
  });

  test("shows notify button", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText("Notify me by email").first()).toBeVisible();
  });
});
