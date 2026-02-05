import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import {
  sendGoLiveEmail,
  sendGoLiveEmailBatch,
} from "../../../../lib/sendgrid";

const NOTIFY_SECRET = process.env.LIVE_NOTIFY_SECRET;
const TEST_EMAIL = process.env.LIVE_NOTIFY_TEST_EMAIL;


export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!NOTIFY_SECRET || providedSecret !== NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const { data: subscribers, error } = await supabaseAdmin
      .from("stay-connected")
      .select("email, name")
      .not("email", "like", "_keepalive_%");

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

    const recipients = subscribers.map((row) => ({
      to: row.email,
      firstName: row.name?.split(" ")[0] || "there",
    }));

    const { sent, failed } = await sendGoLiveEmailBatch(recipients);
    const totalFailed = failed;

    console.log(`[Notify] Sent ${sent} emails, ${totalFailed} failed`);
    return NextResponse.json({ sent, failed: totalFailed });
  } catch (error) {
    console.error("[Notify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
