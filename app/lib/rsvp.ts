import { supabaseAdmin, selectAll } from "../../lib/supabase-admin";
import { upsertIdentity } from "./identity";
import type { Utm } from "./utm";

export async function upsertRsvp({
  email,
  name,
  phone,
  slug,
  guests,
  utm = {},
}: {
  email: string;
  name?: string;
  phone?: string;
  slug: string;
  guests: number;
  utm?: Utm;
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

  const row = { show_slug: slug, email: emailLower, guests: guestCount };
  const upsert = (r: object) =>
    supabaseAdmin.from("rsvps").upsert(r, { onConflict: "show_slug,email" });
  // Only send UTM keys that exist so a re-RSVP without tags doesn't wipe the original source.
  let { error: rsvpError } = await upsert({ ...row, ...utm });
  // Migration 008 not applied yet: save the RSVP without the tags rather than failing it.
  if (rsvpError && Object.keys(utm).length && /utm_/.test(rsvpError.message)) {
    ({ error: rsvpError } = await upsert(row));
  }
  if (rsvpError) throw new Error(rsvpError.message);
}

export async function markAttended({
  email,
  name,
  phone,
  slug,
  claimId,
  carryFromId,
}: {
  email: string;
  name?: string;
  phone?: string;
  slug: string;
  claimId?: string | null;
  carryFromId?: string | null;
}): Promise<{ number: number; rsvpd: boolean; checkinId: string | null; steps: Record<string, string> }> {
  const emailLower = email.trim().toLowerCase();

  const { data: rsvpRow } = await supabaseAdmin
    .from("rsvps")
    .select("email")
    .eq("show_slug", slug)
    .eq("email", emailLower)
    .maybeSingle();
  const rsvpd = !!rsvpRow;

  const { data: assignedNumber, error } = claimId
    ? await supabaseAdmin
        .rpc("claim_checkin", { p_id: claimId, p_slug: slug, p_email: emailLower })
        .then(({ data, error: claimError }) => ({
          data: (data as { number: number }[] | null)?.[0]?.number ?? null,
          error: claimError,
        }))
    : await supabaseAdmin.rpc("attend", { p_slug: slug, p_email: emailLower });
  if (error) throw new Error(error.message);

  await upsertIdentity({
    email: emailLower,
    name,
    phone,
    overwrite: false,
    captureEvent: false,
    source: "checkin",
  });

  const { data: attendanceRows } = await supabaseAdmin
    .from("attendances")
    .select("show_slug, public_id, steps")
    .eq("email", emailLower);

  const rows = (attendanceRows ?? []) as {
    show_slug: string;
    public_id: string | null;
    steps: Record<string, string> | null;
  }[];
  const current = rows.find((r) => r.show_slug === slug);
  const carried: Record<string, string> = {};
  const owned = !!carryFromId && rows.some((r) => r.show_slug !== slug && r.public_id === carryFromId);
  for (const row of owned ? rows : []) {
    if (row.show_slug === slug) continue;
    const { upload: _upload, ...rest } = row.steps ?? {};
    Object.assign(carried, rest);
  }

  return {
    number: assignedNumber as number,
    rsvpd,
    checkinId: current?.public_id ?? null,
    steps: { ...carried, ...(current?.steps ?? {}) },
  };
}

export async function namesByEmail(emails: string[]): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += 200) chunks.push(emails.slice(i, i + 200));
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabaseAdmin.from("stay-connected").select("email, name").in("email", chunk),
    ),
  );
  return new Map(
    results.flatMap(({ data }) => (data || []).map((c) => [c.email, c.name || ""] as const)),
  );
}


export async function getRsvpCounts(): Promise<Record<string, { responses: number; attending: number }>> {
  const data = await selectAll<{ show_slug: string; guests: number | null }>((from, to) =>
    supabaseAdmin.from("rsvps").select("show_slug, guests").order("id").range(from, to),
  );
  const counts: Record<string, { responses: number; attending: number }> = {};
  for (const row of data || []) {
    if (!counts[row.show_slug]) counts[row.show_slug] = { responses: 0, attending: 0 };
    counts[row.show_slug].responses += 1;
    counts[row.show_slug].attending += row.guests ?? 1;
  }
  return counts;
}

export async function checkinExists(slug: string, checkinId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("attendances")
    .select("id")
    .eq("show_slug", slug)
    .eq("public_id", checkinId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function skipCheckin(
  slug: string,
  checkinId: string,
): Promise<{ number: number; checkinId: string; steps: Record<string, string> }> {
  const { data, error } = await supabaseAdmin.rpc("skip_checkin", { p_slug: slug, p_id: checkinId });
  if (error) throw new Error(error.message);
  const row = (data as { public_id: string; number: number; steps: Record<string, string> }[])[0];
  return { number: row.number, checkinId: row.public_id, steps: row.steps ?? {} };
}
