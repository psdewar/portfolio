"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SponsorForm from "../../components/SponsorForm";

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
  showSlug: string | null;
  name: string;
  email: string;
  phone: string;
  city?: string;
  region?: string;
  country?: string;
  date?: string;
  doorTime?: string;
  items: string[];
  submittedAt: string;
}

export default function ShowsAdminPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const now = new Date();
  const upcoming = sponsors
    .filter((s) => s.date && new Date(s.date + "T23:59:59") > now)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  const past = sponsors
    .filter((s) => !s.date || new Date(s.date + "T23:59:59") <= now)
    .sort((a, b) => new Date(b.date ?? "0").getTime() - new Date(a.date ?? "0").getTime());

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
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Every show is confirmed by a sponsor.
        </p>

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

        {loading ? (
          <div className="animate-pulse h-20 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold text-neutral-900 dark:text-white mb-3">Upcoming</h2>
                <div className="space-y-2">
                  {upcoming.map((sponsor) => {
                    const show = sponsor.showSlug
                      ? (shows.find((s) => s.slug === sponsor.showSlug) ?? null)
                      : null;
                    return (
                      <SponsorCard
                        key={sponsor.showSlug ?? sponsor.email}
                        sponsor={sponsor}
                        show={show}
                        onUpdate={(updated) =>
                          setSponsors((prev) => prev.map((s) => (s === sponsor ? updated : s)))
                        }
                        onRemove={() => setSponsors((prev) => prev.filter((s) => s !== sponsor))}
                        onShowUpdate={(slug, fields) =>
                          setShows((prev) =>
                            prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Past</h2>
                <div className="space-y-2">
                  {past.map((sponsor) => {
                    const show = sponsor.showSlug
                      ? (shows.find((s) => s.slug === sponsor.showSlug) ?? null)
                      : null;
                    return (
                      <SponsorCard
                        key={sponsor.showSlug ?? sponsor.email}
                        sponsor={sponsor}
                        show={show}
                        onUpdate={(updated) =>
                          setSponsors((prev) => prev.map((s) => (s === sponsor ? updated : s)))
                        }
                        onRemove={() => setSponsors((prev) => prev.filter((s) => s !== sponsor))}
                        onShowUpdate={(slug, fields) =>
                          setShows((prev) =>
                            prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {sponsors.length === 0 && (
              <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                No shows yet. Share the sponsor form to book a date.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SponsorCard({
  sponsor,
  show,
  onUpdate,
  onRemove,
  onShowUpdate,
}: {
  sponsor: Sponsor;
  show: Show | null;
  onUpdate: (updated: Sponsor) => void;
  onRemove: () => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(show?.venueLabel ?? "");

  const pdfUrl = (() => {
    const url = new URL("/sponsor/edit", "https://peytspencer.com");
    url.searchParams.set("og", "true");
    if (sponsor.name) url.searchParams.set("name", sponsor.name);
    if (sponsor.phone) url.searchParams.set("phone", sponsor.phone);
    if (sponsor.email) url.searchParams.set("email", sponsor.email);
    if (sponsor.items.length) url.searchParams.set("items", sponsor.items.join("|"));
    if (sponsor.city) url.searchParams.set("city", sponsor.city);
    if (sponsor.region) url.searchParams.set("region", sponsor.region);
    if (sponsor.country) url.searchParams.set("country", sponsor.country);
    if (sponsor.date) url.searchParams.set("date", sponsor.date);
    if (sponsor.doorTime) url.searchParams.set("doorTime", sponsor.doorTime);
    return url.toString();
  })();

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const handleDelete = async () => {
    if (!confirm("Remove this show?")) return;
    if (sponsor.showSlug) {
      await fetch("/api/sponsors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showSlug: sponsor.showSlug }),
      });
      await fetch("/api/shows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: sponsor.showSlug }),
      });
    }
    onRemove();
  };

  const handleSaveLabel = async () => {
    if (!show) return;
    const res = await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug, venueLabel: labelValue.trim() || null }),
    });
    if (res.ok) {
      onShowUpdate(show.slug, { venueLabel: labelValue.trim() || null });
      setEditingLabel(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm space-y-2">
      {editing ? (
        <>
          <SponsorForm
            showSlug={sponsor.showSlug ?? undefined}
            city={sponsor.city}
            region={sponsor.region}
            country={sponsor.country}
            date={sponsor.date}
            doorTime={sponsor.doorTime}
            initialName={sponsor.name}
            initialPhone={sponsor.phone}
            initialEmail={sponsor.email}
            initialItems={sponsor.items}
            compact
            editMode
            onSuccess={(data) => {
              setEditing(false);
              onUpdate({ ...sponsor, ...data });
            }}
          />
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <div className="text-sm text-neutral-900 dark:text-white">
            {sponsor.name && <span className="font-medium">{sponsor.name}</span>}
            {sponsor.email && (
              <span className="text-neutral-500 dark:text-neutral-400"> · {sponsor.email}</span>
            )}
            {sponsor.phone && (
              <span className="text-neutral-500 dark:text-neutral-400"> · {sponsor.phone}</span>
            )}
          </div>
          {(sponsor.date || sponsor.city) && (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {sponsor.date && formatDate(sponsor.date)}
              {sponsor.city && ` · ${sponsor.city}, ${sponsor.region}`}
              {sponsor.doorTime && ` · ${sponsor.doorTime}`}
            </div>
          )}
          {sponsor.items.length > 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {sponsor.items.join(", ")}
            </p>
          )}
          {show && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400 shrink-0">RSVP label</span>
              {editingLabel ? (
                <>
                  <input
                    type="text"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    placeholder={show.venue ?? show.city}
                    autoFocus
                    className="flex-1 min-w-0 px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-500"
                  />
                  <button
                    onClick={handleSaveLabel}
                    className="text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingLabel(false)}
                    className="text-neutral-500 shrink-0"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setLabelValue(show.venueLabel ?? "");
                    setEditingLabel(true);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 italic"
                >
                  {show.venueLabel ?? "none"}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:text-green-700"
            >
              PDF
            </a>
            {show?.slug && (
              <a
                href={`/api/poster/${show.slug}`}
                download={`poster-${show.slug}.jpg`}
                className="text-xs text-green-600 hover:text-green-700"
              >
                Poster
              </a>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Amend
            </button>
            <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
