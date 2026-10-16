import { test, expect, Page } from "@playwright/test";
import { checkInFromRoad, mockCheckinApi, PNG, skipForNow } from "./checkin-flow";

const URL = "/checkin/fulton-md-0?preview=1&fresh=1";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "PUT, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "ETag",
};
const photo = (name: string, n: number) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.concat([PNG, Buffer.alloc(n + 1, n)]),
});

const bigPhoto = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1, 7)]),
});

async function setup(page: Page) {
  let release: () => void = () => {};
  let gate = new Promise<void>((r) => (release = r));
  let failedOnce = false;

  await mockCheckinApi(page);
  await page.route("**/api/moments/sign", async (route) => {
    const body = route.request().postDataJSON();
    if (body.kind === "preview") return route.fulfill({ json: { exists: true } });
    if (body.filename === "bad.png" && !failedOnce) {
      failedOnce = true;
      return route.fulfill({ status: 403, json: { error: "Forced failure" } });
    }
    return route.fulfill({ json: { url: `https://r2.test/put/${body.filename}`, key: `k/${body.filename}` } });
  });
  await page.route("**/api/moments/multipart", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "create") {
      return route.fulfill({
        json: {
          key: "k/big.mp4",
          uploadId: "u1",
          partSize: 8 * 1024 * 1024,
          partUrls: [1, 2, 3].map((n) => `https://r2.test/part/${n}`),
        },
      });
    }
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/moments/delete", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("https://r2.test/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    await gate;
    return route.fulfill({ status: 200, headers: { ...CORS, etag: '"abc"' }, body: "" });
  });
  await page.context().addCookies([{ name: "ui-data", value: "worst", url: "http://localhost:3000" }]);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/checkin/ci-short", { waitUntil: "domcontentloaded" });
  await skipForNow(page);
  await checkInFromRoad(page, "Sam Lee");
  await expect(page.getByRole("button", { name: /Upload your best/ })).toBeVisible();
  page.on("dialog", (d) => d.accept());
  return {
    release: () => release(),
    hold: () => {
      gate = new Promise<void>((r) => (release = r));
    },
  };
}

const choose = (page: Page) => page.getByLabel("Choose photos and videos");
const removeButtons = (page: Page) => page.getByRole("button", { name: /^Remove / });

