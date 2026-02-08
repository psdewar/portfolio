import { NextResponse } from "next/server";
import { sendSponsorSubmission } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "sponsor");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const { name, email, city, items } = body;

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one support item is required" },
        { status: 400 },
      );
    }

    const sent = await sendSponsorSubmission({
      name: name?.trim() || "",
      email: email.trim(),
      city: city?.trim() || "",
      items,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send submission. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sponsor] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
