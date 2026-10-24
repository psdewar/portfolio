import { expect, Page } from "@playwright/test";
import { setUiData } from "./helpers";

export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const CHECKIN_ID = "00000000-0000-4000-8000-000000000001";

export async function mockCheckinApi(page: Page) {
  await page.route("**/api/ticket-image", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG }),
  );
  await page.route("**/api/checkin/step**", (route) => route.fulfill({ json: { steps: {} } }));
  await page.route("**/api/checkin", (route) => {
    const { checkinId } = route.request().postDataJSON();
    return route.fulfill({
      json: { success: true, ticketNo: 7, checkinId: checkinId ?? CHECKIN_ID, rsvpd: false, steps: {} },
    });
  });
}

export const checkInSubmit = (page: Page) => page.locator("form").getByRole("button", { name: /^(Check in|Keep your ticket)$/ });

export async function openCheckin(page: Page, url: string, { uiData }: { uiData?: string } = {}) {
  if (uiData) await setUiData(page, uiData);
  await mockCheckinApi(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

export async function landOnList(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible({ timeout: 20000 });
  await expect(checkInSubmit(page).first()).toBeVisible();
}

export async function fillGuest(page: Page, name: string, email = "sam@example.test") {
  await expect(async () => {
    await page.getByRole("textbox", { name: "Your name" }).fill(name);
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await expect(checkInSubmit(page).first()).toBeEnabled({ timeout: 500 });
  }).toPass();
}

export async function checkInFromRoad(page: Page, name: string) {
  await fillGuest(page, name);
  await checkInSubmit(page).first().click();
  await expect(page.getByText("Checked in", { exact: true })).toBeVisible({ timeout: 10000 });
}
