export const DATA_MODES = ["demo", "worst", "empty", "one", "huge"] as const;
export type DataMode = (typeof DATA_MODES)[number];

export const DATA_COOKIE = "ui-data";

export const isDataMode = (value: string | null | undefined): value is DataMode =>
  DATA_MODES.includes(value as DataMode);

export async function getDataMode(): Promise<DataMode> {
  if (process.env.NODE_ENV !== "development") return "demo";
  try {
    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(DATA_COOKIE)?.value;
    return isDataMode(value) ? value : "demo";
  } catch {
    return "demo";
  }
}