test.describe("Check in upload", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a guest who picks three photos sees 0/3 while waiting, 3/3 received when done, then 6/6 after three more", async ({
    page,
  }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([photo("a.png", 1), photo("b.png", 2), photo("c.png", 3)]);
    await expect(page.getByText("Keep this page open until complete.")).toBeVisible();
    await expect(page.getByText("0/3")).toBeVisible();
    await expect(removeButtons(page)).toHaveCount(3);
    t.release();
    await expect(page.getByText("3/3 received")).toBeVisible();

    t.hold();
    await choose(page).setInputFiles([photo("d.png", 4), photo("e.png", 5), photo("f.png", 6)]);
    await expect(removeButtons(page)).toHaveCount(6);
    t.release();
    await expect(page.getByText("6/6 received")).toBeVisible();
  });

  test("a guest previewing the page sees 3/3 received and nothing is sent to the server", async ({ page }) => {
    test.setTimeout(30000);
    await mockCheckinApi(page);
    const moments: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/moments/")) moments.push(r.url());
    });
    await page.addInitScript(() => localStorage.clear());
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await skipForNow(page);
    await checkInFromRoad(page, "Sam Lee");
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([photo("a.png", 1), photo("b.png", 2), photo("c.png", 3)]);
    await expect(page.getByText("3/3 received")).toBeVisible({ timeout: 15000 });
    expect(moments).toEqual([]);
  });

  test("a guest who picks a large video sees 1/1 received", async ({ page }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles({
      name: "big.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.alloc(17 * 1024 * 1024, 7),
    });
    await expect(page.getByText("1/1 received")).toBeVisible({ timeout: 20000 });
  });

  test("a guest whose photo fails sees 1 failed, retries it to 2/2 received, then removes one to see 1/1 received", async ({
    page,
  }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([photo("bad.png", 1), photo("ok.png", 2)]);
    await expect(page.getByText("1 failed")).toBeVisible();
    await page.getByRole("button", { name: "Retry bad.png" }).click();
    await expect(page.getByText("2/2 received")).toBeVisible();
    await page.getByRole("button", { name: "Remove ok.png" }).click();
    await expect(removeButtons(page)).toHaveCount(1);
    await expect(page.getByText("1/1 received")).toBeVisible();
  });

  test("a guest whose full file lands on a later retry sees 1/1 received only at the end", async ({ page, context }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    let failing = true;
    let markFailed: () => void = () => {};
    const failedOnce = new Promise<void>((r) => (markFailed = r));
    await page.route("**/api/moments/sign", async (route) => {
      const body = route.request().postDataJSON();
      if (body.kind === "preview") {
        return route.fulfill({
          json: { url: "https://r2.test/put/preview.jpg", originalKey: "drops/late.png" },
        });
      }
      if (failing) {
        markFailed();
        return route.fulfill({ status: 403, json: { error: "Forced failure" } });
      }
      return route.fulfill({ json: { url: `https://r2.test/put/${body.filename}`, key: `k/${body.filename}` } });
    });
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([bigPhoto("late.png")]);
    await failedOnce;
    await expect(page.getByText("Keep this page open until complete.")).toBeVisible();
    await expect(page.getByText("0/1")).toBeVisible();
    await expect(page.getByText(/failed/)).toHaveCount(0);
    failing = false;
    await context.setOffline(true);
    await context.setOffline(false);
    await expect(page.getByText("1/1 received")).toBeVisible();
  });

  test("a guest whose full file never lands sees 1 failed with Retry", async ({ page }) => {
    test.setTimeout(30000);
    await page.clock.install();
    const t = await setup(page);
    await page.route("**/api/moments/sign", async (route) => {
      const body = route.request().postDataJSON();
      if (body.kind === "preview") {
        return route.fulfill({
          json: { url: "https://r2.test/put/preview.jpg", originalKey: "drops/never.png" },
        });
      }
      return route.fulfill({ status: 403, json: { error: "Forced failure" } });
    });
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([bigPhoto("never.png")]);
    await expect(async () => {
      await page.clock.runFor(40_000);
      await expect(page.getByText("1 failed")).toBeVisible({ timeout: 300 });
    }).toPass({ timeout: 25000 });
    await expect(page.getByRole("button", { name: "Retry never.png" })).toBeVisible();
    await expect(page.getByText("1/1 received")).toHaveCount(0);
  });

  test("a guest whose video fails to upload sees 1 failed with Retry", async ({ page }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    await page.route("**/api/moments/sign", async (route) => {
      const body = route.request().postDataJSON();
      if (body.kind === "preview") {
        return route.fulfill({
          json: { url: "https://r2.test/put/preview.jpg", originalKey: "drops/bad.mp4" },
        });
      }
      return route.fulfill({ status: 403, json: { error: "Forced failure" } });
    });
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([
      { name: "bad.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(2048, 1) },
    ]);
    await expect(page.getByText("1 failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry bad.mp4" })).toBeVisible();
  });

  test("on /moments, a guest whose full file lands on a later retry sees received only at the end", async ({
    page,
    context,
  }) => {
    test.setTimeout(30000);
    let failing = true;
    let markFailed: () => void = () => {};
    const failedOnce = new Promise<void>((r) => (markFailed = r));
    await page.route("**/api/moments/validate", (route) => route.fulfill({ json: { ok: true } }));
    await page.route("**/api/moments/sign", (route) => {
      const body = route.request().postDataJSON();
      if (body.kind === "preview") {
        return route.fulfill({
          json: { url: "https://r2.test/put/preview.jpg", originalKey: "drops/late.png" },
        });
      }
      if (failing) {
        markFailed();
        return route.fulfill({ status: 403, json: { error: "Forced failure" } });
      }
      return route.fulfill({ json: { url: `https://r2.test/put/${body.filename}`, key: `k/${body.filename}` } });
    });
    await page.route("https://r2.test/**", (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({ status: 200, headers: { ...CORS, etag: '"abc"' }, body: "" });
    });
    await page.addInitScript(() => sessionStorage.setItem("momentsUnlock", "code"));
    await page.goto("/moments", { waitUntil: "domcontentloaded" });
    const chooser = page.waitForEvent("filechooser");
    await page.getByText("Send me your favorite moments").click();
    await (await chooser).setFiles([bigPhoto("late.png")]);
    await failedOnce;
    await expect(page.getByText("Keep this page open until complete.")).toBeVisible();
    await expect(page.getByText(/failed/)).toHaveCount(0);
    failing = false;
    await context.setOffline(true);
    await context.setOffline(false);
    await expect(page.getByText("1/1 received")).toBeVisible();
  });

  test("a guest can remove their own upload and sees 2/2 received", async ({ page }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([photo("a.png", 1), photo("b.png", 2), photo("c.png", 3)]);
    await expect(page.getByText("3/3 received")).toBeVisible();
    await expect(page.getByRole("group", { name: "b.png" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Your upload" })).toBeVisible();
    await page.getByRole("button", { name: "Remove b.png" }).click();
    await expect(page.getByRole("group", { name: "b.png" })).toHaveCount(0);
    await expect(page.getByText("2/2 received")).toBeVisible();
  });

  test("a guest the server does not recognise sees 1 failed after picking a photo", async ({ page }) => {
    test.setTimeout(30000);
    const t = await setup(page);
    await page.unroute("**/api/moments/sign");
    await page.route("**/api/moments/sign", (route) =>
      route.fulfill({ status: 401, json: { error: "Unauthorized" } }),
    );
    t.release();
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await choose(page).setInputFiles([photo("a.png", 1)]);
    await expect(page.getByText("1 failed")).toBeVisible();
  });

  test("a guest who skipped check-in and taps Upload gets the photo picker", async ({ page }) => {
    await mockCheckinApi(page);
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/checkin/fulton-md-0?preview=1", { waitUntil: "domcontentloaded" });
    await skipForNow(page);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Upload your best/ }).click();
    await chooser;
  });
});
