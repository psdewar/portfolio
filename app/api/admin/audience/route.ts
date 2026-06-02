import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminAuthorized } from "../../shared/admin-auth";
import { isEmailValid } from "../../../lib/email";

export async function GET(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("name, email, rsvp, attended");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, Array<{ name: string; email: string }>> = {};
  const seenPerSlug = new Map<string, Set<string>>();

  function add(slug: string, name: string, email: string) {
    if (!grouped[slug]) {
      grouped[slug] = [];
      seenPerSlug.set(slug, new Set());
    }
    const seen = seenPerSlug.get(slug)!;
    if (!seen.has(email)) {
      seen.add(email);
      grouped[slug].push({ name, email });
    }
  }

  for (const row of data || []) {
    const name = row.name || "";
    const email = row.email;
    for (const entry of row.rsvp || []) {
      const slug = entry.split(":")[0];
      if (slug) add(slug, name, email);
    }
    for (const slug of row.attended || []) {
      if (slug) add(slug, name, email);
    }
  }

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

  const { error } = await supabaseAdmin.from("stay-connected").insert({
    name: name || null,
    email: email || null,
    phone: phone || null,
    attended: attended.length ? attended : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
