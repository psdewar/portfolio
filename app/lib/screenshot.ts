import fs from "node:fs";
import path from "node:path";
import { chromium as playwright, type Browser } from "playwright-core";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";
const IS_LOCAL = process.env.NODE_ENV === "development" || !process.env.VERCEL;

interface ScreenshotOptions {
  path: string;
  selector?: string;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
  waitForTimeout?: number;
  htmlContent?: string;
}

const BLOCKED =
  /\/ingest\/|posthog\.com|vercel-insights|vitals\.vercel|va\.vercel-scripts|google-analytics|googletagmanager|gtag|doubleclick/;

export async function launchBrowser(): Promise<Browser> {
  if (IS_LOCAL) {
    // Local development: use system playwright
    const { chromium: localPlaywright } = await import("playwright");
    return localPlaywright.launch({ headless: true });
  }

  // Production (Vercel/Lambda): use @sparticuz/chromium
  const chromium = (await import("@sparticuz/chromium")).default;
  const binPath = path.join(process.cwd(), "node_modules/@sparticuz/chromium/bin");
  const executablePath = fs.existsSync(binPath)
    ? await chromium.executablePath(binPath)
    : await chromium.executablePath();
  return playwright.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

export async function takePdf({
  htmlContent,
  viewport,
  pageFormat = "Letter",
}: {
  htmlContent: string;
  viewport: { width: number; height: number };
  pageFormat?: "Letter" | "A4" | "Legal";
}): Promise<Uint8Array> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport });
    await page.route("**/*", (route) =>
      BLOCKED.test(route.request().url()) ? route.abort() : route.continue(),
    );
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Page dimensions at 96 DPI (Chromium's CSS pixel = 1/96 inch)
    const PAGE_DIMS = {
      Letter: { w: 816, h: 1056 },
      A4: { w: 794, h: 1123 },
      Legal: { w: 816, h: 1344 },
    };
    const target = PAGE_DIMS[pageFormat];
    // Scale to fill the page without cropping (letterboxes if aspect mismatches)
    const scale = Math.min(target.w / viewport.width, target.h / viewport.height);

    const pdf = await page.pdf({
      format: pageFormat,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      scale,
      preferCSSPageSize: false,
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}

export async function takeScreenshot({
  path,
  selector,
  viewport = { width: 1200, height: 630 },
  deviceScaleFactor = 2,
  waitForTimeout,
  htmlContent,
}: ScreenshotOptions) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor,
    });

    await page.route("**/*", (route) =>
      BLOCKED.test(route.request().url()) ? route.abort() : route.continue(),
    );

    if (htmlContent) {
      await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 12000 });
      await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    } else {
      const url = new URL(path, BASE_URL);
      url.searchParams.set("og", "true");
      await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.evaluate(() => {
        document.documentElement.classList.add("og-mode");
        document.querySelectorAll("header").forEach((el) => el.remove());
        document.querySelectorAll('[class*="h-24"], [class*="h-32"]').forEach((el) => {
          if (el.closest("main") === null) el.remove();
        });
        const main = document.querySelector("main");
        if (main) main.style.paddingBottom = "0";
      });
      await page.addStyleTag({
        content: `header, nav, nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }`,
      });
      await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
    }

    if (selector) {
      await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
    }

    if (waitForTimeout) await page.waitForTimeout(waitForTimeout);

    const target = selector ? page.locator(selector).first() : page;
    const buffer = await target.screenshot({ type: "jpeg", quality: 100 });
    return new Uint8Array(buffer);
  } finally {
    await browser.close();
  }
}
