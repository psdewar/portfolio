import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendShowBlast } from "../../../lib/sendgrid";

const SELF_EMAIL = "psd@lyrist.app";

export async function POST(request: Request) {
  const { slug, subject, body, sendAt, test } = await request.json();

  if (!slug || !subject || !body) {
    return NextResponse.json({ error: "slug, subject, and body required" }, { status: 400 });
  }

  if (test) {
    const result = await sendShowBlast({
      recipients: [{ email: SELF_EMAIL, name: "" }],
      subject: `[TEST] ${subject}`,
      body,
    });
    return NextResponse.json(result);
  }

  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("name, email, rsvp")
    .not("rsvp", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients: { email: string; name: string }[] = [];
  for (const row of data || []) {
    if ((row.rsvp || []).some((r: string) => r.startsWith(slug))) {
      recipients.push({ email: row.email, name: row.name || "" });
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No RSVPs found for this show" }, { status: 404 });
  }

  const result = await sendShowBlast({ recipients, subject, body, sendAt });
  return NextResponse.json({ ...result, total: recipients.length });
}
