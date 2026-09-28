import type { Page } from "@playwright/test";

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

export async function waitForAdlibConnected(page: Page, timeout = 10000) {
  await page.locator('[data-adlib-connected="true"]').first().waitFor({ timeout });
}
