import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail, sendGoLiveEmail, sendRsvpConfirmation, sendDownloadEmail, sendPatronWelcomeEmail } from "../../../lib/sendgrid";
import { patronClaimPath } from "../../lib/confirm";

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
        title: "From The Ground Up: My Path of Growth and the Principles that Connect Us",
        dateLabel: "Sunday, October 25",
        shortDate: "Sunday, Oct 25",
        city: "Springfield",
        region: "CA",
        doorLabel: "Doors open at 11:00AM",
        venueName: "The Sample Residence",
        address: "123 Example St, Springfield, CA 90000",
        ics: { filename: "sample.ics", content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" },
      });
      break;
    case "rsvp-music":
      await sendRsvpConfirmation({
        to,
        title: "From The Ground Up: My Path of Growth and the Principles that Connect Us",
        dateLabel: "Sunday, October 25",
        shortDate: "Sunday, Oct 25",
        city: "Springfield",
        region: "CA",
        doorLabel: "Doors open at 11:00AM",
        venueName: "The Sample Residence",
        address: "123 Example St, Springfield, CA 90000",
        ics: { filename: "sample.ics", content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" },
        maybe: true,
      });
      break;
    case "download":
      await sendDownloadEmail({
        to,
        productName: "Singles & 16s (2025)",
        downloadUrl: "https://peytspencer.com/download?session_id=test_123",
      });
      break;
    case "patron-welcome":
      await sendPatronWelcomeEmail({ to, claimPath: patronClaimPath(to) });
      break;
    default:
      return NextResponse.json({
        error: "Missing ?type=otp|live|rsvp|rsvp-music|download|patron-welcome",
        usage: "/api/test-email?type=otp&to=you@email.com",
      }, { status: 400 });
  }

  return NextResponse.json({ sent: type, to });
}
