import { chromium as playwright, type Browser } from "playwright-core";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";
const IS_LOCAL = process.env.NODE_ENV === "development" || !process.env.VERCEL;

interface ScreenshotOptions {
  path: string; // Path like "/live" or "/shop"
  selector?: string; // Optional: screenshot specific element
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
  waitForSelector?: string;
  waitForTimeout?: number;
}

async function launchBrowser(): Promise<Browser> {
  if (IS_LOCAL) {
    // Local development: use system playwright
    const { chromium: localPlaywright } = await import("playwright");
    return localPlaywright.launch({ headless: true });
  }

  // Production (Vercel/Lambda): use @sparticuz/chromium
  const chromium = (await import("@sparticuz/chromium")).default;
  return playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function takeScreenshot({
  path,
  selector,
  viewport = { width: 1200, height: 630 },
  deviceScaleFactor,
  waitForSelector,
  waitForTimeout = 2000,
}: ScreenshotOptions) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport,
      ...(deviceScaleFactor ? { deviceScaleFactor } : {}),
    });

    // Build URL with og=true to hide modals
    const url = new URL(path, BASE_URL);
    url.searchParams.set("og", "true");

    await page.goto(url.toString(), { waitUntil: "networkidle" });

    // Wait for dynamic navbar to load (it's ssr: false), then remove it
    await page.waitForSelector('header', { timeout: 3000 }).catch(() => {});

    // Small delay to ensure React has finished rendering
    await page.waitForTimeout(500);

    // Remove UI chrome elements for clean OG screenshots
    await page.evaluate(() => {
      // Remove navbar
      document.querySelectorAll('header').forEach(el => el.remove());
      // Remove audio player (fixed height containers at bottom)
      document.querySelectorAll('[class*="h-24"], [class*="h-32"]').forEach(el => {
        if (el.closest('main') === null) el.remove();
      });
      // Remove padding from main
      const main = document.querySelector('main');
      if (main) main.style.paddingBottom = '0';
    });

    // Also add CSS as backup
    await page.addStyleTag({
      content: `
        header { display: none !important; }
        nav { display: none !important; }
        nextjs-portal { display: none !important; }
        [data-nextjs-dialog-overlay] { display: none !important; }
        [data-nextjs-toast] { display: none !important; }
      `,
    });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    if (waitForTimeout) {
      await page.waitForTimeout(waitForTimeout);
    }

    let buffer: Buffer;
    if (selector) {
      const element = page.locator(selector).first();
      buffer = await element.screenshot({ type: "jpeg", quality: 95 });
    } else {
      buffer = await page.screenshot({ type: "jpeg", quality: 95 });
    }

    // Convert Buffer to ArrayBuffer for proper BodyInit typing
    const arrayBuffer = new ArrayBuffer(buffer.length);
    new Uint8Array(arrayBuffer).set(buffer);
    return arrayBuffer;
  } finally {
    await browser.close();
  }
}
