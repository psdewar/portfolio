import { supabaseAdmin } from "../../lib/supabase-admin";
import { upsertIdentity } from "./identity";

export async function upsertRsvp({
  email,
  name,
  phone,
  slug,
  guests,
}: {
  email: string;
  name?: string;
  phone?: string;
  slug: string;
  guests: number;
}): Promise<void> {
  const guestCount = Math.max(1, Math.min(10, guests || 1));
  const emailLower = email.trim().toLowerCase();

  await upsertIdentity({
    email: emailLower,
    name,
    phone,
    overwrite: true,
    captureEvent: false,
    source: "rsvp",
  });

  const { error: rsvpError } = await supabaseAdmin
    .from("rsvps")
    .upsert({ show_slug: slug, email: emailLower, guests: guestCount }, { onConflict: "show_slug,email" });
  if (rsvpError) throw new Error(rsvpError.message);
}

export async function markAttended({
  email,
  name,
  phone,
  slug,
}: {
  email: string;
  name?: string;
  phone?: string;
  slug: string;
}): Promise<{ number: number; rsvpd: boolean }> {
  const emailLower = email.trim().toLowerCase();

  const { data: rsvpRow } = await supabaseAdmin
    .from("rsvps")
    .select("email")
    .eq("show_slug", slug)
    .eq("email", emailLower)
    .maybeSingle();
  const rsvpd = !!rsvpRow;

  const { data: assignedNumber, error } = await supabaseAdmin.rpc("attend", {
    p_slug: slug,
    p_email: emailLower,
  });
  if (error) throw new Error(error.message);

  await upsertIdentity({
    email: emailLower,
    name,
    phone,
    overwrite: false,
    captureEvent: false,
    source: "checkin",
  });

  return { number: assignedNumber as number, rsvpd };
}

export async function namesByEmail(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();
  const { data } = await supabaseAdmin
    .from("stay-connected")
    .select("email, name")
    .in("email", emails);
  return new Map((data || []).map((c) => [c.email, c.name || ""]));
}

