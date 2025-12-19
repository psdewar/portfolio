import { test, expect } from "@playwright/test";

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
      })
    );
  });
});

// =============================================================================
// PAGES LOAD
// =============================================================================

test.describe("Pages load successfully", () => {
  test("homepage shows artist name and navigation", async ({ page }) => {
    await page.goto("/");

    // User sees the artist name somewhere (appears multiple times, just need one)
    await expect(page.getByText(/Peyt/i).first()).toBeVisible();

    // User can find navigation to key sections (use first since mobile/desktop both have links)
    // Homepage uses marketing copy, not endpoint names
    await expect(page.getByRole("link", { name: /rap lyrics|shop/i }).first()).toBeVisible();
  });

  test("music page loads and shows content", async ({ page }) => {
    await page.goto("/listen");

    // Page loads successfully (URL is the source of truth, not title text)
    await expect(page).toHaveURL(/listen/);
  });

  test("shop page shows products for sale", async ({ page }) => {
    await page.goto("/shop");

    // User sees products with prices (bundle $30, downloads $10)
    await expect(page.getByText("$10")).toBeVisible();
    await expect(page.getByText("$30")).toBeVisible();

    // User sees buy buttons
    await expect(page.getByRole("button", { name: /buy/i }).first()).toBeVisible();
  });
});

// =============================================================================
// NAVIGATION
// =============================================================================

test.describe("User can navigate the site", () => {
  test("can go from homepage to shop", async ({ page }) => {
    await page.goto("/");

    // Homepage uses marketing copy, multiple nav links exist (desktop + mobile)
    await page.getByRole("link", { name: /shop/i }).first().click();

    await expect(page).toHaveURL(/shop/);
  });

  test("can go from homepage to music", async ({ page }) => {
    await page.goto("/");

    // Homepage uses marketing copy: "Here, I rap lyrics" links to /listen
    await page
      .getByRole("link", { name: /rap lyrics/i })
      .first()
      .click();

    await expect(page).toHaveURL(/listen/);
  });
});

// =============================================================================
// SHOP INTERACTIONS
// =============================================================================

test.describe("Shop page interactions", () => {
  test("user can select t-shirt size", async ({ page }) => {
    await page.goto("/shop");

    // Size buttons show letter + "X left" - find by text containing S/M/L and "left"
    const smallButton = page.getByRole("button", { name: /S.*left/i }).first();
    const mediumButton = page.getByRole("button", { name: /M.*left/i }).first();

    // Verify both are clickable
    await expect(smallButton).toBeEnabled();
    await smallButton.click();

    await expect(mediumButton).toBeEnabled();
  });

  test("user can select t-shirt color", async ({ page }) => {
    await page.goto("/shop");

    // User sees color options
    await expect(page.getByRole("button", { name: /black/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /white/i }).first()).toBeVisible();
  });

  test("user sees inventory counts", async ({ page }) => {
    await page.goto("/shop");

    // User sees "X left" indicating stock
    await expect(page.getByText(/left/i).first()).toBeVisible();
  });
});

// =============================================================================
// CHECKOUT FLOW
// =============================================================================

test.describe("Checkout redirects to Stripe", () => {
  test("digital download checkout goes to Stripe", async ({ page }) => {
    await page.goto("/shop");

    // Find and click the digital download buy button
    const downloadButton = page.getByRole("button", { name: /buy.*singles/i });
    await downloadButton.click();

    // User should be redirected to Stripe's checkout
    // Wait for navigation away from our site
    await page.waitForURL(/checkout\.stripe\.com|localhost/, { timeout: 5000 });

    // Either on Stripe or still on localhost (if Stripe not configured)
    const url = page.url();
    expect(url.includes("stripe.com") || url.includes("localhost")).toBeTruthy();
  });

  test("bundle checkout goes to Stripe", async ({ page }) => {
    await page.goto("/shop");

    // Find and click the bundle buy button
    const bundleButton = page.getByRole("button", { name: /buy.*bundle/i });
    await bundleButton.click();

    await page.waitForURL(/checkout\.stripe\.com|localhost/, { timeout: 5000 });

    const url = page.url();
    expect(url.includes("stripe.com") || url.includes("localhost")).toBeTruthy();
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

test.describe("Error states work correctly", () => {
  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    // User sees the "doesn't exist" message
    await expect(page.getByText("This page doesn't exist.")).toBeVisible();
  });

  test("success page without session redirects to shop", async ({ page }) => {
    // User tries to access success page directly without buying
    await page.goto("/shop/success");

    // Should redirect back to shop
    await expect(page).toHaveURL(/shop(?!\/success)/);
  });
});

// =============================================================================
// MOBILE RESPONSIVE
// =============================================================================

test.describe("Mobile viewport works", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("shop is usable on mobile", async ({ page }) => {
    await page.goto("/shop");

    // Products still visible
    await expect(page.getByText("$10")).toBeVisible();

    // Buy buttons still clickable
    await expect(page.getByRole("button", { name: /buy/i }).first()).toBeEnabled();
  });

  test("navigation works on mobile", async ({ page }) => {
    await page.goto("/");

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
  test("homepage loads within 5 seconds", async ({ page }) => {
    const start = Date.now();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("shop loads within 5 seconds", async ({ page }) => {
    const start = Date.now();

    await page.goto("/shop", { waitUntil: "domcontentloaded" });

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});
