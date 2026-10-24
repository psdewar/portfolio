import { test, expect, type Page } from "@playwright/test";
import { checkInFromRoad, landOnList, openCheckin } from "./checkin-flow";
import { openSupport, payButton, setUiData } from "./helpers";

const NO_CONNECTION = "No connection. Try again.";
const GENERIC = "Something went wrong. Try again.";

async function tapAndReadAlert(page: Page, tap: () => Promise<unknown>) {
  let message = "";
  page.once("dialog", (d) => {
    message = d.message();
    void d.dismiss();
  });
  await tap();
  await expect.poll(() => message).not.toBe("");
  return message;
}

async function openCheckinRoad(page: Page) {
  await openCheckin(page, "/checkin/ci-short?preview=1&fresh=1", { uiData: "worst" });
  await landOnList(page);
}

test.describe("Monthly support when the connection drops", () => {
  test("a stranger who picks a tier and taps pay while offline sees No connection", async ({ page, context }) => {
    await openSupport(page);
    await page.getByRole("radio", { name: /\bPen\b/ }).click();
    await context.setOffline(true);

    const message = await tapAndReadAlert(page, () => payButton(page).click());

    expect(message).toBe(NO_CONNECTION);
    await expect(payButton(page)).toBeEnabled();
  });

  test("a stranger whose custom amount the server refuses sees the server's message", async ({ page }) => {
    await openSupport(page);
    await page.route("**/api/fund-project", (route) =>
      route.fulfill({
        status: 400,
        json: { error: "Minimum custom amount is $100" },
      }),
    );

    const message = await tapAndReadAlert(page, () => payButton(page).click());

    expect(message).toBe("Minimum custom amount is $100");
  });

  test("a stranger whose checkout is blocked with a plain-text answer sees Something went wrong", async ({ page }) => {
    await openSupport(page);
    await page.route("**/api/fund-project", (route) =>
      route.fulfill({
        status: 403,
        contentType: "text/plain",
        body: "Forbidden",
      }),
    );

    const message = await tapAndReadAlert(page, () => payButton(page).click());

    expect(message).toBe(GENERIC);
  });
});

test.describe("Check-in when the connection drops", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a guest who taps card pay on the tee while offline sees the card checkout couldn't load, with Try again", async ({
    page,
  }) => {
    test.setTimeout(30000);
    await openCheckinRoad(page);
    await page.getByRole("button", { name: /Grab merch/ }).click();
    await page.route("**/api/create-checkout-session", (route) => route.abort("internetdisconnected"));

    await page.getByRole("button", { name: "Pay with your card" }).click();

    await expect(page.getByText("Card checkout couldn't load")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("a guest who taps card pay on Fund my tour while offline sees No connection", async ({ page, context }) => {
    test.setTimeout(30000);
    await openCheckinRoad(page);
    await checkInFromRoad(page, "Sam Lee");
    await page.getByRole("button", { name: /Fund my tour/ }).click();
    await page.getByRole("button", { name: /Pay with your card/ }).click();
    const pay = page
      .getByRole("dialog", { name: "Contribute by card" })
      .getByRole("button", { name: /^Pay .* with your card$/ });
    await expect(pay).toBeEnabled();
    await context.setOffline(true);

    await pay.click();

    await expect(page.getByText(NO_CONNECTION)).toBeVisible();
  });
});

test.describe("RSVP when the connection drops", () => {
  test("a guest who submits while offline sees No connection and keeps what they typed", async ({ page, context }) => {
    test.setTimeout(30000);
    await setUiData(page, "one");
    await page.goto("/rsvp/one-show", { waitUntil: "networkidle" });
    await expect(async () => {
      await page.getByLabel("Name *").fill("Jordan Lee");
      await page.getByLabel("Email address *").fill("jordan@example.com");
      await page.getByLabel("Phone").fill("2065550100");
      await expect(page.getByLabel("Name *")).toHaveValue("Jordan Lee", {
        timeout: 500,
      });
    }).toPass({ timeout: 15000 });
    await context.setOffline(true);

    await page.getByRole("button", { name: "Save your spot" }).click();

    await expect(page.getByText(NO_CONNECTION)).toBeVisible();
    await expect(page.getByLabel("Name *")).toHaveValue("Jordan Lee");
    await expect(page.getByLabel("Email address *")).toHaveValue("jordan@example.com");
    await expect(page.getByLabel("Phone")).toHaveValue("2065550100");
  });
});
