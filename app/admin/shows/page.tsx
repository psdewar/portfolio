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
                <h2 className="font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Past</h2>
                <div className="space-y-2">
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
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(show?.venueLabel ?? "");
  const [editingDoorLabel, setEditingDoorLabel] = useState(false);
  const [doorLabelValue, setDoorLabelValue] = useState(show?.doorLabel ?? "");

  const pdfUrl = (() => {
    const url = new URL("/sponsor/host", "https://peytspencer.com");
    url.searchParams.set("og", "true");
    if (host.name) url.searchParams.set("name", host.name);
    if (host.phone) url.searchParams.set("phone", host.phone);
    if (host.email) url.searchParams.set("email", host.email);
    if (host.items.length) url.searchParams.set("items", host.items.join("|"));
    if (host.city) url.searchParams.set("city", host.city);
    if (host.region) url.searchParams.set("region", host.region);
    if (host.country) url.searchParams.set("country", host.country);
    if (host.date) url.searchParams.set("date", host.date);
    if (host.doorTime) url.searchParams.set("doorTime", host.doorTime);
    return url.toString();
  })();

  const handleDeleteShow = async () => {
    if (!confirm("Remove this show and all its sponsors?")) return;
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

  const handleDeleteSupporter = async (sponsor: Sponsor) => {
    if (!confirm("Remove this supporter?")) return;
    await fetch("/api/sponsors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSlug: group.showSlug, submittedAt: sponsor.submittedAt }),
    });
    onRemoveSponsor(sponsor.submittedAt);
  };

  const handleSaveField = async (
    field: "venueLabel" | "doorLabel",
    value: string,
    onDone: () => void,
  ) => {
    if (!show) return;
    const trimmed = value.trim() || null;
    const res = await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug, [field]: trimmed }),
    });
    if (res.ok) {
      onShowUpdate(show.slug, { [field]: trimmed });
      onDone();
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm space-y-2">
      {editingHost ? (
        <>
          <SponsorForm
            showSlug={host.showSlug ?? undefined}
            submittedAt={host.submittedAt}
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
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
        </>
      ) : (
        <div className="flex gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Host info */}
            <div className="text-sm text-neutral-900 dark:text-white">
              {host.name && <span className="font-medium">{host.name}</span>}
              {host.email && (
                <span className="text-neutral-500 dark:text-neutral-400"> · {host.email}</span>
              )}
              {host.phone && (
                <span className="text-neutral-500 dark:text-neutral-400"> · {host.phone}</span>
              )}
            </div>
            {(host.date || host.city) && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {host.date && formatLongDate(host.date)}
                {host.city && ` · ${host.city}, ${host.region}`}
                {host.doorTime && ` · ${host.doorTime}`}
              </div>
            )}
            {host.items.length > 0 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {host.items.join(", ")}
              </p>
            )}

            {/* Supporters */}
            {supporters.length > 0 && (
              <div className="border-t border-neutral-100 dark:border-neutral-700 pt-2 space-y-1.5">
                {supporters.map((s) => (
                  <SupporterRow
                    key={s.submittedAt}
                    sponsor={s}
                    showSlug={group.showSlug}
                    onUpdate={onUpdateSponsor}
                    onDelete={() => handleDeleteSupporter(s)}
                  />
                ))}
              </div>
            )}

            {/* Editable labels */}
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
                      onClick={() =>
                        handleSaveField("venueLabel", labelValue, () => setEditingLabel(false))
                      }
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
            {show && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400 shrink-0">Door text</span>
                {editingDoorLabel ? (
                  <>
                    <input
                      type="text"
                      value={doorLabelValue}
                      onChange={(e) => setDoorLabelValue(e.target.value)}
                      placeholder={`Doors open at ${show.doorTime}`}
                      autoFocus
                      className="flex-1 min-w-0 px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      onClick={() =>
                        handleSaveField("doorLabel", doorLabelValue, () =>
                          setEditingDoorLabel(false),
                        )
                      }
                      className="text-blue-600 hover:text-blue-700 shrink-0"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDoorLabel(false)}
                      className="text-neutral-500 shrink-0"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setDoorLabelValue(show.doorLabel ?? "");
                      setEditingDoorLabel(true);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 italic"
                  >
                    {show.doorLabel ?? `Doors open at ${show.doorTime}`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="shrink-0 self-stretch flex flex-col rounded-md overflow-hidden">
            {show?.slug && (
              <a
                href={`/api/poster/${show.slug}`}
                download={`poster-${show.slug}.jpg`}
                className="flex-1 flex items-center justify-center text-xs px-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Poster
              </a>
            )}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center text-xs px-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              PDF
            </a>
            <button
              onClick={() => setEditingHost(true)}
              className="flex-1 flex items-center justify-center text-xs px-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              Amend
            </button>
            <button
              onClick={handleDeleteShow}
              className="flex-1 flex items-center justify-center text-xs px-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SupporterRow({
  sponsor,
  showSlug,
  onUpdate,
  onDelete,
}: {
  sponsor: Sponsor;
  showSlug: string;
  onUpdate: (updated: Sponsor) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
        <SponsorForm
          showSlug={showSlug}
          submittedAt={sponsor.submittedAt}
          initialName={sponsor.name}
          initialPhone={sponsor.phone}
          initialEmail={sponsor.email}
          initialItems={sponsor.items}
          compact
          editMode
          mode="supporter"
          onSuccess={(data) => {
            setEditing(false);
            onUpdate({ ...sponsor, ...data });
          }}
        />
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-neutral-500 hover:text-neutral-700 mt-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 text-xs pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
      <div className="flex-1 min-w-0">
        <span className="text-neutral-600 dark:text-neutral-300">
          {sponsor.name || sponsor.email}
        </span>
        {sponsor.name && sponsor.email && (
          <span className="text-neutral-400"> · {sponsor.email}</span>
        )}
        {sponsor.items.length > 0 && (
          <p className="text-neutral-400 dark:text-neutral-500 mt-0.5">
            {sponsor.items.join(", ")}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          Amend
        </button>
        <button
          onClick={onDelete}
          className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
