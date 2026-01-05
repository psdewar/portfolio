import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { sendGoLiveEmail } from "../../../../lib/sendgrid";

const NOTIFY_SECRET = process.env.LIVE_NOTIFY_SECRET;
const TEST_EMAIL = process.env.LIVE_NOTIFY_TEST_EMAIL;

// Parse the comma-delimited entry format: firstName,email,phone,createdAt
function parseEntry(
  entry: string,
): { firstName: string; email: string } | null {
  const parts = entry.split(",");
  if (parts.length < 2) return null;
  return {
    firstName: parts[0].replace(/\\,/g, ","),
    email: parts[1].replace(/\\,/g, ","),
  };
}

export async function POST(request: NextRequest) {
  // Verify secret token
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!NOTIFY_SECRET || providedSecret !== NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Test mode: only send to TEST_EMAIL
  const isTestMode = request.nextUrl.searchParams.get("test") === "true";
  if (isTestMode) {
    if (!TEST_EMAIL) {
      return NextResponse.json(
        { error: "LIVE_NOTIFY_TEST_EMAIL not configured" },
        { status: 500 },
      );
    }
    const success = await sendGoLiveEmail({
      to: TEST_EMAIL,
      firstName: "Test",
    });
    return NextResponse.json({ test: true, sent: success ? 1 : 0 });
  }

  try {
    // Fetch all subscribers from Supabase
    const { data: subscribers, error } = await supabaseAdmin
      .from("stay-connected")
      .select("entry");

    if (error) {
      console.error("[Notify] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 },
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscribers" });
    }

    // Send emails to all subscribers
    let sent = 0;
    let failed = 0;

    for (const row of subscribers) {
      const parsed = parseEntry(row.entry);
      if (!parsed) {
        failed++;
        continue;
      }

      const success = await sendGoLiveEmail({
        to: parsed.email,
        firstName: parsed.firstName,
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`[Notify] Sent ${sent} emails, ${failed} failed`);
    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("[Notify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
