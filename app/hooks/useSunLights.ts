import { useEffect, useState } from "react";
import { lightsFor, sunAltitude, type Lights } from "../lib/sun";

export function useSunLights() {
  const [lights, setLights] = useState<Lights | null>(null);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const forced = new URLSearchParams(window.location.search).get("lights");
    if (forced === "off" || forced === "low" || forced === "high") {
      setLights(forced);
      return;
    }
    import("../lib/tz-coords").then(({ TZ_COORDS }) => {
      if (cancelled) return;
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const [lat, lon] = TZ_COORDS[zone] ?? [40, -new Date().getTimezoneOffset() / 4];
      const tick = () => setLights(lightsFor(sunAltitude(new Date(), lat, lon)));
      tick();
      id = setInterval(tick, 60000);
    });
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, []);

  return lights;
}
