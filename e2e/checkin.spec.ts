import { test, expect, Page } from "@playwright/test";
import { PNG, checkInFromRoad, mockCheckinApi, skipForNow as skip } from "./checkin-flow";

const URL = "/checkin/fulton-md-0?preview=1&fresh=1";

async function open(page: Page) {
  test.setTimeout(30000);
  await mockCheckinApi(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto(URL, { waitUntil: "domcontentloaded" });
}

const checkInRow = (page: Page) => page.getByRole("button", { name: "Check in", exact: true });
const saveRow = (page: Page) => page.getByRole("button", { name: /Keep your ticket Proof you attended/ });
const saveSubmit = (page: Page) => page.getByRole("button", { name: "Keep your ticket", exact: true });

test.describe("Check in", () => {
  test("a guest who skips sees the road with Check in and Keep your ticket", async ({ page }) => {
    await open(page);
    await skip(page);
    await expect(checkInRow(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /Keep your ticket/ })).toBeVisible();
  });

  test("a checked-in guest sees their name printed on the ticket and never their email", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("button", { name: "Skip for now" })).toBeEnabled({ timeout: 20000 });
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    await page.getByRole("textbox", { name: "Email" }).press("Enter");
    await page.getByRole("textbox", { name: "Phone" }).press("Enter");
    await expect(page.getByText("GUEST", { exact: true })).toBeVisible();
    await expect(page.getByText("Jordan Lee", { exact: true })).toBeVisible();
    await expect(page.getByText("jordan@example.com")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);
  });

  test("a skipped guest who checks in from the road sees the full stamped ticket, then lands back on the road", async ({ page }) => {
    await open(page);
    await skip(page);
    await checkInRow(page).click();
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    await page.getByRole("button", { name: "I’m Here" }).first().click();
    await expect(page.getByText("GUEST", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Jordan Lee", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeHidden();
  });

  test("a guest with a long two-surname name sees the whole name on the ticket", async ({ page }) => {
    await open(page);
    const full = "María José de la Cruz Hernández y Fitzgerald-Nguyễn";
    await expect(page.getByRole("button", { name: "Skip for now" })).toBeEnabled({ timeout: 20000 });
    await page.getByRole("textbox", { name: "Your name" }).fill(full);
    await page.getByRole("textbox", { name: "Email" }).fill("maria@example.com");
    await page.getByRole("textbox", { name: "Email" }).press("Enter");
    await page.getByRole("textbox", { name: "Phone" }).press("Enter");
    const printed = page.getByText(full, { exact: true });
    await expect(printed).toBeVisible();
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeVisible();
    const fits = await printed.evaluate((n) => n.scrollWidth <= n.clientWidth + 1);
    expect(fits).toBe(true);
  });

  test("a skipped guest who checks in later is greeted by first name", async ({ page }) => {
    await open(page);
    await skip(page);
    await checkInRow(page).click();
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    await page.getByRole("button", { name: "I’m Here" }).click();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Thank you for being (here|there), Jordan$/)).toBeVisible();
  });

  test("a guest walks the fields with Enter and checks in from the last one", async ({ page }) => {
    await open(page);
    await skip(page);
    await checkInRow(page).click();
    const name = page.getByRole("textbox", { name: "Your name" });
    const email = page.getByRole("textbox", { name: "Email" });
    await name.fill("Jordan Lee");
    await name.press("Enter");
    await expect(email).toBeFocused();
    await email.fill("jordan@example.com");
    await email.press("Enter");
    const phone = page.getByRole("textbox", { name: "Phone" });
    if (await phone.count()) {
      await expect(phone).toBeFocused();
      await phone.press("Enter");
    }
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible();
  });

  test("a skipped guest who taps Check in lands in the name field", async ({ page }) => {
    await open(page);
    await skip(page);
    await checkInRow(page).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeFocused();
    await expect(page.getByRole("button", { name: "I’m Here" }).first()).toBeVisible();
  });

  test("a skipped guest who taps Save with the form open sees Keep your ticket and lands in the name field", async ({
    page,
  }) => {
    await open(page);
    await skip(page);
    await checkInRow(page).click();
    await saveRow(page).click();
    await expect(saveSubmit(page)).toBeVisible();
    await expect(page.getByText("Check in to keep your ticket")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeFocused();
  });

  test("a skipped guest who taps Save checks in, then downloads the ticket and sees Saved on your computer", async ({
    page,
  }) => {
    await open(page);
    await skip(page);
    await saveRow(page).click();
    await expect(saveSubmit(page)).toBeVisible();
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    const download = page.waitForEvent("download");
    await saveSubmit(page).click();
    expect((await download).suggestedFilename()).toBe("ground-up-ticket.png");
    await expect(page.getByText("Saved on your computer", { exact: true })).toBeVisible();
  });

  test("each step opens to show its content and closes again when tapped", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await skip(page);

    const filming = page.getByRole("button", { name: /Filming tonight/ });
    const tips = page.getByRole("region", { name: "Filming tips" });
    await filming.click();
    await expect(tips).toBeVisible();
    await filming.click();
    await expect(tips).toBeHidden();

    await checkInRow(page).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible();
    await checkInRow(page).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeHidden();

    const fund = page.getByRole("button", { name: /Fund my tour/ });
    const card = page.getByRole("button", { name: /Pay with your card/ });
    await fund.click();
    await expect(card).toBeVisible();
    await fund.click();
    await expect(card).toBeHidden();

    const tee = page.getByRole("button", { name: /Grab merch/ });
    for (let i = 0; i < 3; i++) {
      await tee.click();
      await expect(page.getByRole("img", { name: /Patience tee/ })).toBeVisible();
      await tee.click();
      await expect(page.getByRole("img", { name: /Patience tee/ })).toBeHidden();
    }
  });
  test.describe("on a Samsung phone", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    });

    test("a guest opens Filming tonight and reads which label to tap", async ({ page }) => {
      await open(page);
      await skip(page);
      await page.getByRole("button", { name: /Filming tonight/ }).click();
      await expect(
        page.getByRole("region", { name: "Filming tips" }).getByText("Find the label that says FHD. Tap it until it says UHD."),
      ).toBeVisible();
    });
  });

  test("Fund my tour starts closed and opens to the one-time rails", async ({ page }) => {
    await open(page);
    await skip(page);
    const row = page.getByRole("button", { name: /Fund my tour/ });
    const card = page.getByRole("button", { name: /Pay with your card/ });
    await expect(card).toBeHidden();
    await row.click();
    await expect(page.getByRole("img", { name: "Venmo" })).toBeVisible();
    await expect(card).toBeVisible();
    await row.click();
    await expect(card).toBeHidden();
  });

  test("the Be my monthly supporter band shows its tiers and a Read my story button", async ({ page }) => {
    await open(page);
    await skip(page);
    await expect(page.getByText("Be my monthly supporter", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Flow/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay \$.*\/month with your card/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read my story" })).toBeVisible();
  });

  test("a guest who saves the ticket hears Keep your ticket, done", async ({ page }) => {
    await open(page);
    await skip(page);
    await expect(page.getByRole("button", { name: /^Keep your ticket(?!.*done)/ })).toBeVisible();
    await saveRow(page).click();
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    await saveSubmit(page).click();
    await expect(page.getByRole("button", { name: /Keep your ticket.*, done$/ })).toBeVisible();
  });

  test("a guest buying a tee cannot pay until they pick a size, then can", async ({ page }) => {
    await open(page);
    await skip(page);
    await page.getByRole("button", { name: /Grab merch/ }).click();
    const venmo = page.getByRole("link", { name: /Venmo/ });
    const card = page.getByRole("button", { name: "Pay with your card" });
    await expect(venmo).toBeDisabled();
    await expect(card).toBeDisabled();
    await page.getByRole("radio", { name: "Forest" }).click();
    await page.getByRole("button", { name: "M", exact: true }).click();
    await expect(venmo).toBeEnabled();
    await expect(card).toBeEnabled();
    await expect(page.getByRole("img", { name: /Patience tee in Forest/ })).toBeVisible();
  });
});

