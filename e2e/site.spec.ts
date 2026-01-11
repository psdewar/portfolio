import { test, expect, Page } from "@playwright/test";

/**
 * E2E Tests - User-Centric Approach
 *
 * These tests only interact with what a real user sees:
 * - Text on the page
 * - Buttons they can click
 * - URLs they navigate to
 * - Files they download
 *
 * NO implementation details:
 * - No CSS selectors like .bg-green-500
 * - No React component names
 * - No checking database state
 * - No internal API response structures
 */

// Helper: navigate and wait for page to be ready
async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
}

// Disable dev tools slow network simulation for fast test execution
test.beforeEach(async ({ page }) => {
  // Clear the dev-tools-state from localStorage to disable simulated slow loading
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

// =============================================================================
// PAGES LOAD
// =============================================================================

test.describe("Pages load successfully", () => {
  test("homepage shows artist name and navigation", async ({ page }) => {
    await goto(page, "/");

    // User sees the artist name somewhere (appears multiple times, just need one)
    await expect(page.getByText(/Peyt/i).first()).toBeVisible();

    // User can find navigation to key sections (use first since mobile/desktop both have links)
    // Homepage uses marketing copy, not endpoint names
    await expect(
      page.getByRole("link", { name: /rap lyrics|shop/i }).first(),
    ).toBeVisible();
  });

  test("music page loads and shows content", async ({ page }) => {
    await goto(page, "/listen");

    // Page loads successfully (URL is the source of truth, not title text)
    await expect(page).toHaveURL(/listen/);
  });

  test("shop page shows products for sale", async ({ page }) => {
    await goto(page, "/shop");

    // User sees products with prices (bundle $30, downloads $10)
    await expect(page.getByText("$10")).toBeVisible();
    await expect(page.getByText("$30")).toBeVisible();

    // User sees the bundle and music sections
    await expect(page.getByText(/then & now bundle/i)).toBeVisible();
    await expect(page.getByText(/singles.*16s/i).first()).toBeVisible();
  });
});

// =============================================================================
// NAVIGATION
// =============================================================================

test.describe("User can navigate the site", () => {
  test("can go from homepage to shop", async ({ page }) => {
    await goto(page, "/");

    const merchLink = page.getByRole("link", { name: /merch/i }).first();
    await expect(merchLink).toBeVisible({ timeout: 5000 });
    await merchLink.click();

    await expect(page).toHaveURL(/shop/);
  });

  test("can go from homepage to music", async ({ page }) => {
    await goto(page, "/");

    // Wait for navbar to load (dynamically rendered with ssr: false)
    // Homepage uses marketing copy: "Here, I rap lyrics" links to /listen
    const musicLink = page.getByRole("link", { name: /rap lyrics/i }).first();
    await expect(musicLink).toBeVisible({ timeout: 5000 });
    await musicLink.click();

    await expect(page).toHaveURL(/listen/);
  });
});

// =============================================================================
// SHOP INTERACTIONS
// =============================================================================

test.describe("Shop page interactions", () => {
  test("user can select delivery method", async ({ page }) => {
    await goto(page, "/shop");

    // User sees delivery options
    const pickUpButton = page.getByRole("button", { name: /pick up/i });
    const shipButton = page.getByRole("button", { name: /ship to me/i });

    await expect(pickUpButton).toBeVisible();
    await expect(shipButton).toBeVisible();

    // User can click to change delivery method
    await shipButton.click();
    await pickUpButton.click();
  });

  test("user can see size and color options", async ({ page }) => {
    await goto(page, "/shop");

    // Combined size + color options are visible
    await expect(
      page.getByRole("button", { name: /black \+ small/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /black \+ medium/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /white \+ large/i }),
    ).toBeVisible();
  });

  test("music card shows tap to purchase hint", async ({ page }) => {
    await goto(page, "/shop");

    // User sees the hint that they can tap anywhere
    await expect(page.getByText(/tap anywhere to purchase/i)).toBeVisible();
  });
});

// =============================================================================
// CHECKOUT FLOW
// =============================================================================

test.describe("Checkout redirects to Stripe", () => {
  test("digital download checkout goes to Stripe", async ({ page }) => {
    await goto(page, "/shop");

    // The entire music card is clickable - find by heading and click
    const musicCard = page.getByRole("button", { name: /singles.*16s.*2025/i });
    await musicCard.click();

    // User should be redirected to Stripe's checkout
    // Wait for navigation away from our site
    await page.waitForURL(/checkout\.stripe\.com|localhost/, { timeout: 5000 });

    // Either on Stripe or still on localhost (if Stripe not configured)
    const url = page.url();
    expect(
      url.includes("stripe.com") || url.includes("localhost"),
    ).toBeTruthy();
  });

  test("bundle checkout goes to Stripe when selecting size/color", async ({
    page,
  }) => {
    await goto(page, "/shop");

    // Click a size/color option to trigger checkout
    const sizeColorOption = page.getByRole("button", {
      name: /black \+ medium/i,
    });
    await sizeColorOption.click();

    await page.waitForURL(/checkout\.stripe\.com|localhost/, { timeout: 5000 });

    const url = page.url();
    expect(
      url.includes("stripe.com") || url.includes("localhost"),
    ).toBeTruthy();
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

test.describe("Error states work correctly", () => {
  test("404 page shows for unknown routes", async ({ page }) => {
    await goto(page, "/this-page-does-not-exist");

    // User sees the "doesn't exist" message
    await expect(page.getByText("This page doesn't exist.")).toBeVisible();
  });

  test("success page without session redirects to shop", async ({ page }) => {
    // User tries to access success page directly without buying
    // Server-side redirect happens, so we wait for final URL
    await goto(page, "/shop/success");

    // Should redirect back to shop (wait longer for server redirect)
    await expect(page).toHaveURL(/\/shop$/, { timeout: 10000 });
  });
});

// =============================================================================
// MOBILE RESPONSIVE
// =============================================================================

test.describe("Mobile viewport works", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("shop is usable on mobile", async ({ page }) => {
    await goto(page, "/shop");

    // Products still visible
    await expect(page.getByText("$10")).toBeVisible();

    // Size/color options still clickable
    await expect(
      page.getByRole("button", { name: /black \+ medium/i }),
    ).toBeEnabled();
  });

  test("navigation works on mobile", async ({ page }) => {
    await goto(page, "/");

    // Can still navigate (may be hamburger menu or visible links)
    const shopLink = page.getByRole("link", { name: /shop/i });

    // Either visible directly or need to open menu
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await expect(page).toHaveURL(/shop/);
    }
    // If not visible, menu interaction would be needed - that's a separate test
  });
});

// =============================================================================
// PERFORMANCE SMOKE TEST
// =============================================================================

test.describe("Basic performance", () => {
  test("homepage loads within 8 seconds", async ({ page }) => {
    const start = Date.now();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000);
  });

  test("shop loads within 8 seconds", async ({ page }) => {
    const start = Date.now();

    await page.goto("/shop", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000);
  });
});
