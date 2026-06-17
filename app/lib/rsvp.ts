import { supabaseAdmin } from "../../lib/supabase-admin";

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
  const phoneTrimmed = phone?.trim();
  const nameTrimmed = name?.trim();

  const { data: contact } = await supabaseAdmin
    .from("stay-connected")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();

  if (contact) {
    if (nameTrimmed || phoneTrimmed) {
      const { error } = await supabaseAdmin
        .from("stay-connected")
        .update({ ...(nameTrimmed && { name: nameTrimmed }), ...(phoneTrimmed && { phone: phoneTrimmed }) })
        .eq("id", contact.id);
      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await supabaseAdmin.from("stay-connected").insert({
      email: emailLower,
      ...(nameTrimmed && { name: nameTrimmed }),
      ...(phoneTrimmed && { phone: phoneTrimmed }),
    });
    if (error) throw new Error(error.message);
  }

  const { error: rsvpError } = await supabaseAdmin
    .from("rsvps")
    .upsert({ show_slug: slug, email: emailLower, guests: guestCount }, { onConflict: "show_slug,email" });
  if (rsvpError) throw new Error(rsvpError.message);
}

// Atomic, race-free admission number via attend() (see 004_attendances.sql):
// derived from arrival rank, idempotent across devices, never reserved by RSVP.
export async function markAttended({
  email,
  name,
  slug,
}: {
  email: string;
  name?: string;
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

  const { data: contact } = await supabaseAdmin
    .from("stay-connected")
    .select("id")
    .eq("email", emailLower)
    .maybeSingle();
  if (!contact) {
    const { error: insertError } = await supabaseAdmin.from("stay-connected").insert({
      email: emailLower,
      ...(name?.trim() && { name: name.trim() }),
    });
    if (insertError) throw new Error(insertError.message);
  }

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
