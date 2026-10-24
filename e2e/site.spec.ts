import { test, expect, Page } from "@playwright/test";
import { seedDevTools } from "./helpers";

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

test.beforeEach(async ({ page }) => {
  await seedDevTools(page);
});

test.describe("Home", () => {
  test("a visitor lands on the homepage and sees its heading", async ({ page }) => {
    await goto(page, "/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Error handling", () => {
  test("404 page works", async ({ page }) => {
    await goto(page, "/nonexistent-page-12345");
    await expect(page.getByText(/not found|404|doesn't exist/i).first()).toBeVisible({ timeout: 15000 });
  });
});
