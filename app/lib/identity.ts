import { supabaseAdmin } from "../../lib/supabase-admin";
import PostHogClient from "../../lib/posthog";

export interface IdentityContact {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

interface UpsertIdentityParams {
  email: string;
  name?: string | null;
  phone?: string | null;
  tier?: string | null;
  source: string;
  overwrite?: boolean;
  captureEvent?: boolean;
}

export interface UpsertIdentityResult {
  contact: IdentityContact;
}

export function firstNameOf(name: string | null | undefined): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

export async function upsertIdentity({
  email,
  name,
  phone,
  tier,
  source,
  overwrite = false,
  captureEvent = true,
}: UpsertIdentityParams): Promise<UpsertIdentityResult> {
  const emailLower = email.trim().toLowerCase();
  const nameTrimmed = name?.trim() || null;
  const phoneTrimmed = phone?.trim() || null;

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("stay-connected")
    .select("id, email, name, phone")
    .eq("email", emailLower)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);

  const row: Record<string, unknown> = { email: emailLower };
  if (existing) {
    row.name = nameTrimmed && (overwrite || !existing.name) ? nameTrimmed : existing.name;
    row.phone = phoneTrimmed && (overwrite || !existing.phone) ? phoneTrimmed : existing.phone;
  } else {
    row.name = nameTrimmed;
    row.phone = phoneTrimmed;
    row.tier = tier?.trim() || null;
  }

  const { data: contact, error: upsertError } = await supabaseAdmin
    .from("stay-connected")
    .upsert(row, { onConflict: "email" })
    .select("id, email, name, phone")
    .single();
  if (upsertError) throw new Error(upsertError.message);

  if (!existing && captureEvent) {
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: emailLower,
      event: "email_captured",
      properties: { source },
    });
    await posthog.shutdown();
  }

  return { contact };
}
