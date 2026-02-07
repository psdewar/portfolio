import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail, sendGoLiveEmail, sendRsvpConfirmation, sendDownloadEmail } from "../../../lib/sendgrid";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type");
  const to = request.nextUrl.searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Missing ?to=email" }, { status: 400 });
  }

  switch (type) {
    case "otp":
      await sendOtpEmail({ to, code: "4829" });
      break;
    case "live":
      await sendGoLiveEmail({ to, firstName: "Peyt" });
      break;
    case "rsvp":
      await sendRsvpConfirmation({
        to,
        name: "Peyt",
        guests: 2,
        eventName: "From The Ground Up",
        eventDate: "Friday, February 20, 2026",
        eventTime: "Doors at 5pm",
      });
      break;
    case "rsvp-music":
      await sendRsvpConfirmation({
        to,
        name: "Peyt",
        guests: 1,
        eventName: "From The Ground Up",
        eventDate: "Friday, February 20, 2026",
        eventTime: "Doors at 5pm",
        purchasingMusic: true,
      });
      break;
    case "download":
      await sendDownloadEmail({
        to,
        productName: "Singles & 16s (2025)",
        downloadUrl: "https://peytspencer.com/download?session_id=test_123",
      });
      break;
    default:
      return NextResponse.json({
        error: "Missing ?type=otp|live|rsvp|rsvp-music|download",
        usage: "/api/test-email?type=otp&to=you@email.com",
      }, { status: 400 });
  }

  return NextResponse.json({ sent: type, to });
}
