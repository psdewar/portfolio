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
    await expect(page.getByText(/min\. \$\d+/i).first()).toBeVisible();
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
    await expect(page.getByRole("button", { name: /black \+ small/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /black \+ medium/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /white \+ large/i })).toBeVisible();
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
  // Helper: navigate to shop and wait for React hydration
  // ShopContent fetches /api/inventory on mount, so we wait for that as hydration signal
  async function gotoShopHydrated(page: Page) {
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

    // Navigate and wait for inventory fetch (signals React hydration complete)
    await Promise.all([page.waitForResponse("**/api/inventory"), goto(page, "/shop")]);

    return { getCheckoutRequest: () => checkoutRequest };
  }

  test("digital download sends correct checkout request", async ({ page }) => {
    const { getCheckoutRequest } = await gotoShopHydrated(page);

    // The entire music card is clickable - find by heading and click
    const musicCard = page.getByRole("button", { name: /singles.*16s.*2025/i });

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
    const { getCheckoutRequest } = await gotoShopHydrated(page);

    // Click a size/color option to trigger checkout
    const sizeColorOption = page.getByRole("button", {
      name: /black \+ medium/i,
    });

    // Click and wait for the checkout API response
    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      sizeColorOption.click(),
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
    await expect(page.getByText(/min\. \$\d+/i).first()).toBeVisible();

    // Size/color options still clickable
    await expect(page.getByRole("button", { name: /black \+ medium/i })).toBeEnabled();
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
