import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { sendShowBlast } from "../../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";
import { isAdminAuthorized } from "../../shared/admin-auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type EmailImage,
} from "../../../../lib/email-image";

const TEST_FALLBACK = "psd@lyrist.app";

async function fetchRecipientsForSlugs(
  slugs: string[],
): Promise<Array<{ email: string; name: string }>> {
  const slugSet = new Set(slugs);
  const overlapsList = slugs.join(",");

  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("name, email, rsvp, attended")
    .or(`rsvp.not.is.null,attended.ov.{${overlapsList}}`);
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const recipients: Array<{ email: string; name: string }> = [];

  for (const row of data || []) {
    if (seen.has(row.email)) continue;

    let match = false;
    for (const entry of row.rsvp || []) {
      if (slugSet.has(entry.split(":")[0])) {
        match = true;
        break;
      }
    }
    if (!match) {
      for (const slug of row.attended || []) {
        if (slugSet.has(slug)) {
          match = true;
          break;
        }
      }
    }

    if (match) {
      seen.add(row.email);
      recipients.push({ email: row.email, name: row.name || "" });
    }
  }

  return recipients;
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "admin-emails", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limited. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const {
    showSlugs,
    subject,
    body: emailBody,
    testOnly,
    testEmail,
    sendAt,
    image: imageInput,
  } = body as {
    showSlugs?: string[];
    subject?: string;
    body?: string;
    testOnly?: boolean;
    testEmail?: string;
    sendAt?: number;
    image?: Partial<EmailImage>;
  };

  if (!subject?.trim() || !emailBody?.trim()) {
    return NextResponse.json(
      { error: "Subject and body are required." },
      { status: 400 },
    );
  }

  let image: EmailImage | undefined;
  if (imageInput?.base64) {
    if (!imageInput.type || !ALLOWED_IMAGE_TYPES.has(imageInput.type)) {
      return NextResponse.json(
        { error: "Unsupported image type." },
        { status: 400 },
      );
    }
    if (Math.floor((imageInput.base64.length * 3) / 4) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 8 MB)." },
        { status: 400 },
      );
    }
    image = {
      base64: imageInput.base64,
      type: imageInput.type,
      filename: imageInput.filename?.trim() || "image",
      alt: imageInput.alt?.trim() || undefined,
    };
  }

  let scheduledAt: number | undefined;
  if (typeof sendAt === "number" && Number.isFinite(sendAt) && sendAt > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    const maxSec = nowSec + 72 * 60 * 60; // SendGrid caps at 72 hours
    if (sendAt < nowSec) {
      return NextResponse.json(
        { error: "Schedule time is in the past." },
        { status: 400 },
      );
    }
    if (sendAt > maxSec) {
      return NextResponse.json(
        {
          error:
            "Schedule time is more than 72 hours out. SendGrid caps at 72h.",
        },
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
      image,
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
    return NextResponse.json(
      { error: "Select at least one show." },
      { status: 400 },
    );
  }

  let recipients: Array<{ email: string; name: string }>;
  try {
    recipients = await fetchRecipientsForSlugs(showSlugs);
  } catch (err) {
    console.error("[admin/emails] recipient fetch error", err);
    return NextResponse.json(
      { error: "Failed to load recipients." },
      { status: 500 },
    );
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
    image,
  });
  return NextResponse.json({
    ...result,
    count: recipients.length,
    scheduledAt,
  });
}
