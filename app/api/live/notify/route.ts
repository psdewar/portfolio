import { NextRequest, NextResponse } from "next/server";
import { sendGoLiveEmail } from "../../../../lib/sendgrid";
import { notifySubscribers } from "../../../lib/notify";

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
    return NextResponse.json(await notifySubscribers());
  } catch (error) {
    console.error("[Notify] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
