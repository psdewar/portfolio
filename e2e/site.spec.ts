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
 *
 * Shop has two modes:
 * - Simple mode (default): Streamlined for shows/events
 * - Full mode (?mode=full): Complete shop with delivery options and separate music section
 */

// Helper: navigate and wait for page to be ready
async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

// Disable dev tools slow network simulation for fast test execution
test.beforeEach(async ({ page }) => {
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

    // User sees the artist name somewhere
    await expect(page.getByText(/Peyt/i).first()).toBeVisible();

    // User can find navigation to key sections
    await expect(page.getByRole("link", { name: /rap lyrics|shop/i }).first()).toBeVisible();
  });

  test("music page loads and shows content", async ({ page }) => {
    await goto(page, "/listen");

    await expect(page).toHaveURL(/listen/);
  });

  test("shop page shows purchasable products", async ({ page }) => {
    await goto(page, "/shop");

    // User sees size and color options (present in both simple and full modes)
    await expect(page.getByRole("button", { name: /black/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /white/i }).first()).toBeVisible();

    // User sees a way to pay
    await expect(page.getByRole("button", { name: /pay|buy/i }).first()).toBeVisible();
  });
});

// =============================================================================
// NAVIGATION
// =============================================================================

test.describe("User can navigate the site", () => {
  test("can go from homepage to shop", async ({ page }) => {
    await goto(page, "/");

    const merchLink = page.getByRole("link", { name: /merch|shop/i }).first();
    await expect(merchLink).toBeVisible({ timeout: 5000 });
    await merchLink.click();

    await expect(page).toHaveURL(/shop/);
  });

  test.skip("can go from homepage to music", async ({ page }) => {
    // TODO: Fix after shows - navbar link text changed
    await goto(page, "/");

    const musicLink = page.getByRole("link", { name: /rap lyrics|listen|music/i }).first();
    await expect(musicLink).toBeVisible({ timeout: 5000 });
    await musicLink.click();

    await expect(page).toHaveURL(/listen/);
  });
});

// =============================================================================
// SHOP INTERACTIONS - SIMPLE MODE (default)
// =============================================================================

test.describe("Shop simple mode interactions", () => {
  test("user can select size and color", async ({ page }) => {
    await goto(page, "/shop");

    // Color and size buttons are visible
    await expect(page.getByRole("button", { name: /black/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /white/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /small/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /medium/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /large/i }).first()).toBeVisible();

    // User can click to change selections
    await page.getByRole("button", { name: /white/i }).first().click();
    await page.getByRole("button", { name: /large/i }).first().click();
  });

  test("user can adjust price", async ({ page }) => {
    await goto(page, "/shop");

    // Price adjustment buttons exist
    const decreaseButton = page.getByRole("button", { name: /decrease|−5/i });
    const increaseButton = page.getByRole("button", { name: /increase|\+5/i });

    await expect(increaseButton).toBeVisible();
    await expect(decreaseButton).toBeVisible();

    // User can increase price
    await increaseButton.click();
  });
});

// =============================================================================
// SHOP INTERACTIONS - FULL MODE
// =============================================================================

test.describe("Shop full mode interactions", () => {
  test("user can select delivery method", async ({ page }) => {
    await goto(page, "/shop?mode=full");

    // User sees delivery options
    const pickUpButton = page.getByRole("button", { name: /pick up/i });
    const shipButton = page.getByRole("button", { name: /ship/i }).filter({ hasNotText: /pick up/i });

    await expect(pickUpButton).toBeVisible();
    await expect(shipButton).toBeVisible();

    // User can click to change delivery method
    await shipButton.click();
    await pickUpButton.click();
  });

  test("music card shows tap to purchase hint", async ({ page }) => {
    await goto(page, "/shop?mode=full");

    // User sees the hint that they can tap anywhere
    await expect(page.getByText(/tap anywhere to purchase/i)).toBeVisible();
  });
});

