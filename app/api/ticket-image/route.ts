import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "../../lib/screenshot";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import { ALLOWED_ORIGINS } from "../shared/audio-utils";

// Renders the ticket in a headless browser, clipped to just the ticket (straight, no backdrop); name/email typed into the form, never the URL.
export async function POST(request: NextRequest) {
  const rate = checkRateLimit(getClientIP(request), "ticket-image", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 12,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.resetIn / 1000)) } },
    );
  }

  const { slug, name, email, ticketNo, rsvpd } = await request.json();
  if (!slug || !name || !email) {
    return NextResponse.json({ error: "Missing slug, name, or email" }, { status: 400 });
  }
  const noParam = Number.isFinite(ticketNo) ? `&no=${ticketNo}` : "";
  const rsvpdParam = rsvpd ? "&rsvpd=1" : "";

  // Never trust the Host header for the render target (SSRF).
  let origin = `http://localhost:${process.env.PORT || 3000}`;
  if (process.env.VERCEL) {
    origin = `https://${request.nextUrl.hostname}`;
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json({ error: "Invalid host" }, { status: 400 });
    }
  }
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 3 });
    // Block analytics/trackers: they hold sockets open and would count a render as a real pageview.
    await page.route("**/*", (route) =>
      /\/ingest\/|posthog\.com|vercel-insights|vitals\.vercel|va\.vercel-scripts|google-analytics|googletagmanager|gtag|doubleclick/.test(
        route.request().url(),
      )
        ? route.abort()
        : route.continue(),
    );
    await page.goto(`${origin}/ticket/${encodeURIComponent(slug)}?preview=1&capture=1${noParam}${rsvpdParam}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
    await page.waitForSelector('input[autocomplete="name"]', { state: "visible", timeout: 10000 });
    await page.fill('input[autocomplete="name"]', name); // not [type=text], honeypot is also text
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');

    // Keepsake = intact, straight ticket: freeze the rip + flash, drop the tilt.
    await page.addStyleTag({
      content:
        ".stub-rip{animation:none!important;transform:none!important}.photo-flash{display:none!important}.ticket-enter{animation:none!important;transform:none!important}",
    });
    await page.waitForTimeout(900); // let the admit stamp settle

    await page
      .evaluate(() => {
        // Drop every backdrop + scale so the clip is exactly the ticket, gold gone.
        let el = (document.querySelector(".ticket-enter") as HTMLElement | null)
          ?.parentElement as HTMLElement | null;
        while (el && el !== document.body) {
          el.style.background = "transparent";
          el.style.transform = "none";
          el.style.transition = "none";
          el = el.parentElement;
        }
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";
        document.querySelectorAll(".support-pulse").forEach((b) => {
          (b as HTMLElement).style.display = "none";
        });
      })
      .catch(() => {});
    await page.waitForTimeout(150);

    const buffer = await page
      .locator(".ticket-enter")
      .screenshot({ type: "png", omitBackground: true });

    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="ground-up-ticket.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ticket-image render failed:", err);
    return NextResponse.json({ error: "Could not generate ticket image" }, { status: 500 });
  } finally {
    await browser.close();
  }
}
