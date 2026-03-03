"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react";
import SponsorForm from "../../components/SponsorForm";
import { useGoogleMaps, createAutocomplete, type PlaceResult } from "../../lib/maps";

interface Show {
  slug: string;
  name: string;
  date: string;
  doorTime: string;
  city: string;
  region: string;
  country: string;
  venue: string | null;
  venueLabel: string | null;
  address: string | null;
  status: "upcoming" | "past" | "cancelled";
}

interface Sponsor {
  showSlug: string;
  name: string;
  email: string;
  phone: string;
  items: string[];
  submittedAt: string;
}

export default function ShowsAdminPage() {
  const mapsReady = useGoogleMaps();
  const [shows, setShows] = useState<Show[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
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

  const initAutocomplete = useCallback(() => {
    if (!venueContainerRef.current) return;
    acElRef.current = createAutocomplete(venueContainerRef.current, (place) => {
      setVenue(place.venue);
      setAddress(place.address);
      if (place.city) setCity(place.city);
      if (place.region) setRegion(place.region);
      if (place.country) setCountry(place.country);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/shows")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/sponsors")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([showsData, sponsorsData]) => {
        setShows(Array.isArray(showsData) ? showsData : []);
        setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapsReady) return;
    initAutocomplete();
  }, [mapsReady, initAutocomplete]);

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
          slug: result.slug,
          name: "From The Ground Up",
          date,
          doorTime,
          city,
          region,
          country,
          venue: venue.trim() || null,
          venueLabel: null,
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
      initAutocomplete();
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
      setSponsors((prev) => prev.filter((s) => s.showSlug !== show.slug));
      setMessage({ type: "success", text: "Show deleted!" });
    } catch {
      setMessage({ type: "error", text: "Failed to delete show" });
    }
  };

  const handleSponsorChange = (showSlug: string, sponsor: Sponsor | null) => {
    setSponsors((prev) =>
      sponsor
        ? prev.some((s) => s.showSlug === showSlug)
          ? prev.map((s) => (s.showSlug === showSlug ? sponsor : s))
          : [...prev, sponsor]
        : prev.filter((s) => s.showSlug !== showSlug),
    );
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
                      sponsor={sponsors.find((s) => s.showSlug === show.slug)}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSponsorChange={handleSponsorChange}
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
                      sponsor={sponsors.find((s) => s.showSlug === show.slug)}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSponsorChange={handleSponsorChange}
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

function ShowEditForm({
  show,
  isNext,
  onSave,
  onCancel,
  mapsReady,
}: {
  show: Show;
  isNext?: boolean;
  onSave: (fields: Partial<Show>) => void;
  onCancel: () => void;
  mapsReady: boolean;
}) {
  const [editDate, setEditDate] = useState(show.date);
  const [editDoorTime, setEditDoorTime] = useState(show.doorTime);
  const [editVenueLabel, setEditVenueLabel] = useState(show.venueLabel ?? "");
  const [editVenueResult, setEditVenueResult] = useState<PlaceResult | null>(null);
  const venueEditContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapsReady || !venueEditContainerRef.current) return;
    createAutocomplete(venueEditContainerRef.current, (place) => {
      setEditVenueResult(place);
    });
  }, [mapsReady]);

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
    const newLabel = editVenueLabel.trim() || null;
    if (newLabel !== (show.venueLabel ?? null)) fields.venueLabel = newLabel;
    onSave(fields);
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm space-y-3 ${isNext ? "ring-2 ring-blue-500" : ""}`}
    >
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          Venue
        </label>
        <div ref={venueEditContainerRef} />
        {(editVenueResult || show.venue) && (
          <p className="text-xs text-neutral-500 mt-1">
            {editVenueResult
              ? `${editVenueResult.venue}, ${editVenueResult.city}, ${editVenueResult.region}`
              : `${show.venue}, ${show.city}, ${show.region}`}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">
            Poster label
          </span>
          <input
            type="text"
            value={editVenueLabel}
            onChange={(e) => setEditVenueLabel(e.target.value)}
            placeholder={editVenueResult?.venue ?? show.venue ?? "same as venue"}
            className="flex-1 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Date
          </label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Door Time
          </label>
          <input
            type="text"
            value={editDoorTime}
            onChange={(e) => setEditDoorTime(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-neutral-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

function buildSponsorUrl(show: Show, extras: Record<string, string> = {}) {
  const url = new URL(
    "/sponsor/edit",
    typeof window !== "undefined" ? window.location.origin : "https://peytspencer.com",
  );
  url.searchParams.set("city", show.city);
  url.searchParams.set("region", show.region);
  url.searchParams.set("country", show.country);
  url.searchParams.set("date", show.date);
  url.searchParams.set("doorTime", show.doorTime);
  for (const [k, v] of Object.entries(extras)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

function SponsorPanel({
  show,
  sponsor,
  onSponsorChange,
}: {
  show: Show;
  sponsor?: Sponsor;
  onSponsorChange: (showSlug: string, sponsor: Sponsor | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildSponsorUrl(show, { showSlug: show.slug });
  const templatePdfUrl = buildSponsorUrl(show, { og: "true" });
  const recordPdfUrl = sponsor
    ? buildSponsorUrl(show, {
        og: "true",
        showSlug: show.slug,
        venue: show.venue || "",
        name: sponsor.name,
        phone: sponsor.phone,
        email: sponsor.email,
        items: sponsor.items.join("|"),
      })
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!sponsor || !confirm("Remove sponsor?")) return;
    const res = await fetch("/api/sponsors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSlug: show.slug }),
    });
    if (res.ok) onSponsorChange(show.slug, null);
  };

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate flex-1 min-w-0">
          {shareUrl}
        </p>
        <button
          onClick={handleCopy}
          className="text-xs text-blue-600 hover:text-blue-700 flex-shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <a
          href={templatePdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex-shrink-0"
        >
          Template PDF
        </a>
      </div>

      {sponsor ? (
        editing ? (
          <>
            <div className="flex items-start gap-2 px-1 py-2 mb-2 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 text-xs text-neutral-400 dark:text-neutral-500">
              <LockSimpleIcon size={13} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-neutral-500 dark:text-neutral-400">
                  From show ·{" "}
                </span>
                {show.venue ? `${show.venue}, ` : ""}
                {show.city}, {show.region} ·{" "}
                {new Date(show.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <SponsorForm
              showSlug={show.slug}
              city={show.city}
              region={show.region}
              country={show.country}
              date={show.date}
              doorTime={show.doorTime}
              initialName={sponsor.name}
              initialPhone={sponsor.phone}
              initialEmail={sponsor.email}
              initialItems={sponsor.items}
              compact
              editMode
              onSuccess={(data) => {
                setEditing(false);
                onSponsorChange(show.slug, { ...sponsor, ...data });
              }}
            />
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-neutral-900 dark:text-white">
              {sponsor.name && <span className="font-medium">{sponsor.name}</span>}
              {sponsor.email && (
                <span className="text-neutral-500 dark:text-neutral-400"> · {sponsor.email}</span>
              )}
              {sponsor.phone && (
                <span className="text-neutral-500 dark:text-neutral-400"> · {sponsor.phone}</span>
              )}
            </div>
            {sponsor.items.length > 0 && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {sponsor.items.join(", ")}
              </p>
            )}
            <div className="flex items-center gap-3">
              {recordPdfUrl && (
                <a
                  href={recordPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  Record PDF
                </a>
              )}
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Edit
              </button>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
        )
      ) : (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">No submission yet.</p>
      )}
    </div>
  );
}

function ShowRow({
  show,
  isNext,
  sponsor,
  onUpdate,
  onDelete,
  onSponsorChange,
  mapsReady,
}: {
  show: Show;
  isNext?: boolean;
  sponsor?: Sponsor;
  onUpdate: (show: Show, fields: Partial<Show>) => void;
  onDelete: (show: Show) => void;
  onSponsorChange: (showSlug: string, sponsor: Sponsor | null) => void;
  mapsReady: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [sponsoring, setSponsoring] = useState(false);

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  if (editing) {
    return (
      <ShowEditForm
        show={show}
        isNext={isNext}
        onSave={(fields) => {
          if (Object.keys(fields).length > 0) onUpdate(show, fields);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        mapsReady={mapsReady}
      />
    );
  }

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl shadow-sm ${isNext ? "ring-2 ring-blue-500" : ""}`}
    >
      <div className="p-4 flex items-center gap-4">
        {isNext && (
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded flex-shrink-0">
            Next
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900 dark:text-white">
            {show.venueLabel ||
              (show.venue
                ? `${show.venue}, ${show.city}, ${show.region}`
                : `${show.city}, ${show.region}`)}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatDate(show.date)} · {show.doorTime}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`/api/poster/${show.slug}`}
            download={`poster-${show.slug}.jpg`}
            className="text-sm text-green-600 hover:text-green-700"
          >
            Poster
          </a>
          <button
            onClick={() => {
              setSponsoring(!sponsoring);
              setEditing(false);
            }}
            className={`text-sm ${sponsoring ? "text-purple-700 font-medium" : "text-purple-600 hover:text-purple-700"}`}
          >
            {sponsor ? "Sponsor ✓" : "Sponsor"}
          </button>
          <button
            onClick={() => {
              setEditing(true);
              setSponsoring(false);
            }}
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

      {sponsoring && (
        <SponsorPanel show={show} sponsor={sponsor} onSponsorChange={onSponsorChange} />
      )}
    </div>
  );
}
