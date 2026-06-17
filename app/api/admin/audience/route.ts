import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminAuthorized } from "../../shared/admin-auth";
import { isEmailValid } from "../../../lib/email";
import { namesByEmail } from "../../../lib/rsvp";

export async function GET(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [attRes, rsvpRes] = await Promise.all([
    supabaseAdmin.from("attendances").select("show_slug, email"),
    supabaseAdmin.from("rsvps").select("show_slug, email"),
  ]);
  const error = attRes.error || rsvpRes.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const names = await namesByEmail([
    ...new Set([
      ...(attRes.data || []).map((r) => r.email),
      ...(rsvpRes.data || []).map((r) => r.email),
    ]),
  ]);

  const grouped: Record<string, Array<{ name: string; email: string }>> = {};
  const seenPerSlug = new Map<string, Set<string>>();

  function add(slug: string, email: string) {
    if (!slug || !email) return;
    if (!grouped[slug]) {
      grouped[slug] = [];
      seenPerSlug.set(slug, new Set());
    }
    const seen = seenPerSlug.get(slug)!;
    if (!seen.has(email)) {
      seen.add(email);
      grouped[slug].push({ name: names.get(email) || "", email });
    }
  }

  for (const row of rsvpRes.data || []) add(row.show_slug, row.email);
  for (const row of attRes.data || []) add(row.show_slug, row.email);

  return NextResponse.json(grouped);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const attended = Array.isArray(body.attended)
    ? (body.attended as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim() !== "")
        .map((s) => s.trim())
    : [];

  if (!name && !email) {
    return NextResponse.json({ error: "Enter a name or an email." }, { status: 400 });
  }
  if (email && !isEmailValid(email)) {
    return NextResponse.json({ error: "That email looks invalid." }, { status: 400 });
  }

  if (email) {
    const { data: existing } = await supabaseAdmin
      .from("stay-connected")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (name || phone) {
        const { error } = await supabaseAdmin
          .from("stay-connected")
          .update({ ...(name && { name }), ...(phone && { phone }) })
          .eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin
        .from("stay-connected")
        .insert({ name: name || null, email, phone: phone || null });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (attended.length) {
      const rows = attended.map((slug) => ({ show_slug: slug, email }));
      const { error } = await supabaseAdmin
        .from("attendances")
        .upsert(rows, { onConflict: "show_slug,email", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("stay-connected").insert({ name: name || null });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
