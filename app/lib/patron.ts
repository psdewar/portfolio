import type { PatronTierName } from "../data/patron-config";

const EVENT = "patronstatus";

export function activatePatronStatus(): void {
  localStorage.setItem("patronStatus", "active");
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `patronToken=active; path=/; max-age=31536000${secure}; samesite=strict`;
  window.dispatchEvent(new Event(EVENT));
}

export function storePatronEmail(email: string): void {
  localStorage.setItem("patronEmail", email.trim().toLowerCase());
  window.dispatchEvent(new Event(EVENT));
}

export function storePatronTier(tier: PatronTierName | null): void {
  if (tier) localStorage.setItem("patronTier", tier);
  else localStorage.removeItem("patronTier");
  window.dispatchEvent(new Event(EVENT));
}

export function onPatronStatusChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export async function claimPatronSession(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const res = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return false;
  const data = await res.json();
  if (!data.paid || !data.email || !data.patron) return false;
  activatePatronStatus();
  storePatronEmail(data.email);
  storePatronTier(data.tier ?? null);
  return true;
}

export async function claimPatronLink(email: string, sig: string): Promise<boolean> {
  const res = await fetch(`/api/patron-claim?email=${encodeURIComponent(email)}&sig=${encodeURIComponent(sig)}`);
  if (!res.ok) return false;
  const data = await res.json();
  activatePatronStatus();
  storePatronEmail(data.email);
  storePatronTier(data.tier ?? null);
  return true;
}
