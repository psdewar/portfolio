import fs from "node:fs";
import path from "node:path";
import { chromium as playwright, type Browser } from "playwright-core";

const BASE_URL =
  process.env.OG_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://peytspencer.com");
const IS_LOCAL = process.env.NODE_ENV === "development" || !process.env.VERCEL;

interface ScreenshotOptions {
  path: string;
  selector?: string;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
  waitForTimeout?: number;
  htmlContent?: string;
  type?: "jpeg" | "png";
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
  pageFormat,
}: {
  htmlContent: string;
  viewport: { width: number; height: number };
  pageFormat?: "Letter" | "A4" | "Legal" | "match";
}): Promise<ArrayBuffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport });
    await page.route("**/*", (route) =>
      BLOCKED.test(route.request().url()) ? route.abort() : route.continue(),
    );
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // "match" or undefined → custom PDF page size matching the design's exact dimensions.
    // This preserves any aspect ratio (square, 4:5, etc.) without letterboxing or cropping,
    // and emits vector text at the design's native pixel scale.
    const useMatch = !pageFormat || pageFormat === "match";
    const pdf = useMatch
      ? await page.pdf({
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          printBackground: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
          preferCSSPageSize: false,
        })
      : await (() => {
          // Standard paper format with scaling to fill (letterboxes on aspect mismatch)
          const PAGE_DIMS = {
            Letter: { w: 816, h: 1056 },
            A4: { w: 794, h: 1123 },
            Legal: { w: 816, h: 1344 },
          };
          const target = PAGE_DIMS[pageFormat];
          const scale = Math.min(target.w / viewport.width, target.h / viewport.height);
          return page.pdf({
            format: pageFormat,
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            scale,
            preferCSSPageSize: false,
          });
        })();
    const ab = new ArrayBuffer(pdf.length);
    new Uint8Array(ab).set(pdf);
    return ab;
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
  type = "jpeg",
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
      // Hide chrome/dev overlays before any layout settles. og-mode class itself is applied
      // page-side via React state — adding it to <html> here is futile (React 18 hydration
      // reconciles <html> attributes against the React tree and strips externally-added classes).
      await page.addStyleTag({
        content: `header, nav, nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }`,
      });
      await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => {
        document.querySelectorAll("header").forEach((el) => el.remove());
        document.querySelectorAll('[class*="h-24"], [class*="h-32"]').forEach((el) => {
          if (el.closest("main") === null) el.remove();
        });
        const main = document.querySelector("main");
        if (main) main.style.paddingBottom = "0";
      });
    }

    if (selector) {
      await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
    }

    if (waitForTimeout) await page.waitForTimeout(waitForTimeout);

    const target = selector ? page.locator(selector).first() : page;
    const buffer =
      type === "png"
        ? await target.screenshot({ type: "png" })
        : await target.screenshot({ type: "jpeg", quality: 100 });
    const ab = new ArrayBuffer(buffer.length);
    new Uint8Array(ab).set(buffer);
    return ab;
  } finally {
    await browser.close();
  }
}
