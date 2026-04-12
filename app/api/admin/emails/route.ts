import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { sendShowBlast } from "../../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "peyt2024";
const TEST_FALLBACK = "psd@lyrist.app";

function isAuthorized(request: Request): boolean {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

async function fetchRecipientsForSlugs(
  slugs: string[],
): Promise<Array<{ email: string; name: string }>> {
  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("name, email, rsvp")
    .not("rsvp", "is", null);
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const recipients: Array<{ email: string; name: string }> = [];
  const slugSet = new Set(slugs);

  for (const row of data || []) {
    for (const entry of row.rsvp || []) {
      const slug = entry.split(":")[0];
      if (slugSet.has(slug) && !seen.has(row.email)) {
        seen.add(row.email);
        recipients.push({ email: row.email, name: row.name || "" });
        break;
      }
    }
  }
  return recipients;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "admin-emails", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    showSlugs,
    subject,
    body: emailBody,
    testOnly,
    testEmail,
    sendAt,
  } = body as {
    showSlugs?: string[];
    subject?: string;
    body?: string;
    testOnly?: boolean;
    testEmail?: string;
    sendAt?: number;
  };

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  }

  let scheduledAt: number | undefined;
  if (typeof sendAt === "number" && Number.isFinite(sendAt) && sendAt > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const maxSec = nowSec + 72 * 60 * 60; // SendGrid caps at 72 hours
    if (sendAt < nowSec) {
      return NextResponse.json({ error: "Schedule time is in the past." }, { status: 400 });
    }
    if (sendAt > maxSec) {
      return NextResponse.json(
        { error: "Schedule time is more than 72 hours out. SendGrid caps at 72h." },
        { status: 400 },
      );
    }
    scheduledAt = sendAt;
  }

  if (testOnly) {
    const target = testEmail?.trim() || TEST_FALLBACK;
    const result = await sendShowBlast({
      recipients: [{ email: target, name: "Test" }],
      subject: `[TEST] ${subject}`,
      body: emailBody,
      sendAt: scheduledAt,
    });
    return NextResponse.json({
      ...result,
      count: 1,
      test: true,
      target,
      scheduledAt,
    });
  }

  if (!Array.isArray(showSlugs) || showSlugs.length === 0) {
    return NextResponse.json({ error: "Select at least one show." }, { status: 400 });
  }

  let recipients: Array<{ email: string; name: string }>;
  try {
    recipients = await fetchRecipientsForSlugs(showSlugs);
  } catch (err) {
    console.error("[admin/emails] recipient fetch error", err);
    return NextResponse.json({ error: "Failed to load recipients." }, { status: 500 });
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients matched the selected shows." },
      { status: 400 },
    );
  }

  const result = await sendShowBlast({
    recipients,
    subject,
    body: emailBody,
    sendAt: scheduledAt,
  });
  return NextResponse.json({
    ...result,
    count: recipients.length,
    scheduledAt,
  });
}
