import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import {
  OFF_CONCERT,
  getCities,
  getPlaces,
  getShowOverrides,
  setCity,
  setPlace,
  setShowOverride,
  listConcerts,
  purgeFeatured,
  resolveStops,
  getVideoTaken,
} from "../../../shared/moments";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key, city, show, place } = (await request.json().catch(() => ({}))) as {
    key?: string;
    city?: string | null;
    show?: string | null;
    place?: string | null;
  };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const placeOnly = place !== undefined && city === undefined && show === undefined;
  let label = placeOnly
    ? ((await getCities())[key] ?? "")
    : typeof city === "string"
      ? city.trim().slice(0, 80)
      : "";
  let override: string | null = placeOnly ? ((await getShowOverrides())[key] ?? null) : null;

  if (!placeOnly) {
    if (show === OFF_CONCERT) {
      label = (await getCities())[key] ?? "";
      if (!label) return NextResponse.json({ error: "Set a city first." }, { status: 400 });
      override = OFF_CONCERT;
    } else if (show) {
      const concert = (await listConcerts()).find(
        (c) => c.date === show && (!label || c.label === label),
      );
      if (!concert) return NextResponse.json({ error: "Unknown show date." }, { status: 400 });
      label = concert.label;
      override = concert.date;
    }
    await setCity(key, label || null);
    await setShowOverride(key, override);
    if (place === undefined && override && override !== OFF_CONCERT) await setPlace(key, null);
  }
  if (place !== undefined) await setPlace(key, place);
  purgeFeatured();

  const stop = label
    ? (
        await resolveStops(
          [key],
          { [key]: label },
          await getVideoTaken(),
          override ? { [key]: override } : {},
        )
      )[key]
    : undefined;
  return NextResponse.json({
    ok: true,
    city: label || null,
    visit: stop?.visit ?? null,
    show: stop?.show ?? null,
    offConcert: override === OFF_CONCERT,
    place: (await getPlaces())[key] ?? null,
    leg: stop?.leg ?? null,
  });
}
