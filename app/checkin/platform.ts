export type Device = "ios" | "samsung" | "pixel" | "desktop";

export function detectDevice(): Device {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/SM-|Samsung/i.test(ua)) return "samsung";
  if (/Android/.test(ua)) return "pixel";
  return "desktop";
}

type UAData = { getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }> };

export async function resolveDevice(): Promise<Device> {
  const device = detectDevice();
  if (device !== "pixel") return device;
  const data = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (!data?.getHighEntropyValues) return device;
  try {
    const { model } = await data.getHighEntropyValues(["model"]);
    return model && /^SM-/i.test(model) ? "samsung" : device;
  } catch {
    return device;
  }
}
