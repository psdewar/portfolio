import { test, expect, Page } from "@playwright/test";
import { mockLiveStatus } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "dev-tools-state",
      JSON.stringify({
        simulateSlowNetwork: false,
        useLocalAudio: true,
        slowNetworkDelay: 0,
        enableIngConversion: false,
      }),
    );
  });
});

async function gotoWithMock(page: Page, path: string) {
  await mockLiveStatus(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

test.describe("Live page", () => {
  test("loads successfully", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByAltText("Peyt Spencer").first()).toBeVisible({ timeout: 5000 });
  });
});
