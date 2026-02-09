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
  address: string | null;
  status: "upcoming" | "past" | "cancelled";
}

interface PlaceResult {
  venue: string;
  address: string;
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
      address: "",
      city: "",
      region: "",
      country: "",
    };

    if (place.addressComponents) {
      let streetNumber = "";
      let route = "";
      for (const c of place.addressComponents) {
        if (c.types.includes("street_number")) {
          streetNumber = c.longText;
        } else if (c.types.includes("route")) {
          route = c.longText;
        } else if (c.types.includes("locality") || c.types.includes("sublocality_level_1")) {
          result.city = c.longText;
        } else if (c.types.includes("administrative_area_level_1")) {
          result.region = c.shortText;
        } else if (c.types.includes("country")) {
          result.country = c.shortText;
        }
      }
      result.address = [streetNumber, route].filter(Boolean).join(" ");
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
  const [address, setAddress] = useState("");

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
    if (!mapsReady || !venueContainerRef.current) return;

    acElRef.current = createAutocomplete(venueContainerRef.current, (place) => {
      setVenue(place.venue);
      setAddress(place.address);
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
          address: address.trim() || null,
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
          address: address.trim() || null,
          status: "upcoming",
        },
      ]);
      setDate("");
      setDoorTime("7PM");
      setCity("");
      setRegion("");
      setCountry("CA");
      setVenue("");
      setAddress("");
      if (venueContainerRef.current) {
        acElRef.current = createAutocomplete(venueContainerRef.current, (place) => {
          setVenue(place.venue);
          setAddress(place.address);
          if (place.city) setCity(place.city);
          if (place.region) setRegion(place.region);
          if (place.country) setCountry(place.country);
        });
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

  const handleDelete = async (show: Show) => {
    if (!confirm(`Delete ${show.venue || show.city}?`)) return;
    try {
      const res = await fetch("/api/shows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: show.slug }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setShows((prev) => prev.filter((s) => s.slug !== show.slug));
      setMessage({ type: "success", text: "Show deleted!" });
    } catch {
      setMessage({ type: "error", text: "Failed to delete show" });
    }
  };

  const now = new Date();
  const upcoming = shows
    .filter((s) => s.status === "upcoming" && new Date(s.date + "T23:59:59") > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = shows
    .filter((s) => s.status !== "upcoming" || new Date(s.date + "T23:59:59") <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                {address && `, ${address}`}
                {city && `, ${city}, ${region}`}
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
                  {upcoming.map((show, i) => (
                    <ShowRow
                      key={show.slug}
                      show={show}
                      isNext={i === 0}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
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
                      onDelete={handleDelete}
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
  isNext,
  onUpdate,
  onDelete,
  mapsReady,
}: {
  show: Show;
  isNext?: boolean;
  onUpdate: (show: Show, fields: Partial<Show>) => void;
  onDelete: (show: Show) => void;
  mapsReady: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(show.date);
  const [editDoorTime, setEditDoorTime] = useState(show.doorTime);
  const [editVenueResult, setEditVenueResult] = useState<PlaceResult | null>(null);
  const venueEditContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing || !mapsReady || !venueEditContainerRef.current) return;

    createAutocomplete(venueEditContainerRef.current, (place) => {
      setEditVenueResult(place);
    });
  }, [editing, mapsReady]);

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const handleSave = () => {
    const fields: Partial<Show> = {};
    if (editDate !== show.date) fields.date = editDate;
    if (editDoorTime !== show.doorTime) fields.doorTime = editDoorTime;
    if (editVenueResult) {
      fields.venue = editVenueResult.venue || null;
      fields.address = editVenueResult.address || null;
      if (editVenueResult.city) fields.city = editVenueResult.city;
      if (editVenueResult.region) fields.region = editVenueResult.region;
      if (editVenueResult.country) fields.country = editVenueResult.country;
    }
    if (Object.keys(fields).length > 0) onUpdate(show, fields);
    setEditing(false);
    setEditVenueResult(null);
  };

  if (editing) {
    return (
      <div className={`bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm space-y-3 ${isNext ? "ring-2 ring-blue-500" : ""}`}>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Venue</label>
          <div ref={venueEditContainerRef} />
          {(editVenueResult || show.venue) && (
            <p className="text-xs text-neutral-500 mt-1">
              {editVenueResult ? `${editVenueResult.venue}, ${editVenueResult.city}, ${editVenueResult.region}` : `${show.venue}, ${show.city}, ${show.region}`}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Door Time</label>
            <input
              type="text"
              value={editDoorTime}
              onChange={(e) => setEditDoorTime(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Save
          </button>
          <button onClick={() => { setEditing(false); setEditVenueResult(null); }} className="text-sm text-neutral-500 hover:text-neutral-700">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm flex items-center gap-4 ${isNext ? "ring-2 ring-blue-500" : ""}`}>
      {isNext && (
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded flex-shrink-0">
          Next
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 dark:text-white">
          {show.venue ? `${show.venue}, ${show.city}` : `${show.city}, ${show.region}`}
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatDate(show.date)} · {show.doorTime}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
        <select
          value={show.status}
          onChange={(e) => onUpdate(show, { status: e.target.value as Show["status"] })}
          className="text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-neutral-900 dark:text-white"
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => onDelete(show)}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
