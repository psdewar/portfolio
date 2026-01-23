import { test, expect, Page } from "@playwright/test";

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "dev-tools-state",
      JSON.stringify({
        simulateSlowNetwork: false,
        useLocalAudio: true,
        slowNetworkDelay: 0,
        enableIngConversion: false,
      })
    );
  });
});

test.describe("Pages load", () => {
  test("homepage loads", async ({ page }) => {
    await goto(page, "/");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30000 });
  });

  test("patron page loads", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30000 });
  });

  test("listen page loads", async ({ page }) => {
    await goto(page, "/listen");
    await expect(page).toHaveURL(/listen/);
  });

  test("shop page loads", async ({ page }) => {
    await goto(page, "/shop");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Error handling", () => {
  test("404 page works", async ({ page }) => {
    await goto(page, "/nonexistent-page-12345");
    await expect(page.getByText(/not found|404|doesn't exist/i).first()).toBeVisible({ timeout: 15000 });
  });
});
