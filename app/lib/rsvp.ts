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
  const rsvpEntry = `${slug}:${guestCount}`;
  const emailLower = email.trim().toLowerCase();
  const phoneTrimmed = phone?.trim();

  const { data: contact } = await supabaseAdmin
    .from("stay-connected")
    .select("id, rsvp")
    .eq("email", emailLower)
    .single();

  if (contact) {
    const current: string[] = contact.rsvp || [];
    const filtered = current.filter((r) => !r.startsWith(`${slug}:`));
    const { error } = await supabaseAdmin
      .from("stay-connected")
      .update({ rsvp: [...filtered, rsvpEntry], ...(phoneTrimmed && { phone: phoneTrimmed }) })
      .eq("id", contact.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("stay-connected").insert({
      email: emailLower,
      ...(name?.trim() && { name: name.trim() }),
      ...(phoneTrimmed && { phone: phoneTrimmed }),
      rsvp: [rsvpEntry],
    });
    if (error) throw new Error(error.message);
  }
}
