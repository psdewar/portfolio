import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendShowBlast } from "../../../lib/sendgrid";
import { namesByEmail } from "../../lib/rsvp";

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

  const { data: rows, error } = await supabaseAdmin
    .from("rsvps")
    .select("email")
    .eq("show_slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "No RSVPs found for this show" }, { status: 404 });
  }

  const names = await namesByEmail(rows.map((r) => r.email));
  const recipients = rows.map((r) => ({ email: r.email, name: names.get(r.email) || "" }));

  const result = await sendShowBlast({ recipients, subject, body, sendAt });
  return NextResponse.json({ ...result, total: recipients.length });
}
