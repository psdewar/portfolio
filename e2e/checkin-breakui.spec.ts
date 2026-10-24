import { test, expect, Page } from "@playwright/test";
import { checkInFromRoad, checkInSubmit, fillGuest, landOnList, openCheckin } from "./checkin-flow";

async function open(page: Page, slug: string, query = "") {
  await page.route("**/api/me", (route) => route.fulfill({ status: 401, json: {} }));
  await openCheckin(page, `/checkin/${slug}${query}`, { uiData: "worst" });
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
    await landOnList(page);
    await fillGuest(page, "Sam Lee");
    await checkInSubmit(page).first().click();
    await expect(page.getByText(/LLANFAIRPWLLGWYNGYLL/i).first()).toBeVisible();
    await expect(page.getByText(/ANGLESEY/i).first()).toBeVisible();
    await expect.poll(() => isCutOff(/LLANFAIRPWLLGWYNGYLL/i)(page)).toBe(false);
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("a guest at an undated show checks in and sees no invalid date", async ({ page }) => {
    await open(page, "ci-nodate", "?preview=1&fresh=1");
    await landOnList(page);
    await checkInFromRoad(page, "Sam Lee");
    await expect(page.getByText(/invalid date/i)).toHaveCount(0);
  });

  test("a guest with a 55-letter first name sees the greeting uncut and the page does not scroll sideways", async ({
    page,
  }) => {
    await open(page, "ci-short");
    await landOnList(page);
    await checkInFromRoad(page, "W".repeat(55));
    await expect(page.getByText(/^Thank you for being (here|there)/)).toBeVisible();
    expect(await isCutOff(/^Thank you for being (here|there)/)(page)).toBe(false);
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("a guest with no signal sees 'No connection. Try again.' on Check in", async ({
    page,
  }) => {
    await open(page, "ci-short", "?fresh=1");
    await page.route("**/api/checkin**", (route) => route.abort());
    await landOnList(page);
    await fillGuest(page, "Sam Lee");
    const here = checkInSubmit(page).first();
    await here.click();
    await expect(page.getByText("No connection. Try again.")).toBeVisible();
    await expect(page.getByText(/Load failed|Failed to fetch|NetworkError/)).toHaveCount(0);
  });

  test("a guest who presses Back on the card sheet returns to the open Fund my tour step", async ({ page }) => {
    await open(page, "ci-short");
    await landOnList(page);
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
    await landOnList(page);
    await page.getByRole("button", { name: /Fund my tour/ }).click();
    await page.getByRole("button", { name: /Pay with your card/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.goBack();
    await expect(page).not.toHaveURL(/\/checkin\/ci-short/);
  });
});
