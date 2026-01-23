import { test, expect, Page } from "@playwright/test";

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

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

test.describe("Patron page", () => {
  test("loads with patron content", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Auth gate", () => {
  test("shows auth modal when non-logged-in user clicks join", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await expect(joinButton).toBeEnabled({ timeout: 10000 });
    await joinButton.dispatchEvent("click");

    // Auth modal should appear with form inputs
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Checkout API", () => {
  test("join button shows auth modal for non-authenticated user", async ({ page }) => {
    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await expect(joinButton).toBeEnabled({ timeout: 10000 });
    await joinButton.dispatchEvent("click");

    // Should show auth modal
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10000 });
  });

  test("checkout triggers for authenticated user", async ({ page }) => {
    let checkoutCalled = false;

    await page.route("**/api/fund-project", async (route) => {
      checkoutCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.stripe.com/test" }),
      });
    });

    // Fully authenticated user (name + email)
    await page.addInitScript(() => {
      localStorage.setItem("liveCommenterName", "Test User");
      localStorage.setItem("liveCommenterEmail", "test@example.com");
    });

    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await expect(joinButton).toBeEnabled({ timeout: 5000 });
    await joinButton.click({ force: true });

    // Wait for API call with polling
    await expect(async () => {
      expect(checkoutCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});

test.describe("Patron content access", () => {
  test("listen page loads for non-patron", async ({ page }) => {
    await goto(page, "/listen");
    await page.waitForLoadState("networkidle");

    // Page should load with track grid
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 10000 });
  });

  test("listen page loads for patron", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/listen");
    await page.waitForLoadState("networkidle");

    // Page should load with track grid
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 10000 });
  });

  test("patron page shows journey view for active patrons", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    // Should show journey view with "Stacking the days" heading
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Audio API access control", () => {
  test("returns 403 for patron track without cookie", async ({ request }) => {
    const response = await request.get("/api/audio/crg-freestyle");
    expect(response.status()).toBe(403);
  });

  test("returns 403 for patron track with invalid cookie", async ({ request }) => {
    const response = await request.get("/api/audio/crg-freestyle", {
      headers: {
        Cookie: "patronToken=invalid",
      },
    });
    expect(response.status()).toBe(403);
  });

  test("allows access to public track without patron cookie", async ({ request }) => {
    const response = await request.get("/api/audio/patience");
    // Should not be 403 (might be 200 or 404 depending on blob availability)
    expect(response.status()).not.toBe(403);
  });
});

test.describe("Checkout success flow", () => {
  test("sets patron status on success redirect", async ({ page }) => {
    // Mock the checkout session API to avoid hitting real Stripe
    await page.route("**/api/checkout-session/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "complete", customer_email: "test@example.com" }),
      });
    });

    await goto(page, "/patron?thanks=1&session_id=test_session");
    await page.waitForLoadState("networkidle");

    // Check localStorage was set with polling
    await expect(async () => {
      const patronStatus = await page.evaluate(() => localStorage.getItem("patronStatus"));
      expect(patronStatus).toBe("active");
    }).toPass({ timeout: 5000 });
  });
});

test.describe("Auth modal", () => {
  test("shows sign up form when non-logged-in user clicks join", async ({ page }) => {
    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await joinButton.dispatchEvent("click");

    // Should show form with input fields
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10000 });
  });

  test("can switch between sign up and sign in modes", async ({ page }) => {
    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await joinButton.dispatchEvent("click");

    // Sign up mode has multiple inputs
    const inputCount = await page.getByRole("textbox").count();
    expect(inputCount).toBeGreaterThan(1);

    // Switch to sign in
    await page.getByText(/already signed up/i).click();
    const signInInputCount = await page.getByRole("textbox").count();
    expect(signInInputCount).toBeLessThan(inputCount);

    // Switch back to sign up
    await page.getByText(/new here/i).click();
    const backToSignUpCount = await page.getByRole("textbox").count();
    expect(backToSignUpCount).toBeGreaterThan(1);
  });

  test("shows selected tier info in auth modal", async ({ page }) => {
    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await joinButton.dispatchEvent("click");

    // Modal should appear with tier info
    await expect(page.getByText(/you chose/i)).toBeVisible({ timeout: 10000 });
  });

  test("auth modal can be closed", async ({ page }) => {
    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await joinButton.dispatchEvent("click");

    // Modal is open
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 10000 });

    // Close modal
    await page.getByRole("button", { name: /close/i }).click();

    // Modal should be closed - form inputs no longer visible
    await expect(page.getByRole("textbox")).not.toBeVisible();
  });
});

test.describe("Billing period toggle", () => {
  test("billing toggle is functional", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({ timeout: 30000 });

    // Toggle should be visible and clickable
    const toggle = page.getByText(/pay annually/i);
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Click again to toggle back
    await toggle.click();
  });

  test("annual checkout includes correct interval", async ({ page }) => {
    let requestBody: Record<string, unknown> = {};

    await page.route("**/api/fund-project", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.stripe.com/test" }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem("liveCommenterName", "Test User");
      localStorage.setItem("liveCommenterEmail", "test@example.com");
    });

    await goto(page, "/patron");
    await page.waitForLoadState("networkidle");

    // Click annual toggle and wait for state update
    const toggle = page.getByText(/pay annually/i);
    await toggle.click();
    await page.waitForTimeout(100);

    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await joinButton.dispatchEvent("click");

    // Wait for request with polling
    await expect(async () => {
      expect(requestBody.interval).toBe("year");
    }).toPass({ timeout: 5000 });
  });
});

test.describe("Patron mode - Journey view", () => {
  test("patron sees journey view by default", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({ timeout: 30000 });
  });

  test("non-patron sees tier selection by default", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({ timeout: 30000 });
  });

  test("non-patron can navigate to journey view", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({ timeout: 30000 });

    await page.getByText(/shows.*releases/i).click();
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({ timeout: 10000 });
  });

  test("journey view shows archive section", async ({ page }) => {
    await goto(page, "/patron?view=journey");
    await expect(page.getByText(/from the archives/i)).toBeVisible({ timeout: 30000 });
  });

  test("archive section is interactive", async ({ page }) => {
    await goto(page, "/patron?view=journey");

    const archiveButton = page.getByRole("button", { name: /from the archives/i });
    await expect(archiveButton).toBeVisible({ timeout: 30000 });

    // Archive should be clickable
    await archiveButton.click();
    // Click again to toggle
    await archiveButton.click();
  });
});

test.describe("Patron mode - Listen page gating", () => {
  test("listen page shows track grid for non-patron", async ({ page }) => {
    await goto(page, "/listen");
    await page.waitForLoadState("networkidle");

    // Track images should be visible
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 10000 });
  });

  test("patron sees play controls on listen page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/listen");
    await page.waitForLoadState("networkidle");

    // Hover over a track image to reveal overlay
    const trackImage = page.getByRole("img").first();
    await trackImage.hover();

    // Patron should see Play button
    await expect(page.getByRole("button", { name: /play/i }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Homepage patron CTA", () => {
  test("non-patron sees 'Become my patron' on homepage", async ({ page }) => {
    await goto(page, "/");
    await expect(page.getByText(/become my patron/i)).toBeVisible({ timeout: 30000 });
  });

  test("patron sees 'Listen now' on homepage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
    });

    await goto(page, "/");
    await expect(page.getByText(/listen now/i)).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Stripe portal access", () => {
  test("patron can access manage subscription", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");
    await expect(page.getByText(/manage subscription/i)).toBeVisible({ timeout: 30000 });
  });
});
