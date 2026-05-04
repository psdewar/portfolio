import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminAuthorized } from "../../shared/admin-auth";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
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
