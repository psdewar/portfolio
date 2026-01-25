import { test, expect, Page } from "@playwright/test";

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

async function clickHydratedJoinButton(page: Page) {
  const joinButton = page.getByRole("button", { name: "Join" }).first();
  await expect(joinButton).toBeVisible({ timeout: 3000 });
  await expect(joinButton).toHaveAttribute("data-hydrated", "true", { timeout: 5000 });
  await joinButton.click();
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
      }),
    );
  });
});

test.describe("Patron page", () => {
  test("loads with patron content", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Auth gate", () => {
  test("shows auth modal when non-logged-in user clicks join", async ({ page }) => {
    await goto(page, "/patron");
    const heading = page.getByRole("heading", { name: /become my patron/i });
    await expect(heading).toBeVisible({ timeout: 5000 });

    await clickHydratedJoinButton(page);

    // Auth modal should appear with form inputs
    await expect(page.getByPlaceholder("First name *")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Checkout API", () => {
  test("join button shows auth modal for non-authenticated user", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Should show auth modal
    await expect(page.getByPlaceholder("First name *")).toBeVisible({ timeout: 5000 });
  });

  test("checkout triggers for authenticated user", async ({ page }) => {
    let checkoutCalled = false;

    // Set up route interception BEFORE navigation
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
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Wait for API call
    await expect(async () => {
      expect(checkoutCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});

test.describe("Patron content access", () => {
  test("listen page loads for non-patron", async ({ page }) => {
    await goto(page, "/listen");

    // Page should load with track grid
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 5000 });
  });

  test("listen page loads for patron", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/listen");

    // Page should load with track grid
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 5000 });
  });

  test("patron page shows journey view for active patrons", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");

    // Should show journey view with "Stacking the days" heading
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({
      timeout: 5000,
    });
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

    // Check localStorage was set
    await expect(async () => {
      const patronStatus = await page.evaluate(() => localStorage.getItem("patronStatus"));
      expect(patronStatus).toBe("active");
    }).toPass({ timeout: 3000 });
  });
});

test.describe("Auth modal", () => {
  test("shows sign up form when non-logged-in user clicks join", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Should show form with input fields
    await expect(page.getByPlaceholder("First name *")).toBeVisible({ timeout: 5000 });
  });

  test("can switch between sign up and sign in modes", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Sign up mode has first name field
    await expect(page.getByPlaceholder("First name *")).toBeVisible({ timeout: 5000 });

    // Switch to sign in - first name field should disappear
    await page.getByText(/already signed up/i).click();
    await expect(page.getByPlaceholder("First name *")).not.toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();

    // Switch back to sign up
    await page.getByText(/new here/i).click();
    await expect(page.getByPlaceholder("First name *")).toBeVisible();
  });

  test("shows selected tier info in auth modal", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Modal should appear with tier info
    await expect(page.getByText(/you chose/i)).toBeVisible({ timeout: 5000 });
  });

  test("auth modal can be closed", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await clickHydratedJoinButton(page);

    // Modal is open
    await expect(page.getByPlaceholder("First name *")).toBeVisible({ timeout: 5000 });

    // Close modal (button has aria-label="Close")
    await page.getByLabel("Close").click();

    // Modal should be closed - form inputs no longer visible
    await expect(page.getByPlaceholder("First name *")).not.toBeVisible();
  });
});

test.describe("Billing period toggle", () => {
  test("billing toggle is functional", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

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
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    // Wait for hydration before interacting with toggle
    const joinButton = page.getByRole("button", { name: "Join" }).first();
    await expect(joinButton).toHaveAttribute("data-hydrated", "true", { timeout: 5000 });

    // Click annual toggle and wait for UI to update
    const toggle = page.getByText(/pay annually/i);
    await toggle.click();
    await expect(page.getByText(/\/year/).first()).toBeVisible({ timeout: 3000 });

    await joinButton.click();

    // Wait for request
    await expect(async () => {
      expect(requestBody.interval).toBe("year");
    }).toPass({ timeout: 3000 });
  });
});

test.describe("Patron mode - Journey view", () => {
  test("patron sees journey view by default", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("non-patron sees tier selection by default", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("non-patron can navigate to journey view", async ({ page }) => {
    await goto(page, "/patron");
    await expect(page.getByRole("heading", { name: /become my patron/i })).toBeVisible({
      timeout: 5000,
    });

    await page.getByText(/shows.*releases/i).click();
    await expect(page.getByRole("heading", { name: /stacking the days/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("journey view shows archive section", async ({ page }) => {
    await goto(page, "/patron?view=journey");
    await expect(page.getByText(/from the archives/i)).toBeVisible({ timeout: 5000 });
  });

  test("archive section is interactive", async ({ page }) => {
    await goto(page, "/patron?view=journey");

    const archiveButton = page.getByRole("button", { name: /from the archives/i });
    await expect(archiveButton).toBeVisible({ timeout: 5000 });

    // Archive should be clickable
    await archiveButton.click();
    // Click again to toggle
    await archiveButton.click();
  });
});

test.describe("Patron mode - Listen page gating", () => {
  test("listen page shows track grid for non-patron", async ({ page }) => {
    await goto(page, "/listen");

    // Track images should be visible
    await expect(page.getByRole("img").first()).toBeVisible({ timeout: 5000 });
  });

  test("patron sees play controls on listen page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/listen");

    // Wait for images to load first
    const trackImage = page.getByRole("img").first();
    await expect(trackImage).toBeVisible({ timeout: 5000 });

    // Hover over a track image to reveal overlay
    await trackImage.hover();

    // Patron should see Play button
    await expect(page.getByRole("button", { name: /play/i }).first()).toBeVisible({
      timeout: 3000,
    });
  });
});

test.describe("Homepage patron CTA", () => {
  test("non-patron sees 'Become my patron' on homepage", async ({ page }) => {
    await goto(page, "/");
    await expect(page.getByText(/become my patron/i)).toBeVisible({ timeout: 5000 });
  });

  test("patron sees 'Listen now' on homepage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
    });

    await goto(page, "/");
    await expect(page.getByText(/listen now/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Stripe portal access", () => {
  test("patron can access manage subscription", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("patronStatus", "active");
      localStorage.setItem("patronEmail", "patron@example.com");
    });

    await goto(page, "/patron");
    await expect(page.getByText(/manage subscription/i)).toBeVisible({ timeout: 5000 });
  });
});
