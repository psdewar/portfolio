import { chromium as playwright, type Browser } from "playwright-core";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";
const IS_LOCAL =
  process.env.NODE_ENV === "development" || !process.env.VERCEL;

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function launchBrowser(): Promise<Browser> {
  if (IS_LOCAL) {
    const { chromium: localPlaywright } = await import("playwright");
    return localPlaywright.launch({ headless: true });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function GET(request: Request) {
  const browser = await launchBrowser();
  const incomingUrl = new URL(request.url);

  try {
    const page = await browser.newPage({
      viewport: { width: 816, height: 1056 },
      deviceScaleFactor: 2,
      colorScheme: "light",
    });

    const url = new URL("/sponsor/edit", BASE_URL);
    url.searchParams.set("og", "true");
    for (const key of ["city", "date", "host", "phone", "email", "items"]) {
      const val = incomingUrl.searchParams.get(key);
      if (val) url.searchParams.set(key, val);
    }

    await page.goto(url.toString(), { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll("header").forEach((el) => el.remove());
      document.querySelectorAll("nav").forEach((el) => el.remove());
      const main = document.querySelector("main");
      if (main) main.style.paddingBottom = "0";
    });

    await page.addStyleTag({
      content: `
        header, nav, nextjs-portal,
        [data-nextjs-dialog-overlay],
        [data-nextjs-toast] { display: none !important; }
      `,
    });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="peyt-spencer-concert-collaboration.pdf"',
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new Response("PDF generation failed", { status: 500 });
  } finally {
    await browser.close();
  }
}
