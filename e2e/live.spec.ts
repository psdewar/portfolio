import { test, expect, Page } from "@playwright/test";

/**
 * E2E Tests for Live Streaming Page
 *
 * Tests simulate both online (live stream active) and offline states
 * by mocking the /api/live/status endpoint.
 *
 * Following user-centric approach - only test what users see and interact with.
 */

// Helper: set up mocks and navigate
async function gotoWithOfflineMock(page: Page, path: string) {
  await page.route("**/api/live/status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        online: false,
        viewerCount: 0,
      }),
    });
  });
  // Mock chat endpoint
  await page.route("**/api/live/chat", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      route.continue();
    }
  });
  await page.goto(path, { waitUntil: "load" });
  // Small wait for React hydration
  await page.waitForTimeout(500);
}

async function gotoWithOnlineMock(page: Page, path: string, viewerCount = 42) {
  await page.route("**/api/live/status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        online: true,
        viewerCount,
        streamTitle: "Test Stream",
        lastConnectTime: new Date(Date.now() - 60000).toISOString(),
      }),
    });
  });
  // Also mock the chat endpoint to prevent errors
  await page.route("**/api/live/chat", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      route.continue();
    }
  });
  await page.goto(path, { waitUntil: "load" });
  // Small wait for React hydration
  await page.waitForTimeout(500);
}

// =============================================================================
// OFFLINE STATE
// =============================================================================

test.describe("Live page - Offline", () => {
  test("shows I AM OFFLINE message when stream is offline", async ({
    page,
  }) => {
    await gotoWithOfflineMock(page, "/live");

    // User sees the offline message
    await expect(page.getByText("I AM OFFLINE").first()).toBeVisible();
  });

  test("shows Get notified button when offline", async ({ page }) => {
    await gotoWithOfflineMock(page, "/live");

    // User sees button to get notified
    await expect(
      page
        .getByRole("button", { name: /get notified when i go live/i })
        .first(),
    ).toBeVisible();
  });

  test("clicking Get notified opens signup modal", async ({ page }) => {
    await gotoWithOfflineMock(page, "/live");

    // Click the get notified button
    await page
      .getByRole("button", { name: /get notified when i go live/i })
      .first()
      .click();

    // Modal should appear with email input
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
  });

  test("shows tip section on desktop when offline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOfflineMock(page, "/live");

    // User sees the tip section even when offline
    await expect(
      page.getByText(/support my independence/i).first(),
    ).toBeVisible();
  });

  test("shows chat section on desktop when offline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOfflineMock(page, "/live");

    // Chat header visible in sidebar
    await expect(page.getByText("Chat", { exact: true })).toBeVisible();
  });

  test("shows sign in to chat when offline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOfflineMock(page, "/live");

    // Chat is gated when offline
    await expect(page.getByText(/sign in to chat/i).first()).toBeVisible();
  });
});

// =============================================================================
// ONLINE STATE
// =============================================================================

test.describe("Live page - Online", () => {
  test("shows LIVE badge when streaming", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live");

    // User sees the LIVE indicator (appears in both layouts)
    await expect(page.getByText("LIVE").first()).toBeVisible();
  });

  test("shows viewer count", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live");

    // User sees how many people are watching
    await expect(page.getByText("42").first()).toBeVisible();
  });

  test("shows elapsed time", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live");

    // User sees stream duration (format: M:SS or H:MM:SS)
    // Since we mocked 1 minute ago, should show around 1:XX
    await expect(page.getByText(/^1:\d{2}$/).first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("shows sign in to chat prompt for anonymous users", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live");

    // Anonymous user sees prompt to sign in
    await expect(page.getByText(/sign in to chat/i).first()).toBeVisible();
  });

  test("shows tip amounts on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    // User sees preset tip amounts (first set in desktop sidebar)
    await expect(
      page.getByRole("button", { name: "$10" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "$25" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "$50" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "$100" }).first(),
    ).toBeVisible();
  });

  test("shows support section on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    // User sees the tip section header
    await expect(
      page.getByText(/support my independence/i).first(),
    ).toBeVisible();
  });
});

