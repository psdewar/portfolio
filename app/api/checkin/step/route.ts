import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";
import { isCheckinId } from "../../shared/checkin-metadata";
import { CHECKIN_STEPS } from "../../../checkin/steps";

export async function POST(request: Request) {
  const rate = checkRateLimit(getClientIP(request), "checkin-step", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 300,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { checkinId, step } = body as Record<string, unknown>;
  if (!isCheckinId(checkinId) || typeof step !== "string" || !CHECKIN_STEPS.includes(step as never)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("mark_checkin_step", {
    p_id: checkinId,
    p_step: step,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ steps: data ?? {} });
}

export async function GET(request: Request) {
  const rate = checkRateLimit(getClientIP(request), "checkin-step-read", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 300,
  });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!isCheckinId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("attendances")
    .select("steps")
    .eq("public_id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ steps: data?.steps ?? {} });
}
