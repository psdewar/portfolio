const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCheckinId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function checkinMetadata(value: unknown): Record<string, string> {
  return isCheckinId(value) ? { checkinId: value } : {};
}
