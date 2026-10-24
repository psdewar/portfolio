import { test, expect, type Page } from "@playwright/test";
import { openSupport, payButton } from "./helpers";

const SUPPORTER_TRACK_IDS = ["best-foot-forward", "crg-freestyle", "so-good", "see-this-through"];
const PUBLIC_TRACK_ID = "patience";
const STORY_PHOTO_ALT = "Peyt with a local family in Veraguas, Panama";

const tier = (page: Page, name: string) => page.getByRole("radio", { name: new RegExp(`\\b${name}\\b`) });

test.describe("Tiers on /support", () => {
  test("a stranger sees every tier with its monthly price and hint", async ({ page }) => {
    await openSupport(page);

    await expect(tier(page, "Pen")).toContainText("$10/mo");
    await expect(tier(page, "Pen")).toContainText("pays for two gallons of gas");
    await expect(tier(page, "Flow")).toContainText("$20/mo");
    await expect(tier(page, "Flow")).toContainText("pays for lunch on the road");
    await expect(tier(page, "Mind")).toContainText("$50/mo");
    await expect(tier(page, "Mind")).toContainText("pays for a day's car rental");
    await expect(tier(page, "Soul")).toContainText("$100/mo");
    await expect(tier(page, "Soul")).toContainText("Name your price");
  });

  test("Flow is preselected", async ({ page }) => {
    await openSupport(page);
    await expect(tier(page, "Flow")).toBeChecked();
    await expect(payButton(page)).toContainText("/month");
  });

  test("paying annually changes prices and hints, and switching back restores them", async ({ page }) => {
    await openSupport(page);

    await page.getByRole("button", { name: /Pay annually/ }).click();

    await expect(tier(page, "Pen")).toContainText("$100/yr");
    await expect(tier(page, "Pen")).toContainText("pays to fly my gear");
    await expect(tier(page, "Flow")).toContainText("$200/yr");
    await expect(tier(page, "Flow")).toContainText("pays for an overnight stay");
    await expect(tier(page, "Mind")).toContainText("$500/yr");
    await expect(tier(page, "Mind")).toContainText("pays for a round-trip flight");
    await expect(payButton(page)).toContainText("/year");

    await page.getByRole("button", { name: /Pay annually/ }).click();

    await expect(tier(page, "Flow")).toContainText("$20/mo");
    await expect(tier(page, "Flow")).toContainText("pays for lunch on the road");
    await expect(payButton(page)).toContainText("/month");
  });

  test("picking a different tier updates the amount on the pay button", async ({ page }) => {
    await openSupport(page);
    const before = await payButton(page).innerText();

    await tier(page, "Mind").click();

    await expect(tier(page, "Mind")).toBeChecked();
    await expect(tier(page, "Flow")).not.toBeChecked();
    await expect(payButton(page)).not.toHaveText(before);
  });

  test("arrow keys move the selection between tiers", async ({ page }) => {
    await openSupport(page);
    await tier(page, "Flow").focus();

    await page.keyboard.press("ArrowDown");

    await expect(tier(page, "Pen")).toBeChecked();
  });

  test("pressing pay opens the card checkout and Back to tiers returns to the tiers", async ({ page }) => {
    await openSupport(page);
    await tier(page, "Pen").click();

    await payButton(page).click();

    const back = page.getByRole("button", { name: "Back to tiers" });
    await expect(back).toBeVisible({ timeout: 30_000 });
    await back.click();
    await expect(back).toBeHidden();
    await expect(tier(page, "Pen")).toBeVisible();
  });
});

test.describe("Sign in for existing supporters", () => {
  test("an email with no subscription gets the real error", async ({ page }) => {
    await openSupport(page);

    await page.getByRole("button", { name: /Already a supporter\?/ }).click();
    await expect(page.getByRole("heading", { name: "Sign in with your supporter email" })).toBeVisible();

    await page.getByRole("textbox", { name: "Your email" }).fill("not-a-supporter-e2e@example.com");
    await page.getByRole("button", { name: "Send code" }).click();

    await expect(page.getByText("No account found for this email")).toBeVisible({ timeout: 15_000 });
  });

  test("Send code stays disabled until an email is typed, and Cancel closes the form", async ({ page }) => {
    await openSupport(page);
    await page.getByRole("button", { name: /Already a supporter\?/ }).click();

    const send = page.getByRole("button", { name: "Send code" });
    await expect(send).toBeDisabled();
    await page.getByRole("textbox", { name: "Your email" }).fill("someone@example.com");
    await expect(send).toBeEnabled();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with your supporter email" })).toBeHidden();
  });
});

