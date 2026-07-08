import { createHash } from "crypto";

const DATASET_ID = process.env.META_DATASET_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const ATTEMPTS = 3;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function sendMetaLead({
  email,
  slug,
  ip,
  userAgent,
  fbclid,
}: {
  email: string;
  slug: string;
  ip?: string | null;
  userAgent?: string | null;
  fbclid?: string | null;
}) {
  if (!DATASET_ID || !ACCESS_TOKEN) return;

  const emailLower = email.trim().toLowerCase();
  const userData: Record<string, unknown> = { em: [sha256(emailLower)] };
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbclid) userData.fbc = `fb.1.${Date.now()}.${fbclid}`;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_id: sha256(`${slug}|${emailLower}`).slice(0, 32),
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: `https://peytspencer.com/rsvp/${slug}`,
        user_data: userData,
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v23.0/${DATASET_ID}/events?access_token=${ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) return;
      const text = await res.text();
      if (res.status < 500 && res.status !== 429) {
        console.error("[Meta CAPI] Lead rejected:", text);
        return;
      }
      console.error(`[Meta CAPI] attempt ${attempt} failed (${res.status}):`, text);
    } catch (error) {
      console.error(`[Meta CAPI] attempt ${attempt} failed:`, error);
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}