// =============================================================================
// TIP FUNCTIONALITY
// =============================================================================

test.describe("Tipping", () => {
  test("custom tip input accepts values", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    // User can enter custom tip amount
    const tipInput = page.getByPlaceholder("10").first();
    await expect(tipInput).toBeVisible();
    await tipInput.fill("15");
    await expect(tipInput).toHaveValue("15");
  });

  test("tip button is present", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    await expect(
      page.getByRole("button", { name: /leave a tip/i }).first(),
    ).toBeVisible();
  });

  test("tip section works when offline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOfflineMock(page, "/live");

    // User can enter custom tip amount even when offline
    const tipInput = page.getByPlaceholder("10").first();
    await expect(tipInput).toBeVisible();
    await tipInput.fill("20");
    await expect(tipInput).toHaveValue("20");
  });
});

// =============================================================================
// NOTIFY MODAL
// =============================================================================

test.describe("Notify Modal", () => {
  test("modal can be closed by clicking outside", async ({ page }) => {
    await gotoWithOfflineMock(page, "/live");

    // Open the modal
    await page
      .getByRole("button", { name: /get notified when i go live/i })
      .first()
      .click();

    // Modal should be visible
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();

    // Click backdrop to close (click on the backdrop overlay, avoiding the modal content)
    // The backdrop is the fixed element with bg-black/60
    const viewport = page.viewportSize();
    if (viewport) {
      // Click in the bottom-left corner where there's no modal content
      await page.mouse.click(20, viewport.height - 20);
    }

    // Modal should be closed - email input should not be visible
    await expect(page.getByPlaceholder(/email/i).first()).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("modal can be closed by close button", async ({ page }) => {
    await gotoWithOfflineMock(page, "/live");

    // Open the modal
    await page
      .getByRole("button", { name: /get notified when i go live/i })
      .first()
      .click();

    // Modal should be visible
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();

    // Click close button (X icon in the modal)
    await page.getByLabel("Close").click();

    // Modal should be closed
    await expect(page.getByPlaceholder(/email/i).first()).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("button stops pulsing when modal is open", async ({ page }) => {
    await gotoWithOfflineMock(page, "/live");

    const button = page
      .getByRole("button", { name: /get notified when i go live/i })
      .first();

    // Button should have animate-pulse class initially
    await expect(button).toHaveClass(/animate-pulse/);

    // Open modal
    await button.click();

    // Button should not have animate-pulse class when modal is open
    await expect(button).not.toHaveClass(/animate-pulse/);
  });
});

// =============================================================================
// THANK YOU FLOW
// =============================================================================

test.describe("Post-payment thank you", () => {
  test("shows thank you toast after successful payment", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live?thanks=1");

    // User sees confirmation message
    await expect(page.getByText(/thank you for supporting/i)).toBeVisible();
  });

  test("URL is cleaned after showing thanks", async ({ page }) => {
    await gotoWithOnlineMock(page, "/live?thanks=1");

    // Wait for URL to be cleaned
    await page.waitForURL("/live", { timeout: 3000 });

    // Query param should be removed
    expect(page.url()).not.toContain("thanks=1");
  });
});

// =============================================================================
// CHAT FUNCTIONALITY
// =============================================================================

test.describe("Chat", () => {
  test("shows chat section on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    // Chat header visible in sidebar (exact match to avoid "Sign in to chat")
    await expect(page.getByText("Chat", { exact: true })).toBeVisible();
  });

  test("shows no messages yet when chat is empty", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoWithOnlineMock(page, "/live");

    // Empty state message
    await expect(page.getByText(/no messages yet/i).first()).toBeVisible();
  });
});

// =============================================================================
// PERFORMANCE
// =============================================================================

test.describe("Performance", () => {
  test("live page loads within 8 seconds", async ({ page }) => {
    await page.route("**/api/live/status", (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ online: false, viewerCount: 0 }),
      });
    });

    const start = Date.now();
    await page.goto("/live", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(8000);
  });
});