const PIXEL_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SAMSUNG_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S911U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

for (const [label, userAgent, before, after] of [
  ["Pixel", PIXEL_UA, "Proof you attended", "Saved in Photos, under Collections"],
  ["Samsung", SAMSUNG_UA, "Proof you attended", "Saved in Gallery, under Albums"],
] as const) {
  test.describe(`Keep your ticket on ${label}`, () => {
    test.use({ userAgent, viewport: { width: 412, height: 915 }, hasTouch: true });

    test("a checked-in guest taps once and the ticket downloads", async ({ page }) => {
      await open(page);
      await skip(page);
      await checkInFromRoad(page, "Jordan Lee");
      await expect(saveRow(page)).toContainText(before);
      const download = page.waitForEvent("download");
      await saveRow(page).click();
      expect((await download).suggestedFilename()).toBe("ground-up-ticket.png");
      await expect(page.getByText(after, { exact: true })).toBeVisible();
    });
  });
}

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

test.describe("Keep your ticket on iPhone", () => {
  test.use({ userAgent: IOS_UA, viewport: { width: 390, height: 844 }, hasTouch: true });

  const stubShare = (page: Page) =>
    page.addInitScript(() => {
      const w = window as unknown as { shareCalls: number };
      w.shareCalls = 0;
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", {
        value: async () => {
          w.shareCalls += 1;
        },
        configurable: true,
      });
    });
  const shareCalls = (page: Page) => page.evaluate(() => (window as unknown as { shareCalls: number }).shareCalls);

  test("a guest who taps Keep your ticket before checking in waits for the ticket, then taps once to share", async ({
    page,
  }) => {
    await stubShare(page);
    await open(page);
    await page.route("**/api/ticket-image", async (route) => {
      await new Promise((r) => setTimeout(r, 6000));
      await route.fulfill({ status: 200, contentType: "image/png", body: PNG });
    });
    await skip(page);
    await saveRow(page).click();
    await page.getByRole("textbox", { name: "Your name" }).fill("Jordan Lee");
    await page.getByRole("textbox", { name: "Email" }).fill("jordan@example.com");
    await saveSubmit(page).click();
    const row = page.getByRole("button", { name: /Keep your ticket/ });
    await expect(row).toHaveAttribute("aria-busy", "true");
    await row.click();
    expect(await shareCalls(page)).toBe(0);
    await expect(row).not.toHaveAttribute("aria-busy", "true", { timeout: 15000 });
    expect(await shareCalls(page)).toBe(0);
    await row.click();
    await expect.poll(() => shareCalls(page)).toBe(1);
    await expect(page.getByRole("button", { name: /Keep your ticket.*, done$/ })).toBeVisible();
    expect(await shareCalls(page)).toBe(1);
  });

  test("a checked-in guest whose ticket is ready shares with one tap", async ({ page }) => {
    await stubShare(page);
    await open(page);
    await skip(page);
    await checkInFromRoad(page, "Jordan Lee");
    await page.waitForTimeout(1000);
    await saveRow(page).click();
    await expect.poll(() => shareCalls(page)).toBe(1);
  });
});