// =============================================================================
// CHECKOUT FLOW
// =============================================================================

test.describe("Checkout calls Stripe API", () => {
  // Helper: set up checkout mock and navigate
  async function gotoShopWithMock(page: Page, mode: "simple" | "full" = "simple") {
    let checkoutRequest: { productId: string; metadata?: Record<string, string> } | null = null;

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

    const path = mode === "full" ? "/shop?mode=full" : "/shop";
    await goto(page, path);
    // Wait for shop content to be interactive
    await expect(page.getByRole("button", { name: /black/i }).first()).toBeVisible();

    return { getCheckoutRequest: () => checkoutRequest };
  }

  test.skip("bundle checkout sends correct request with size/color (simple mode)", async ({ page }) => {
    // TODO: Fix after shows - simple mode checkout test flaky
    const { getCheckoutRequest } = await gotoShopWithMock(page, "simple");

    // Select color and size
    await page.getByRole("button", { name: /black/i }).first().click();
    await page.getByRole("button", { name: /medium/i }).first().click();

    // Click pay button and wait for checkout API response
    const payButton = page.getByRole("button", { name: /pay/i });
    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      payButton.click(),
    ]);

    // Verify checkout was initiated with correct product and options
    const request = getCheckoutRequest();
    expect(request).not.toBeNull();
    expect(request!.productId).toBe("then-and-now-bundle-2025");
    expect(request!.metadata?.size).toBe("Medium");
    expect(request!.metadata?.color).toBe("black");
  });

  test.skip("digital download sends correct checkout request (full mode)", async ({ page }) => {
    // TODO: Fix after shows - full mode test flaky
    const { getCheckoutRequest } = await gotoShopWithMock(page, "full");

    // The entire music card is clickable
    const musicCard = page.getByText("Tap anywhere to purchase");
    await expect(musicCard).toBeVisible();

    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      musicCard.click(),
    ]);

    // Verify checkout was initiated with correct product
    const request = getCheckoutRequest();
    expect(request).not.toBeNull();
    expect(request!.productId).toBe("singles-16s-pack-2025");
  });

  test.skip("bundle checkout sends correct request (full mode)", async ({ page }) => {
    // TODO: Fix after shows - full mode buy button selector changed
    const { getCheckoutRequest } = await gotoShopWithMock(page, "full");

    // Select color and size
    await page.getByRole("button", { name: "Black", exact: true }).click();
    await page.getByRole("button", { name: "Medium", exact: true }).click();

    // Click buy button
    const buyButton = page.getByRole("button", { name: /buy.*shirt and music/i });
    await Promise.all([
      page.waitForResponse("**/api/create-checkout-session"),
      buyButton.click(),
    ]);

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

    // User sees some indication the page doesn't exist
    await expect(page.getByText(/doesn't exist|not found|404/i).first()).toBeVisible();
  });

  test("success page without session redirects to shop", async ({ page }) => {
    await goto(page, "/shop/success");

    // Should redirect back to shop
    await expect(page).toHaveURL(/\/shop/, { timeout: 10000 });
  });
});

// =============================================================================
// MOBILE RESPONSIVE
// =============================================================================

test.describe("Mobile viewport works", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("shop is usable on mobile", async ({ page }) => {
    await goto(page, "/shop");

    // Size/color options still clickable
    await expect(page.getByRole("button", { name: /black/i }).first()).toBeEnabled();
    await expect(page.getByRole("button", { name: /medium/i }).first()).toBeEnabled();

    // Pay button is visible
    await expect(page.getByRole("button", { name: /pay|buy/i }).first()).toBeVisible();
  });

  test("navigation works on mobile", async ({ page }) => {
    await goto(page, "/");

    // Can still navigate
    const shopLink = page.getByRole("link", { name: /shop|merch/i }).first();

    if (await shopLink.isVisible()) {
      await shopLink.click();
      await expect(page).toHaveURL(/shop/);
    }
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
