import { expect, test, type Page } from "@playwright/test";

type RoomOnline = boolean | Partial<Record<"live" | "rehearsal", boolean>>;

export async function mockLivestreamSchedule(page: Page) {
  await page.route("**/api/livestream", (route) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ nextStream: tomorrow.toISOString() }),
    });
  });
}

export async function mockLiveStatus(page: Page, online: RoomOnline = false) {
  const byRoom = typeof online === "boolean" ? { live: online, rehearsal: online } : online;
  await page.routeWebSocket("**/adlib/ws**", (ws) => {
    const room = new URL(ws.url()).searchParams.get("room") ?? "live";
    const isLive = room === "rehearsal" ? (byRoom.rehearsal ?? false) : (byRoom.live ?? false);
    ws.send(JSON.stringify({ type: "status", live: isLive, since: null, ended_at: null }));
  });

  await mockLivestreamSchedule(page);
}

export async function setUiData(page: Page, value: string) {
  await page.context().addCookies([{ name: "ui-data", value, url: test.info().project.use.baseURL! }]);
}

export async function seedDevTools(page: Page) {
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
}

export const payButton = (page: Page) => page.getByRole("button", { name: /^Pay .* with your card$/ });

export async function openSupport(page: Page, path = "/support?now=2000-01-01") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Be my monthly supporter" })).toBeVisible();
  await expect(payButton(page)).toBeEnabled();
}
