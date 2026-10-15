const GRAPH = "https://graph.facebook.com";
const OPEN_STATUSES = ["UNPUBLISHED", "LIVE", "SCHEDULED_UNPUBLISHED", "SCHEDULED_LIVE"];

export type FacebookPrivacy = "EVERYONE" | "SELF";

async function graph<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`, init);
  const body = await res.json();
  if (body.error) throw Object.assign(new Error(body.error.message), { code: body.error.code });
  return body as T;
}

function form(fields: Record<string, string>) {
  return { method: "POST", body: new URLSearchParams(fields) };
}

export async function createLiveVideo(
  token: string,
  spec: { title: string; description: string; privacy: FacebookPrivacy },
): Promise<{ id: string; streamUrl: string }> {
  const body = await graph<{ id: string; secure_stream_url: string }>(
    "me/live_videos",
    form({
      access_token: token,
      status: "LIVE_NOW",
      privacy: JSON.stringify({ value: spec.privacy }),
      title: spec.title,
      description: spec.description,
    }),
  );
  return { id: body.id, streamUrl: body.secure_stream_url };
}

export async function isLiveVideoOpen(token: string, id: string): Promise<boolean> {
  try {
    const body = await graph<{ status: string }>(
      `${id}?fields=status&access_token=${encodeURIComponent(token)}`,
    );
    return OPEN_STATUSES.includes(body.status);
  } catch (e) {
    if ((e as { code?: number }).code === 100) return false;
    throw e;
  }
}

export async function updateLiveVideo(
  token: string,
  id: string,
  spec: { title: string; description: string },
) {
  await graph(id, form({ access_token: token, title: spec.title, description: spec.description }));
}

export async function deleteLiveVideo(token: string, id: string) {
  await graph(`${id}?access_token=${encodeURIComponent(token)}`, { method: "DELETE" });
}

export async function exchangeToken(
  shortLived: string,
): Promise<{ token: string; expiresIn: number | null }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FB_APP_ID!,
    client_secret: process.env.FB_APP_SECRET!,
    fb_exchange_token: shortLived,
  });
  const body = await graph<{ access_token: string; expires_in?: number }>(
    `oauth/access_token?${params}`,
  );
  return { token: body.access_token, expiresIn: body.expires_in ?? null };
}

export async function getUserName(token: string): Promise<string> {
  const body = await graph<{ name: string }>(
    `me?fields=name&access_token=${encodeURIComponent(token)}`,
  );
  return body.name;
}
