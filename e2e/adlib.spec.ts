import { test, expect, type Page } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { mockLivestreamSchedule, waitForAdlibConnected } from "./helpers";

const ADLIB_SECRET = process.env.ADLIB_SECRET || "dev-secret-adlib";

function mintToken(sub: string, name: string, role: "host" | "viewer", ttlSeconds = 3600): string {
  const payload = { sub, name, role, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", ADLIB_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

async function openLive(page: Page, token?: string) {
  await mockLivestreamSchedule(page);
  const params = new URLSearchParams({ adlibDemo: "landscape" });
  if (token) params.set("adlibToken", token);
  await page.goto(`/live?${params.toString()}`, { waitUntil: "domcontentloaded" });
  await waitForAdlibConnected(page);
}

test.describe("Adlib chat", () => {
  test.describe.configure({ mode: "serial" });


  test("host and viewer exchange messages, and history survives a reload", async ({ browser }) => {
    test.setTimeout(20000);
    const run = randomUUID().slice(0, 8);
    const hostToken = mintToken(`host-${run}`, "Host", "host");
    const viewerToken = mintToken(`viewer-${run}`, "Viewer", "viewer");

    const hostCtx = await browser.newContext();
    const viewerCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    const viewerPage = await viewerCtx.newPage();

    await openLive(hostPage, hostToken);
    await openLive(viewerPage, viewerToken);

    const hostMessage = `hello from host ${run}`;
    await hostPage.getByPlaceholder("Send a message").fill(hostMessage);
    await hostPage.getByRole("button", { name: "Send" }).click();

    await expect(viewerPage.getByText(hostMessage)).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText(hostMessage)).toBeVisible();

    await viewerPage.reload({ waitUntil: "domcontentloaded" });
    await waitForAdlibConnected(viewerPage);
    await expect(viewerPage.getByText(hostMessage)).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await viewerCtx.close();
  });

  test("host can hide a message and it disappears for the viewer too", async ({ browser }) => {
    test.setTimeout(15000);
    const run = randomUUID().slice(0, 8);
    const hostToken = mintToken(`host-hide-${run}`, "Host", "host");
    const viewerToken = mintToken(`viewer-hide-${run}`, "Viewer", "viewer");

    const hostCtx = await browser.newContext();
    const viewerCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    const viewerPage = await viewerCtx.newPage();

    await openLive(hostPage, hostToken);
    await openLive(viewerPage, viewerToken);

    const viewerMessage = `viewer says ${run}`;
    await viewerPage.getByPlaceholder("Send a message").fill(viewerMessage);
    await viewerPage.getByRole("button", { name: "Send" }).click();

    await expect(hostPage.getByText(viewerMessage)).toBeVisible({ timeout: 5000 });

    await hostPage.getByText(viewerMessage).hover();
    await hostPage.getByRole("button", { name: "Hide message" }).click();

    await expect(hostPage.getByText(viewerMessage)).toBeHidden();
    await expect(viewerPage.getByText(viewerMessage)).toBeHidden();

    await hostCtx.close();
    await viewerCtx.close();
  });

  test("sending too fast shows the slow-mode inline error", async ({ browser }) => {
    test.setTimeout(12000);
    const run = randomUUID().slice(0, 8);
    const token = mintToken(`slow-${run}`, "Speedy", "viewer");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await openLive(page, token);

    const input = page.getByPlaceholder("Send a message");
    const send = page.getByRole("button", { name: "Send" });

    await input.fill(`first ${run}`);
    await send.click();
    await expect(page.getByText(`first ${run}`)).toBeVisible({ timeout: 5000 });

    await input.fill(`second ${run}`);
    await send.click();
    await expect(page.getByText("slow down a little")).toBeVisible({ timeout: 5000 });

    await ctx.close();
  });

  test("signed-out visitor can read chat; pressing Send opens sign-in and keeps the draft", async ({ browser }) => {
    test.setTimeout(15000);
    const run = randomUUID().slice(0, 8);
    const hostToken = mintToken(`host-anon-${run}`, "Host", "host");
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    await openLive(hostPage, hostToken);

    const seedMessage = `seed for anon ${run}`;
    await hostPage.getByPlaceholder("Send a message").fill(seedMessage);
    await hostPage.getByRole("button", { name: "Send" }).click();
    await expect(hostPage.getByText(seedMessage)).toBeVisible({ timeout: 5000 });

    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    await openLive(anonPage);

    await expect(anonPage.getByText(seedMessage)).toBeVisible({ timeout: 5000 });

    const input = anonPage.getByPlaceholder("Send a message");
    await input.fill("hello");
    await anonPage.getByRole("button", { name: "Send" }).click();

    await expect(anonPage.getByRole("heading", { name: "Join the chat" })).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("hello");
    await expect(anonPage.getByText(seedMessage)).toBeVisible();

    await hostCtx.close();
    await anonCtx.close();
  });
});