test.describe("Supporter view of /support", () => {
  test("a supporter sees their perks and can manage their subscription", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("supporterStatus", "active");
    });
    await page.goto("/support?now=2000-01-01");

    await expect(page.getByRole("heading", { name: "You're a monthly supporter" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Yours before anyone else")).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage my subscription" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Be my monthly supporter" })).toBeHidden();
    await expect(tier(page, "Flow")).toBeHidden();
    await expect(page.getByRole("button", { name: /Already a supporter\?/ })).toBeHidden();
  });
});

test.describe("Supporter songs on /listen", () => {
  test("tapping a supporter-only song offers the way to become a supporter", async ({ page }) => {
    await page.goto("/listen");

    const dialog = page.getByRole("dialog", { name: "Support" });
    await expect(async () => {
      await page.getByRole("button", { name: "Open So Good" }).click({ timeout: 5_000 });
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(dialog.getByRole("heading", { name: "Be my monthly supporter" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: /\bFlow\b/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^(Play|Pause) preview$/ })).toBeVisible();
    await expect(page).not.toHaveURL(/play=/);
  });

  test("a public song opens for play without asking for support", async ({ page }) => {
    await page.goto("/listen");

    await expect(async () => {
      await page.getByRole("button", { name: "Open Patience" }).click({ timeout: 5_000 });
      await expect(page).toHaveURL(/play=patience/, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByRole("dialog", { name: "Support" })).toBeHidden();
  });
});

test.describe("Audio gate", () => {
  for (const id of SUPPORTER_TRACK_IDS) {
    test(`a stranger cannot download ${id}`, async ({ request }) => {
      const res = await request.get(`/api/audio/${id}`, { maxRedirects: 0 });
      expect(res.status()).toBe(403);
    });
  }

  test("a forged supporter token cannot download a supporter song", async ({ request }) => {
    const payload = Buffer.from(JSON.stringify({ email: "forged@example.com", exp: 4102444800 })).toString("base64url");
    const forged = `${payload}.${Buffer.from("not-the-signature").toString("base64url")}`;
    for (const id of SUPPORTER_TRACK_IDS) {
      const res = await request.get(`/api/audio/${id}`, {
        headers: { Cookie: `supporterToken=${forged}` },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(403);
    }
  });

  test("a public song is not refused", async ({ request }) => {
    const res = await request.get(`/api/audio/${PUBLIC_TRACK_ID}`, { maxRedirects: 0 });
    expect(res.status()).not.toBe(403);
    expect(res.status()).toBeLessThan(400);
  });
});

test.describe("Story modal", () => {
  async function expectStoryOpen(page: Page) {
    const dialog = page.getByRole("dialog", { name: "Peyt Spencer" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Peyt Spencer" })).toBeVisible();
    await expect(dialog.getByRole("img", { name: STORY_PHOTO_ALT })).toBeVisible();
    return dialog;
  }

  test("Read my story on /support opens the story with photos", async ({ page }) => {
    await openSupport(page);

    await page.getByRole("button", { name: "Read my story" }).click();

    await expectStoryOpen(page);
  });

  test("Escape closes the story and returns focus to Read my story", async ({ page }) => {
    await openSupport(page);
    const trigger = page.getByRole("button", { name: "Read my story" });
    await trigger.click();
    await expectStoryOpen(page);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog", { name: "Peyt Spencer" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the close button closes the story and returns focus to Read my story", async ({ page }) => {
    await openSupport(page);
    const trigger = page.getByRole("button", { name: "Read my story" });
    await trigger.click();
    const dialog = await expectStoryOpen(page);

    await dialog.getByRole("button", { name: "Close" }).click();

    await expect(page.getByRole("dialog", { name: "Peyt Spencer" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("Read more on a fund page opens the same story and leaves the page unexpanded", async ({ page }) => {
    await page.goto("/fund/norcal");
    const readMore = page.getByRole("button", { name: /Read more/ });
    await readMore.scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: STORY_PHOTO_ALT })).toHaveCount(0);
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await readMore.click();
    await expectStoryOpen(page);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog", { name: "Peyt Spencer" })).toBeHidden();
    await expect(readMore).toBeFocused();
    await expect(page.getByRole("img", { name: STORY_PHOTO_ALT })).toHaveCount(0);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(40);
  });
});
