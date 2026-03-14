"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SponsorForm from "../../components/SponsorForm";
import { type Show } from "../../lib/shows";
import { formatLongDate, isDatePast } from "../../lib/dates";

interface Sponsor {
  showSlug: string | null;
  name: string;
  email: string;
  phone: string;
  city?: string;
  region?: string;
  country?: string;
  venue?: string;
  address?: string;
  date?: string;
  doorTime?: string;
  items: string[];
  submittedAt: string;
  role?: "host" | "supporter";
}

interface ShowGroup {
  showSlug: string;
  show: Show | null;
  host: Sponsor;
  supporters: Sponsor[];
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

  // Group sponsors by showSlug; host = role==="host" or first entry
  const groups: ShowGroup[] = [];
  const seen = new Map<string, ShowGroup>();
  for (const sp of sponsors) {
    const key = sp.showSlug ?? sp.submittedAt;
    if (!seen.has(key)) {
      const show = sp.showSlug ? (shows.find((s) => s.slug === sp.showSlug) ?? null) : null;
      const group: ShowGroup = { showSlug: sp.showSlug ?? "", show, host: sp, supporters: [] };
      seen.set(key, group);
      groups.push(group);
    } else {
      const group = seen.get(key)!;
      if (sp.role === "host" && group.host.role !== "host") {
        group.supporters.push(group.host);
        group.host = sp;
      } else {
        group.supporters.push(sp);
      }
    }
  }

