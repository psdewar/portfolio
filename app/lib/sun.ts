const RAD = Math.PI / 180;

export type Lights = "off" | "low" | "high";

export function sunAltitude(date: Date, lat: number, lon: number): number {
  const n = date.getTime() / 86400000 - 10957.5;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const ha = (gmst * 15 + lon) * RAD - ra;
  const alt = Math.asin(
    Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(ha),
  );
  return alt / RAD;
}

export function lightsFor(altitude: number): Lights {
  if (altitude > -0.833) return "off";
  if (altitude > -12) return "low";
  return "high";
}
