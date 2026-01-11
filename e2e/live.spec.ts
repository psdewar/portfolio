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
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(500);
}

test.describe("Live page - Offline", () => {
  test("shows I AM OFFLINE marquee", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText("I AM OFFLINE").first()).toBeVisible();
  });

  test("shows next stream date", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText(/7PM PT/i).first()).toBeVisible();
  });

  test("shows notify button", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByText("Notify me by email").first()).toBeVisible();
  });
});
