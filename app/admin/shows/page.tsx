"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Show {
  id: string;
  slug: string;
  name: string;
  date: string;
  doorTime: string;
  city: string;
  region: string;
  country: string;
  venue: string | null;
  status: "upcoming" | "past" | "cancelled";
}

interface PlaceResult {
  venue: string;
  city: string;
  region: string;
  country: string;
}

function useGoogleMaps() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as any;
    if (w.google?.maps?.places?.PlaceAutocompleteElement) {
      setReady(true);
      return;
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
          setReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  return ready;
}

function createAutocomplete(container: HTMLElement, onSelect: (place: PlaceResult) => void) {
  const google = (window as any).google;
  const el = new google.maps.places.PlaceAutocompleteElement();

  el.style.width = "100%";

  el.addEventListener("gmp-select", async ({ placePrediction }: any) => {
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: ["displayName", "addressComponents"],
    });

    const result: PlaceResult = {
      venue: place.displayName || "",
      city: "",
      region: "",
      country: "",
    };

    if (place.addressComponents) {
      for (const c of place.addressComponents) {
        if (c.types.includes("locality") || c.types.includes("sublocality_level_1")) {
          result.city = c.longText;
        } else if (c.types.includes("administrative_area_level_1")) {
          result.region = c.shortText;
        } else if (c.types.includes("country")) {
          result.country = c.shortText;
        }
      }
    }

    onSelect(result);
  });

  while (container.firstChild) container.removeChild(container.firstChild);
  container.appendChild(el);

  return el;
}

export default function ShowsAdminPage() {
  const mapsReady = useGoogleMaps();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [date, setDate] = useState("");
  const [doorTime, setDoorTime] = useState("7PM");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("CA");
  const [venue, setVenue] = useState("");

  const venueContainerRef = useRef<HTMLDivElement>(null);
  const acElRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/shows")
      .then((res) => res.json())
      .then((data) => setShows(Array.isArray(data) ? data : []))
      .catch(() => setMessage({ type: "error", text: "Failed to load shows" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapsReady || !venueContainerRef.current || acElRef.current) return;

    acElRef.current = createAutocomplete(venueContainerRef.current, (place) => {
      setVenue(place.venue);
      if (place.city) setCity(place.city);
      if (place.region) setRegion(place.region);
      if (place.country) setCountry(place.country);
    });
  }, [mapsReady]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          doorTime,
          city,
          region,
          country,
          venue: venue.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to add show");

      const result = await res.json();
      setShows((prev) => [
        ...prev,
        {
          id: result.id,
          slug: result.slug,
          name: "From The Ground Up",
          date,
          doorTime,
          city,
          region,
          country,
          venue: venue.trim() || null,
          status: "upcoming",
        },
      ]);
      setDate("");
      setDoorTime("7PM");
      setCity("");
      setRegion("");
      setCountry("CA");
      setVenue("");
      // Clear the autocomplete element's inner input
      if (venueContainerRef.current) {
        const input = venueContainerRef.current.querySelector("input");
        if (input) input.value = "";
      }
      setMessage({ type: "success", text: "Show added!" });
    } catch {
      setMessage({ type: "error", text: "Failed to add show" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (show: Show, fields: Partial<Show>) => {
    try {
      const res = await fetch("/api/shows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: show.slug, ...fields }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setShows((prev) => prev.map((s) => (s.slug === show.slug ? { ...s, ...fields } : s)));
      setMessage({ type: "success", text: "Show updated!" });
    } catch {
      setMessage({ type: "error", text: "Failed to update show" });
    }
  };

  const upcoming = shows
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = shows.filter((s) => s.status !== "upcoming");

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/admin"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4 inline-block"
        >
          ← Back to Admin
        </Link>

        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">Shows</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">Manage tour dates.</p>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              message.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm space-y-4 mb-8"
        >
          <h2 className="font-semibold text-neutral-900 dark:text-white">Add Show</h2>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Venue
            </label>
            {mapsReady ? (
              <div ref={venueContainerRef} />
            ) : (
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Search for a venue..."
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {venue && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {venue}
                {city && ` — ${city}, ${region}, ${country}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Door Time
              </label>
              <input
                type="text"
                value={doorTime}
                onChange={(e) => setDoorTime(e.target.value)}
                placeholder="7PM"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? "Adding..." : "Add Show"}
          </button>
        </form>

        {loading ? (
          <div className="animate-pulse h-20 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold text-neutral-900 dark:text-white mb-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcoming.map((show) => (
                    <ShowRow
                      key={show.slug}
                      show={show}
                      onUpdate={handleUpdate}
                      mapsReady={mapsReady}
                    />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
                  Past / Other
                </h2>
                <div className="space-y-2">
                  {past.map((show) => (
                    <ShowRow
                      key={show.slug}
                      show={show}
                      onUpdate={handleUpdate}
                      mapsReady={mapsReady}
                    />
                  ))}
                </div>
              </div>
            )}

            {shows.length === 0 && (
              <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                No shows yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShowRow({
  show,
  onUpdate,
  mapsReady,
}: {
  show: Show;
  onUpdate: (show: Show, fields: Partial<Show>) => void;
  mapsReady: boolean;
}) {
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueValue, setVenueValue] = useState(show.venue || "");
  const venueEditContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingVenue || !mapsReady || !venueEditContainerRef.current) return;

    createAutocomplete(venueEditContainerRef.current, (place) => {
      setVenueValue(place.venue);
    });
  }, [editingVenue, mapsReady]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 dark:text-white">
          {show.city}, {show.region}
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatDate(show.date)} · {show.doorTime}
        </div>
        {editingVenue ? (
          <div className="mt-1 flex gap-2 items-center">
            <div ref={venueEditContainerRef} className="flex-1" />
            <button
              onClick={() => {
                onUpdate(show, { venue: venueValue.trim() || null });
                setEditingVenue(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditingVenue(false)}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingVenue(true)}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-1"
          >
            {show.venue || "Add venue"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={show.status}
          onChange={(e) => onUpdate(show, { status: e.target.value as Show["status"] })}
          className="text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-neutral-900 dark:text-white"
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
