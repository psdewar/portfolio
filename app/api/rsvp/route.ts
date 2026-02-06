import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendRsvpConfirmation } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";

const VALID_EVENTS = new Set(["ftgu-20260220"]);

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "rsvp");
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
    const { name, email, guests, eventId } = body;

    console.log("[RSVP API] Received:", { name, email, guests, eventId });

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!eventId?.trim() || !VALID_EVENTS.has(eventId.trim())) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const guestCount = Math.max(1, Math.min(10, parseInt(guests, 10) || 1));
    const rsvpEntry = `${eventId}:${guestCount}`;
    const emailLower = email.trim().toLowerCase();

    // Check if contact already exists in stay-connected
    const { data: contact } = await supabaseAdmin
      .from("stay-connected")
      .select("id, rsvp")
      .eq("email", emailLower)
      .single();

    if (contact) {
      const current: string[] = contact.rsvp || [];
      if (current.some((r) => r.startsWith(eventId))) {
        return NextResponse.json(
          { error: "You've already RSVP'd! Check your email for details." },
          { status: 400 },
        );
      }
      const { error: updateError } = await supabaseAdmin
        .from("stay-connected")
        .update({ rsvp: [...current, rsvpEntry] })
        .eq("id", contact.id);
      if (updateError) {
        console.error("[RSVP] Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to save RSVP. Please try again." },
          { status: 500 },
        );
      }
      console.log("[RSVP API] Appended", rsvpEntry, "to stay-connected for", emailLower);
    } else {
      const { error: insertError } = await supabaseAdmin.from("stay-connected").insert({
        email: emailLower,
        ...(name?.trim() && { name: name.trim() }),
        rsvp: [rsvpEntry],
      });
      if (insertError) {
        console.error("[RSVP] Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save RSVP. Please try again." },
          { status: 500 },
        );
      }
      console.log("[RSVP API] Created stay-connected entry for", emailLower);
    }

    // Send confirmation email with patron upsell
    try {
      await sendRsvpConfirmation({
        to: email.trim(),
        name: name.trim(),
        guests: guestCount,
        eventName: "From The Ground Up",
        eventDate: "Friday, February 20, 2026",
        eventTime: "Doors at 5pm",
        eventLocation: "8432 Granville Ave, Richmond, BC",
      });
      console.log("[RSVP API] Confirmation email sent to", email.trim());
    } catch (emailError) {
      console.error("[RSVP API] Confirmation email failed for", email.trim(), emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RSVP] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
