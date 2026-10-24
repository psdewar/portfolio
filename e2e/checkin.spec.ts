import { test, expect, Page } from "@playwright/test";
import { PNG, checkInFromRoad, checkInSubmit, fillGuest, landOnList, openCheckin } from "./checkin-flow";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const PAST = "/checkin/fulton-md-0?preview=1&fresh=1";
const LIVE = "/checkin/ci-short?preview=1&fresh=1";

async function open(page: Page, url = PAST) {
  test.setTimeout(30000);
  await openCheckin(page, url, { uiData: url === LIVE ? "worst" : undefined });
}

const checkInRow = (page: Page) => page.getByRole("button", { name: /Were you there\?/ });
const socialsRow = (page: Page) => page.getByRole("button", { name: /Find me on socials/ });
const saveRow = (page: Page) => page.getByRole("button", { name: /Tap here to keep your ticket Proof you attended/ });
const saveSubmit = (page: Page) => page.getByRole("button", { name: "Keep your ticket", exact: true });

test.describe("Check in", () => {
  test("a guest lands on the list with Check in and Tap here to keep your ticket", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await expect(checkInRow(page)).toBeVisible();
    await expect(page.getByRole("button", { name: /Tap here to keep your ticket/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Find me on socials/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send me your best photo/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fund my tour/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Be my monthly supporter" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Grab merch/ })).toHaveCount(0);
  });

  test("a checked-in guest is greeted by first name and never sees their email", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await fillGuest(page, "Jordan Lee", "jordan@example.com");
    await page.getByRole("textbox", { name: "Email" }).press("Enter");
    await page.getByRole("textbox", { name: "Phone" }).press("Enter");
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Thank you for being there, Jordan", { exact: true })).toBeVisible();
    await expect(page.getByText("jordan@example.com")).toHaveCount(0);
  });

  test("a skipped guest who checks in from the road sees the full stamped ticket, then lands back on the road", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await fillGuest(page, "Jordan Lee", "jordan@example.com");
    await checkInSubmit(page).first().click();
    await expect(page.getByText("GUEST", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Jordan Lee", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeHidden();
  });

  test("a guest with a long two-surname name sees the whole name on the ticket", async ({ page }) => {
    await open(page);
    await landOnList(page);
    const full = "María José de la Cruz Hernández y Fitzgerald-Nguyễn";
    await fillGuest(page, full, "maria@example.com");
    await checkInSubmit(page).first().click();
    const printed = page.getByText(full, { exact: true }).first();
    await expect(printed).toBeVisible();
    await expect(page.getByText("Admitted", { exact: true }).first()).toBeVisible();
    const fits = await printed.evaluate((n) => n.scrollWidth <= n.clientWidth + 1);
    expect(fits).toBe(true);
  });

  test("a skipped guest who checks in later is greeted by first name", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await fillGuest(page, "Jordan Lee", "jordan@example.com");
    await checkInSubmit(page).first().click();
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^Thank you for being (here|there), Jordan$/)).toBeVisible();
  });

  test("a guest walks the fields with Enter and checks in from the last one", async ({ page }) => {
    await open(page);
    await landOnList(page);
    const name = page.getByRole("textbox", { name: "Your name" });
    const email = page.getByRole("textbox", { name: "Email" });
    await fillGuest(page, "Jordan Lee", "jordan@example.com");
    await name.press("Enter");
    await expect(email).toBeFocused();
    await email.press("Enter");
    const phone = page.getByRole("textbox", { name: "Phone" });
    if (await phone.count()) {
      await expect(phone).toBeFocused();
      await phone.press("Enter");
    }
    await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("a skipped guest who reopens the Were you there row lands in the name field", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await checkInRow(page).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeHidden();
    await checkInRow(page).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeFocused();
    await expect(checkInSubmit(page).first()).toBeVisible();
  });

  test("a skipped guest who taps Save with the form open sees Keep your ticket and lands in the name field", async ({
    page,
  }) => {
    await open(page);
    await landOnList(page);
    await saveRow(page).click();
    await expect(saveSubmit(page)).toBeVisible();
    await expect(page.getByText("Check in to keep your ticket")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeFocused();
  });

  test.describe("on a desktop browser", () => {
    test.use({ userAgent: DESKTOP_UA });

    test("a skipped guest who taps Save checks in, then downloads the ticket and sees Saved on your computer", async ({
      page,
    }) => {
      await open(page);
      await landOnList(page);
      await saveRow(page).click();
      await expect(saveSubmit(page)).toBeVisible();
      await fillGuest(page, "Jordan Lee", "jordan@example.com");
      const download = page.waitForEvent("download", { timeout: 15000 });
      await saveSubmit(page).click();
      expect((await download).suggestedFilename()).toBe("ground-up-ticket.png");
      await expect(page.getByText("Saved on your computer", { exact: true })).toBeVisible();
    });
  });

  test("each step opens to show its content and closes again when tapped", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, LIVE);
    await landOnList(page);

    const live = page.getByRole("button", { name: /^Check in/, expanded: true });
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible();
    await live.first().click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeHidden();
    await page.getByRole("button", { name: /^Check in/, expanded: false }).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible();

    const instagram = page.getByRole("link", { name: "Follow me on Instagram" });
    await expect(instagram).toBeHidden();
    await socialsRow(page).click();
    await expect(instagram).toBeVisible();
    await socialsRow(page).click();
    await expect(instagram).toBeHidden();

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

  test("a guest who taps a social button is not checked off until they come back to the page", async ({ page }) => {
    await open(page, LIVE);
    await landOnList(page);
    await page.evaluate(() =>
      document.addEventListener("click", (e) => (e.target as Element).closest("a[target=_blank]") && e.preventDefault(), true),
    );
    await socialsRow(page).click();
    await page.getByRole("link", { name: "Follow me on Instagram" }).click();
    await expect(socialsRow(page)).not.toHaveAccessibleName(/, done$/);
    const setVisibility = (state: string) =>
      page.evaluate((v) => {
        Object.defineProperty(document, "visibilityState", { value: v, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);
    await setVisibility("hidden");
    await expect(socialsRow(page)).not.toHaveAccessibleName(/, done$/);
    await setVisibility("visible");
    await expect(socialsRow(page)).toHaveAccessibleName(/Find me on socials.*, done$/);
  });

  test("a guest who missed the show taps I missed this one, sees the quiet view, and can undo it", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await page.getByRole("button", { name: "I missed this one" }).click();
    await expect(page.getByText("I missed you this time", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tap here to keep your ticket/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Send me your best photo/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Grab merch/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Missed this one" }).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tap here to keep your ticket/ })).toBeVisible();
    await expect(page.getByText("I missed you this time", { exact: true })).toHaveCount(0);
  });

  test("a guest who taps keep your ticket before checking in sees Check in first", async ({ page }) => {
    await open(page);
    await landOnList(page);
    await saveRow(page).click();
    await expect(page.getByRole("button", { name: /Check in first/ })).toBeVisible();
  });

  test.describe("on a Samsung phone", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    });

    test("a guest opens Find me on socials and sees all four buttons", async ({ page }) => {
      await open(page);
      await landOnList(page);
      await socialsRow(page).click();
      await expect(page.getByRole("link", { name: "Follow me on Instagram" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Follow me on Spotify" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Subscribe on YouTube" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Favorite me on Apple Music" })).toBeVisible();
    });
  });

  test("Fund my tour starts closed and opens to the one-time rails", async ({ page }) => {
    await open(page);
    await landOnList(page);
    const row = page.getByRole("button", { name: /Fund my tour/ });
    const card = page.getByRole("button", { name: /Pay with your card/ });
    await expect(card).toBeHidden();
    await row.click();
    await expect(page.getByRole("img", { name: "Venmo" })).toBeVisible();
    await expect(card).toBeVisible();
    await row.click();
    await expect(card).toBeHidden();
  });

  test("the Be my monthly supporter row opens to its tiers and a Read my story button", async ({ page }) => {
    await open(page);
    await landOnList(page);
    const monthly = (expanded: boolean) => page.getByRole("button", { name: "Be my monthly supporter", expanded });
    await expect(monthly(false)).toBeVisible();
    await expect(page.getByRole("radio", { name: /Flow/ })).toBeHidden();
    await monthly(false).click();
    await expect(monthly(true)).toBeVisible();
    await expect(page.getByRole("radio", { name: /Flow/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay \$.*\/month with your card/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read my story" })).toBeVisible();
  });

  test.describe("on a desktop browser", () => {
    test.use({ userAgent: DESKTOP_UA });

    test("a guest who saves the ticket hears Keep your ticket, done", async ({ page }) => {
      await open(page);
      await landOnList(page);
      await expect(page.getByRole("button", { name: /^Tap here to keep your ticket(?!.*done)/ })).toBeVisible();
      await saveRow(page).click();
      await fillGuest(page, "Jordan Lee", "jordan@example.com");
      await saveSubmit(page).click();
      await expect(page.getByRole("button", { name: /Tap here to keep your ticket.*, done$/ })).toBeVisible();
    });
  });

  test("a guest buying a tee starts on size M and can switch size and color", async ({ page }) => {
    await open(page, LIVE);
    await landOnList(page);
    await page.getByRole("button", { name: /Grab merch/ }).click();
    const venmo = page.getByRole("link", { name: /Venmo/ });
    const card = page.getByRole("button", { name: "Pay with your card" });
    await expect(page.getByRole("button", { name: "M", exact: true, pressed: true })).toBeVisible();
    await expect(card).toBeEnabled();
    await expect(venmo).toHaveAttribute("href", /note=Patience%20tee%20M%20Navy/);
    await page.getByRole("button", { name: "L", exact: true }).click();
    await expect(page.getByRole("button", { name: "L", exact: true, pressed: true })).toBeVisible();
    await expect(venmo).toHaveAttribute("href", /note=Patience%20tee%20L%20Navy/);
    await page.getByRole("button", { name: "Forest", exact: true }).click();
    await expect(page.getByRole("button", { name: "Forest", exact: true, pressed: true })).toBeVisible();
    await expect(venmo).toHaveAttribute("href", /note=Patience%20tee%20L%20Forest/);
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
      await landOnList(page);
      await checkInFromRoad(page, "Jordan Lee");
      await expect(saveRow(page)).toContainText(before);
      const download = page.waitForEvent("download", { timeout: 15000 });
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
    await landOnList(page);
    await saveRow(page).click();
    await fillGuest(page, "Jordan Lee", "jordan@example.com");
    await saveSubmit(page).click();
    const row = page.getByRole("button", { name: /Tap here to keep your ticket/ });
    await expect(row).toHaveAttribute("aria-busy", "true");
    await row.click();
    expect(await shareCalls(page)).toBe(0);
    await expect(row).not.toHaveAttribute("aria-busy", "true", { timeout: 15000 });
    expect(await shareCalls(page)).toBe(0);
    await row.click();
    await expect.poll(() => shareCalls(page)).toBe(1);
    await expect(page.getByRole("button", { name: /Tap here to keep your ticket.*, done$/ })).toBeVisible();
    expect(await shareCalls(page)).toBe(1);
  });

  test("a checked-in guest whose ticket is ready shares with one tap", async ({ page }) => {
    await stubShare(page);
    await open(page);
    await landOnList(page);
    await checkInFromRoad(page, "Jordan Lee");
    await expect(saveRow(page)).not.toHaveAttribute("aria-busy", "true");
    await saveRow(page).click();
    await expect.poll(() => shareCalls(page)).toBe(1);
  });
});
