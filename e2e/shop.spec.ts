import { test, expect } from "@playwright/test";

for (const [label, viewport] of [
  ["desktop", { width: 1280, height: 800 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(`Shop on ${label}`, () => {
    test.use({ viewport });

    test("a shopper picks a tee color and size and pays with the right note", async ({ page }) => {
      await page.goto("/shop", { waitUntil: "domcontentloaded" });
      const venmo = page.getByRole("link", { name: /Venmo/ });
      const size = (name: string) => page.getByRole("button", { name, exact: true });

      await expect(size("M")).toHaveAttribute("aria-pressed", "true");
      await expect(venmo).toHaveAttribute("href", /note=Patience%20tee%20M%20Navy/);

      const forest = page.getByRole("button", { name: "Forest", exact: true });
      await expect(async () => {
        await forest.click();
        await expect(forest).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
      }).toPass();
      await size("L").click();
      await expect(size("L")).toHaveAttribute("aria-pressed", "true");
      await expect(venmo).toHaveAttribute("href", /note=Patience%20tee%20L%20Forest/);
      await expect(page.getByRole("img", { name: /Patience tee in Forest/ })).toBeVisible();

      await page.getByRole("tab", { name: /Exhibit PSD/ }).click();
      await expect(page.getByRole("tab", { name: /Exhibit PSD/ })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tab", { name: /Patience tee/ })).toHaveAttribute("aria-selected", "false");
      await expect(page.getByRole("button", { name: "Black", exact: true })).toBeVisible();
      await expect(size("S")).toBeVisible();
      await expect(venmo).toHaveAttribute("href", /note=Exhibit%20PSD%20tee%20/);
    });
  });
}
