import { supabaseAdmin } from "../../lib/supabase-admin";
import { sendGoLiveEmailBatch } from "../../lib/sendgrid";

export async function notifySubscribers(): Promise<{ sent: number; failed: number }> {
  const { data: subscribers, error } = await supabaseAdmin
    .from("stay-connected")
    .select("email, name")
    .not("email", "like", "_keepalive_%");

  if (error) {
    console.error("[Notify] Database error:", error);
    throw new Error("Failed to fetch subscribers");
  }

  const recipients = (subscribers || []).map((row) => ({
    to: row.email,
    firstName: row.name?.split(" ")[0] || "there",
  }));

  const result = await sendGoLiveEmailBatch(recipients);
  console.log(`[Notify] Sent ${result.sent} emails, ${result.failed} failed`);
  return result;
}
