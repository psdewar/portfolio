import { test, expect, Page } from "@playwright/test";
import { checkInFromRoad, mockCheckinApi, skipForNow } from "./checkin-flow";

async function open(page: Page, slug: string, query = "") {
  await page.context().addCookies([{ name: "ui-data", value: "worst", url: "http://localhost:3000" }]);
  await mockCheckinApi(page);
  await page.route("**/api/me", (route) => route.fulfill({ status: 401, json: {} }));
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`/checkin/${slug}${query}`, { waitUntil: "domcontentloaded" });
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const isCutOff = (text: string | RegExp) => (page: Page) =>
  page.getByText(text).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.scrollWidth > el.clientWidth + 1 || r.left < 0 || r.right > window.innerWidth + 1;
  });

test.describe("Check in edge cases", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a guest at a show with a very long city and region reads both on the ticket, uncut", async ({ page }) => {
    await open(page, "ci-long", "?preview=1&fresh=1");
    await expect(page.getByText(/LLANFAIRPWLLGWYNGYLL/i).first()).toBeVisible();
    await expect(page.getByText(/ANGLESEY/i).first()).toBeVisible();
    await expect.poll(() => isCutOff(/LLANFAIRPWLLGWYNGYLL/i)(page)).toBe(false);
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("a guest at an undated show sees the bare ticket number and no invalid date", async ({ page }) => {
    await open(page, "ci-nodate", "?preview=1&fresh=1");
    await expect(page.getByText("No. 0001")).toBeVisible();
    await expect(page.getByText(/invalid date/i)).toHaveCount(0);
  });

  test("a guest with a 55-letter first name sees the greeting uncut and the page does not scroll sideways", async ({
    page,
  }) => {
    await open(page, "ci-short");
    await skipForNow(page);
    await checkInFromRoad(page, "W".repeat(55));
    await expect(page.getByText(/^Thank you for being (here|there)/)).toBeVisible();
    expect(await isCutOff(/^Thank you for being (here|there)/)(page)).toBe(false);
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("a guest with no signal sees 'No connection. Try again.' on I’m Here and on Skip for now", async ({
    page,
  }) => {
    await open(page, "ci-short", "?fresh=1");
    await page.route("**/api/checkin**", (route) => route.abort());
    const here = page.getByRole("button", { name: "I’m Here" });
    await expect(async () => {
      await page.getByRole("textbox", { name: "Your name" }).fill("Sam Lee");
      await page.getByRole("textbox", { name: "Email" }).fill("sam@example.test");
      await expect(here).toBeEnabled({ timeout: 500 });
    }).toPass();
    await here.click();
    await expect(page.getByText("No connection. Try again.")).toBeVisible();
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page.getByText("No connection. Try again.")).toBeVisible();
    await expect(page.getByText(/Load failed|Failed to fetch|NetworkError/)).toHaveCount(0);
  });

  test("a guest who presses Back on the card sheet returns to the open Fund my tour step", async ({ page }) => {
    await open(page, "ci-short");
    await skipForNow(page);
    const start = page.url();
    await page.getByRole("button", { name: /Fund my tour/ }).click();
    await page.getByRole("button", { name: /Pay with your card/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(page.url()).toBe(start);
    await expect(page.getByRole("button", { name: /Pay with your card/ })).toBeVisible();
  });

  test("a guest who closes the card sheet with X and presses Back leaves the check-in page", async ({ page }) => {
    await page.goto("/robots.txt");
    await open(page, "ci-short");
    await skipForNow(page);
    await page.getByRole("button", { name: /Fund my tour/ }).click();
    await page.getByRole("button", { name: /Pay with your card/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.goBack();
    await expect(page).not.toHaveURL(/\/checkin\/ci-short/);
  });
});
