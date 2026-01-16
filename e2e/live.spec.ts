import { test, expect, Page } from "@playwright/test";

async function gotoWithMock(page: Page, path: string) {
  // Mock the SSE stream endpoint that useLiveStatus hook connects to
  await page.route("**/riff/stream", (route) => {
    // Return SSE response with offline status
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
      body: `data: {"online":false,"viewerCount":0}\n\n`,
    });
  });

  // Mock schedule API for next stream info
  await page.route("**/api/schedule", (route) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7 PM
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
  // Wait for content to render after SSE mock responds
  await page.waitForTimeout(1000);
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
