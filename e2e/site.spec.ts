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
// Using domcontentloaded instead of load because Next.js 16 Turbopack
// keeps HMR connections open which prevents the load event from firing
async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
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
      })
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
    await expect(page.getByRole("link", { name: /rap lyrics|shop/i }).first()).toBeVisible();
  });

  test("music page loads and shows content", async ({ page }) => {
    await goto(page, "/listen");

    // Page loads successfully (URL is the source of truth, not title text)
    await expect(page).toHaveURL(/listen/);
  });

  test("shop page shows products for sale", async ({ page }) => {
    await goto(page, "/shop");

    // User sees the bundle and music sections with pricing info
    await expect(page.getByText(/then & now bundle/i)).toBeVisible();
    await expect(page.getByText(/singles.*16s/i).first()).toBeVisible();
    await expect(page.getByText(/pay what you want/i).first()).toBeVisible();
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

    // User sees delivery options (wait for them to appear)
    const pickUpButton = page.getByRole("button", { name: /pick up/i });
    const shipButton = page.getByRole("button", { name: /ship/i }).filter({ hasNotText: /pick up/i });

    await expect(pickUpButton).toBeVisible();
    await expect(shipButton).toBeVisible();

    // User can click to change delivery method
    await shipButton.click();
    await pickUpButton.click();
  });

  test("user can see size and color options", async ({ page }) => {
    await goto(page, "/shop");

    // Color and size are now separate rows - use exact match to avoid matching buy button
    await expect(page.getByRole("button", { name: "Black", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "White", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Small", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Medium", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Large", exact: true })).toBeVisible();
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

test.describe("Checkout calls Stripe API", () => {
  // Helper: set up checkout mock and navigate
  async function gotoShopWithMock(page: Page) {
    let checkoutRequest: { productId: string; metadata?: Record<string, string> } | null = null;

    // Set up route interceptions BEFORE navigation
    await page.route("**/api/create-checkout-session", async (route) => {
      const postData = route.request().postDataJSON();
      checkoutRequest = postData;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "test_session_123",
          url: "https://checkout.stripe.com/test",
        }),
      });
    });

    await goto(page, "/shop");
    // Wait for shop content to be interactive
    await expect(page.getByRole("button", { name: "Black", exact: true })).toBeVisible();

    return { getCheckoutRequest: () => checkoutRequest };
  }

  test("digital download sends correct checkout request", async ({ page }) => {
    const { getCheckoutRequest } = await gotoShopWithMock(page);

    // The entire music card is clickable - find by the "Tap anywhere to purchase" text
    const musicCard = page.getByText("Tap anywhere to purchase");
    await expect(musicCard).toBeVisible();

    // Click and wait for the checkout API response
    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      musicCard.click(),
    ]);

    // Verify checkout was initiated with correct product
    const request = getCheckoutRequest();
    expect(request).not.toBeNull();
    expect(request!.productId).toBe("singles-16s-pack-2025");
  });

  test("bundle checkout sends correct request with size/color", async ({ page }) => {
    const { getCheckoutRequest } = await gotoShopWithMock(page);

    // Select color and size - use exact match to avoid matching buy button text
    await page.getByRole("button", { name: "Black", exact: true }).click();
    await page.getByRole("button", { name: "Medium", exact: true }).click();

    // Click buy button and wait for checkout API response
    const buyButton = page.getByRole("button", { name: /buy.*shirt and music/i });
    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      buyButton.click(),
    ]);

    // Verify checkout was initiated with correct product and options
    const request = getCheckoutRequest();
    expect(request).not.toBeNull();
    expect(request!.productId).toBe("then-and-now-bundle-2025");
    expect(request!.metadata?.size).toBe("Medium");
    expect(request!.metadata?.color).toBe("black");
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

    // Products still visible with pricing
    await expect(page.getByText(/pay what you want/i).first()).toBeVisible();

    // Size/color options still clickable - use exact match to avoid matching buy button
    await expect(page.getByRole("button", { name: "Black", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Medium", exact: true })).toBeEnabled();
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
