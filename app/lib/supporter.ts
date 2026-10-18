import type { SupporterTierName } from "../data/supporter-config";

const EVENT = "supporterstatus";

export function activateSupporterStatus(): void {
  localStorage.setItem("supporterStatus", "active");
  window.dispatchEvent(new Event(EVENT));
}

export function storeSupporterEmail(email: string): void {
  localStorage.setItem("supporterEmail", email.trim().toLowerCase());
  window.dispatchEvent(new Event(EVENT));
}

export function storeSupporterTier(tier: SupporterTierName | null): void {
  if (tier) localStorage.setItem("supporterTier", tier);
  else localStorage.removeItem("supporterTier");
  window.dispatchEvent(new Event(EVENT));
}

export function onSupporterStatusChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export async function claimSupporterSession(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const res = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return false;
  const data = await res.json();
  if (!data.paid || !data.email || !data.supporter) return false;
  activateSupporterStatus();
  storeSupporterEmail(data.email);
  storeSupporterTier(data.tier ?? null);
  return true;
}

export async function claimSupporterLink(email: string, sig: string): Promise<boolean> {
  const res = await fetch(`/api/supporter-claim?email=${encodeURIComponent(email)}&sig=${encodeURIComponent(sig)}`);
  if (!res.ok) return false;
  const data = await res.json();
  activateSupporterStatus();
  storeSupporterEmail(data.email);
  storeSupporterTier(data.tier ?? null);
  return true;
}
