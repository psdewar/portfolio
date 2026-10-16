import { expect, Page } from "@playwright/test";

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
  await page.route("**/api/checkin/skip", (route) => {
    const { checkinId } = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, ticketNo: 7, checkinId, steps: {} } });
  });
  await page.route("**/api/checkin", (route) => {
    const { checkinId } = route.request().postDataJSON();
    return route.fulfill({
      json: { success: true, ticketNo: 7, checkinId: checkinId ?? CHECKIN_ID, rsvpd: false, steps: {} },
    });
  });
}

export async function skipForNow(page: Page) {
  const button = page.getByRole("button", { name: "Skip for now" });
  await expect(button).toBeEnabled({ timeout: 20000 });
  await button.click();
  await expect(page.getByText(/^Thank you for being (here|there)/)).toBeVisible();
}

export async function checkInFromRoad(page: Page, name: string) {
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill(name);
  await page.getByRole("textbox", { name: "Email" }).fill("sam@example.test");
  await page.getByRole("button", { name: "I’m Here" }).first().click();
  await expect(page.getByText("Checked in", { exact: true })).toBeVisible();
}
