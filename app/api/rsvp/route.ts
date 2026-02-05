import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendRsvpConfirmation } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";

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
    const { name, email, guests } = body;

    console.log("[RSVP API] Received:", { name, email, guests });

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const guestCount = Math.max(1, Math.min(10, parseInt(guests, 10) || 1));

    // Store RSVP in Supabase
    const { error: dbError } = await supabaseAdmin.from("rsvps").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      guests: guestCount,
      event: "from-the-ground-up-2026",
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      // Check if it's a duplicate email for this event
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "You've already RSVP'd! Check your email for details." },
          { status: 400 },
        );
      }
      console.error("[RSVP] Database error:", dbError);
      return NextResponse.json({ error: "Failed to save RSVP. Please try again." }, { status: 500 });
    }

    console.log("[RSVP API] Saved to Supabase");

    // Append show slug to contact's rsvp array in stay-connected
    const showSlug = "ftgu-20260220";
    const emailLower = email.trim().toLowerCase();
    try {
      const { data: contact } = await supabaseAdmin
        .from("stay-connected")
        .select("id, rsvp")
        .eq("email", emailLower)
        .single();

      if (contact) {
        const current: string[] = contact.rsvp || [];
        if (!current.includes(showSlug)) {
          await supabaseAdmin
            .from("stay-connected")
            .update({ rsvp: [...current, showSlug] })
            .eq("id", contact.id);
          console.log("[RSVP API] Appended", showSlug, "to stay-connected for", emailLower);
        }
      }
    } catch (scErr) {
      console.error("[RSVP API] stay-connected update failed:", scErr);
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