  const upcoming = groups
    .filter((g) => g.host.date && !isDatePast(g.host.date))
    .sort((a, b) => new Date(a.host.date!).getTime() - new Date(b.host.date!).getTime());
  const past = groups
    .filter((g) => !g.host.date || isDatePast(g.host.date))
    .sort(
      (a, b) => new Date(b.host.date ?? "0").getTime() - new Date(a.host.date ?? "0").getTime(),
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="h-16 flex items-center gap-8 px-8">
          <Link
            href="/admin"
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors tracking-wide shrink-0"
          >
            ← BACK
          </Link>
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-light tracking-tight text-neutral-900 dark:text-white">
              SHOWS
            </h1>
            <p className="text-xs lg:text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              {groups.length} total · {upcoming.length} upcoming · {past.length} past
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 py-12">
        {message && (
          <div
            className={`p-4 rounded-lg text-sm mb-8 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-80 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-16">
                <div className="mb-8">
                  <h2 className="text-xs lg:text-sm font-light tracking-[0.2em] text-neutral-900 dark:text-white uppercase">
                    Upcoming
                  </h2>
                  <div className="w-8 h-px bg-gradient-to-r from-neutral-300 to-transparent dark:from-neutral-700 mt-3" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {upcoming.map((group) => (
                    <ShowGroupCard
                      key={group.showSlug}
                      group={group}
                      onUpdateSponsor={(updated) =>
                        setSponsors((prev) =>
                          prev.map((s) => (s.submittedAt === updated.submittedAt ? updated : s)),
                        )
                      }
                      onRemoveSponsor={(submittedAt) =>
                        setSponsors((prev) => prev.filter((s) => s.submittedAt !== submittedAt))
                      }
                      onShowUpdate={(slug, fields) =>
                        setShows((prev) =>
                          prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-xs lg:text-sm font-light tracking-[0.2em] text-neutral-500 dark:text-neutral-500 uppercase">
                    Past
                  </h2>
                  <div className="w-8 h-px bg-gradient-to-r from-neutral-300 to-transparent dark:from-neutral-700 mt-3" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {past.map((group) => (
                    <ShowGroupCard
                      key={group.showSlug}
                      group={group}
                      onUpdateSponsor={(updated) =>
                        setSponsors((prev) =>
                          prev.map((s) => (s.submittedAt === updated.submittedAt ? updated : s)),
                        )
                      }
                      onRemoveSponsor={(submittedAt) =>
                        setSponsors((prev) => prev.filter((s) => s.submittedAt !== submittedAt))
                      }
                      onShowUpdate={(slug, fields) =>
                        setShows((prev) =>
                          prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {groups.length === 0 && (
              <div className="text-center py-24">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No shows yet.</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-2">
                  Share the sponsor form to book a date.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShowGroupCard({
  group,
  onUpdateSponsor,
  onRemoveSponsor,
  onShowUpdate,
}: {
  group: ShowGroup;
  onUpdateSponsor: (updated: Sponsor) => void;
  onRemoveSponsor: (submittedAt: string) => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
}) {
  const { show, host, supporters } = group;
  const [editingHost, setEditingHost] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [labelValue, setLabelValue] = useState(show?.venueLabel ?? "");
  const [doorLabelValue, setDoorLabelValue] = useState(show?.doorLabel ?? "");

  const handleDeleteShow = async () => {
    if (group.showSlug) {
      const deleteSponsor = (submittedAt: string) =>
        fetch("/api/sponsors", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showSlug: group.showSlug, submittedAt }),
        });
      await Promise.all([
        deleteSponsor(host.submittedAt),
        ...supporters.map((s) => deleteSponsor(s.submittedAt)),
      ]);
      await fetch("/api/shows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: group.showSlug }),
      });
    }
    onRemoveSponsor(host.submittedAt);
    for (const s of supporters) onRemoveSponsor(s.submittedAt);
  };

  const handleSaveLabels = async () => {
    if (!show) return;
    const venueLabel = labelValue.trim() || null;
    const doorLabel = doorLabelValue.trim() || null;
    const res = await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug, venueLabel, doorLabel }),
    });
    if (res.ok) onShowUpdate(show.slug, { venueLabel, doorLabel });
  };

  const location = [host.venue || host.address, host.city, host.region].filter(Boolean).join(", ");

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex">
      {/* Left: info */}
      <div className="flex-1 min-w-0 p-4 space-y-3">
        {editingHost ? (
          <div className="space-y-4">
            <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
              AMEND SPONSOR
            </h4>
            <SponsorForm
              showSlug={host.showSlug ?? undefined}
              submittedAt={host.submittedAt}
              venue={host.venue}
              address={host.address}
              city={host.city}
              region={host.region}
              country={host.country}
              date={host.date}
              doorTime={host.doorTime}
              initialName={host.name}
              initialPhone={host.phone}
              initialEmail={host.email}
              initialItems={host.items}
              compact
              editMode
              onSuccess={(data) => {
                setEditingHost(false);
                onUpdateSponsor({ ...host, ...data });
              }}
            />
            <button
              onClick={() => setEditingHost(false)}
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="text-lg text-neutral-900 dark:text-white font-light">
                {host.date ? formatLongDate(host.date) : "No date"}
                {location && ` · ${location}`}
              </p>
              {supporters.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {supporters.map((s) => (
                    <p
                      key={s.submittedAt}
                      className="text-sm text-neutral-400 dark:text-neutral-600"
                    >
                      {s.name || s.email}
                      {s.name && s.email ? ` · ${s.email}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {show && (
              <div className="space-y-2 pt-3">
                <h4 className="text-sm text-neutral-400 dark:text-neutral-500 uppercase tracking-wide font-light">
                  Poster Labels
                </h4>
                <input
                  type="text"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  placeholder={`${host.venue || "Venue"}, ${host.city}, ${host.region}`}
                  className="w-full px-3 py-1.5 text-sm rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                />
                <input
                  type="text"
                  value={doorLabelValue}
                  onChange={(e) => setDoorLabelValue(e.target.value)}
                  placeholder={`Doors open at ${host.doorTime || "7PM"}`}
                  className="w-full px-3 py-1.5 text-sm rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                />
                <button
                  onClick={handleSaveLabels}
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  Save Labels
                </button>
              </div>
            )}

            {confirmDelete && (
              <div className="flex gap-2 items-center pt-2">
                <input
                  autoFocus
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder='type "delete"'
                  className="flex-1 px-3 py-1.5 text-sm rounded border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <button
                  onClick={handleDeleteShow}
                  disabled={deleteInput !== "delete"}
                  className="text-sm px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteInput("");
                  }}
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: actions — flush to top, right, bottom edges */}
      {!editingHost && (
        <div className="shrink-0 flex flex-col border-l border-neutral-200/50 dark:border-neutral-700/50 w-28">
          <button
            disabled
            title="PDF renovating"
            className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200/50 dark:border-neutral-700/50 text-neutral-400 dark:text-neutral-600 cursor-not-allowed font-light bg-neutral-50 dark:bg-neutral-800"
          >
            PDF
          </button>
          <button
            onClick={() => setEditingHost(true)}
            className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200/50 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors font-light"
          >
            Amend
          </button>
          <button
            onClick={() => {
              setConfirmDelete(true);
              setDeleteInput("");
            }}
            className="flex-1 flex items-center justify-center text-sm px-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors font-light border-b border-neutral-200/50 dark:border-neutral-700/50"
          >
            Delete
          </button>
          {show?.slug ? (
            <a
              href={`/api/poster/${show.slug}`}
              download={`poster-${show.slug}.jpg`}
              className="flex-1 flex items-center justify-center text-sm px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors font-light"
            >
              Poster
            </a>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
