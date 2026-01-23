import { test, expect, Page } from "@playwright/test";

async function gotoWithMock(page: Page, path: string) {
  await page.route("**/riff/stream", (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body: `data: {"online":false,"viewerCount":0}\n\n`,
    });
  });

  await page.route("**/api/schedule", (route) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ nextStream: tomorrow.toISOString() }),
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

  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
}

test.describe("Live page", () => {
  test("loads successfully", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.locator("body")).toBeVisible();
  });
});
