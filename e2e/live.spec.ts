import { test, expect, Page } from "@playwright/test";
import { mockLiveStatus, mockLivestreamSchedule } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "dev-tools-state",
      JSON.stringify({
        simulateSlowNetwork: false,
        useLocalAudio: true,
        slowNetworkDelay: 0,
        enableIngConversion: false,
      }),
    );
  });
});

async function gotoWithMock(page: Page, path: string) {
  await mockLiveStatus(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

test.describe("Live page", () => {
  test("loads successfully", async ({ page }) => {
    await gotoWithMock(page, "/live");
    await expect(page.getByAltText("Peyt Spencer").first()).toBeVisible({ timeout: 5000 });
  });

  test("stream ending takes the page offline even when the live connection is down", async ({ page }) => {
    test.setTimeout(30000);
    let streaming = true;
    await mockLivestreamSchedule(page);
    await page.routeWebSocket("**/adlib/ws**", (ws) => ws.close());
    await page.route("**/api/live/status**", (route) =>
      route.fulfill({
        json: { live: streaming, since: streaming ? Date.now() : null, endedAt: streaming ? null : Date.now() },
      }),
    );
    await page.goto("/live", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("LIVE", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    streaming = false;
    await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0, { timeout: 12000 });
    await expect(page.getByRole("button", { name: "Fund My Tour" }).first()).toBeVisible();
  });

  test("stream ending over the live connection takes the page offline", async ({ page }) => {
    test.setTimeout(30000);
    await mockLivestreamSchedule(page);
    let streaming = true;
    const sockets: { send: (message: string) => void }[] = [];
    const statusMessage = () =>
      JSON.stringify({
        type: "status",
        live: streaming,
        since: streaming ? Date.now() : null,
        ended_at: streaming ? null : Date.now(),
      });
    await page.routeWebSocket("**/adlib/ws**", (ws) => {
      sockets.push(ws);
      ws.send(statusMessage());
    });
    await page.goto("/live", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("LIVE", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    streaming = false;
    sockets.forEach((ws) => ws.send(statusMessage()));
    await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fund My Tour" }).first()).toBeVisible();
  });

  test("support modal shows sign-in only after Find out more", async ({ page }) => {
    test.setTimeout(30000);
    await gotoWithMock(page, "/live");
    const findOutMore = page.getByRole("button", { name: /Find out more/ });
    await expect(async () => {
      await page.getByRole("button", { name: "Fund My Tour" }).first().click();
      await expect(findOutMore).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const signIn = page.getByRole("button", { name: /Already a supporter/ });
    await expect(signIn).toBeHidden();

    await findOutMore.click();
    await expect(signIn).toBeVisible();
  });
});
