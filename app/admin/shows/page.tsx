"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CircleNotchIcon, CheckCircleIcon } from "@phosphor-icons/react";
import SponsorForm from "../../components/SponsorForm";
import { type Show } from "../../lib/shows";
import { formatEventDate, formatMonthDay, isDatePast } from "../../lib/dates";

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

  // Group upcoming shows with slugs: same state ≤21 days, cross-state ≤7 days
  const pamphletGroups: ShowGroup[][] = [];
  const withSlug = upcoming.filter((g) => g.show?.slug && g.show?.date);
  if (withSlug.length) {
    let current = [withSlug[0]];
    for (let i = 1; i < withSlug.length; i++) {
      const prev = withSlug[i - 1];
      const next = withSlug[i];
      const diffDays =
        (new Date(next.show!.date).getTime() - new Date(prev.show!.date).getTime()) /
        (1000 * 60 * 60 * 24);
      const sameRegion = prev.show!.region === next.show!.region;
      const maxGap = sameRegion ? 21 : 7;
      if (diffDays <= maxGap) {
        current.push(next);
      } else {
        pamphletGroups.push(current);
        current = [next];
      }
    }
    pamphletGroups.push(current);
  }

  const past = groups
    .filter((g) => !g.host.date || isDatePast(g.host.date))
    .sort(
      (a, b) => new Date(b.host.date ?? "0").getTime() - new Date(a.host.date ?? "0").getTime(),
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Main content */}
      <div className="px-8 py-12">
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/admin"
            className="text-xs font-medium tracking-widest uppercase text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
          >
            ← Admin
          </Link>
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 shrink-0" />
          <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-neutral-900 dark:text-white">
            Shows
          </h1>
        </div>
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
            {upcoming.length > 0 &&
              (() => {
                const cardProps = {
                  onUpdateSponsor: (updated: Sponsor) =>
                    setSponsors((prev) =>
                      prev.map((s) => (s.submittedAt === updated.submittedAt ? updated : s)),
                    ),
                  onRemoveSponsor: (submittedAt: string) =>
                    setSponsors((prev) => prev.filter((s) => s.submittedAt !== submittedAt)),
                  onShowUpdate: (slug: string, fields: Partial<Show>) =>
                    setShows((prev) =>
                      prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                    ),
                };
                const grouped = new Set(pamphletGroups.flat().map((g) => g.showSlug));
                const ungrouped = upcoming.filter((g) => !grouped.has(g.showSlug));
                return (
                  <div className="mb-16">
                    <div className="flex items-baseline justify-between mb-8">
                      <div>
                        <h2 className="text-xs lg:text-sm font-light tracking-[0.2em] text-neutral-900 dark:text-white uppercase">
                          Upcoming
                        </h2>
                        <div className="w-8 h-px bg-gradient-to-r from-neutral-300 to-transparent dark:from-neutral-700 mt-3" />
                      </div>
                      <a
                        href="/api/pamphlet?blank=true"
                        download="pamphlet-blank.jpg"
                        className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      >
                        Blank pamphlet
                      </a>
                    </div>
                    <div className="space-y-10">
                      {pamphletGroups.map((cluster, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-4 mb-4">
                            <PamphletGroupButton
                              group={cluster}
                              onShowUpdate={cardProps.onShowUpdate}
                            />
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {cluster.map((g) => (
                              <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                            ))}
                          </div>
                        </div>
                      ))}
                      {ungrouped.length > 0 && (
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <span className="text-xs tracking-[0.15em] text-neutral-400 dark:text-neutral-500 uppercase shrink-0">
                              Unscheduled
                            </span>
                            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {ungrouped.map((g) => (
                              <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {past.length > 0 &&
              (() => {
                const cardProps = {
                  onUpdateSponsor: (updated: Sponsor) =>
                    setSponsors((prev) =>
                      prev.map((s) => (s.submittedAt === updated.submittedAt ? updated : s)),
                    ),
                  onRemoveSponsor: (submittedAt: string) =>
                    setSponsors((prev) => prev.filter((s) => s.submittedAt !== submittedAt)),
                  onShowUpdate: (slug: string, fields: Partial<Show>) =>
                    setShows((prev) =>
                      prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s)),
                    ),
                };
                return (
                  <div>
                    <div className="mb-8">
                      <h2 className="text-xs lg:text-sm font-light tracking-[0.2em] text-neutral-500 dark:text-neutral-500 uppercase">
                        Past
                      </h2>
                      <div className="w-8 h-px bg-gradient-to-r from-neutral-300 to-transparent dark:from-neutral-700 mt-3" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                      {past.map((group) => (
                        <ShowGroupCard key={group.showSlug} group={group} {...cardProps} />
                      ))}
                    </div>
                  </div>
                );
              })()}

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

function PamphletGroupButton({
  group,
  onShowUpdate,
}: {
  group: ShowGroup[];
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [venueLabels, setVenueLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.map((g) => [g.show!.slug, g.show!.venueLabel ?? ""])),
  );
  const [doorLabels, setDoorLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.map((g) => [g.show!.slug, g.show!.doorLabel ?? ""])),
  );

  const first = group[0].show!;
  const last = group[group.length - 1].show!;
  const label =
    group.length === 1
      ? formatMonthDay(first.date)
      : `${formatMonthDay(first.date)} – ${formatMonthDay(last.date)}`;

  const activeGroup = group.filter((g) => g.show?.access !== "private");

  const buildHref = () => {
    const slugsParam = activeGroup.map((g) => g.show!.slug).join(",");
    const params = new URLSearchParams({ slugs: slugsParam });
    for (const g of activeGroup) {
      const slug = g.show!.slug;
      if (venueLabels[slug]) params.set(`vl_${slug}`, venueLabels[slug]);
      if (doorLabels[slug]) params.set(`dl_${slug}`, doorLabels[slug]);
    }
    return `/api/pamphlet?${params.toString()}`;
  };

  const toggleAccess = async (slug: string, access: "public" | "private") => {
    onShowUpdate(slug, { access });
    await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, access }),
    });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                PAMPHLET &middot; {label}
              </h4>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 mb-4">
              {group.map((g) => {
                const slug = g.show!.slug;
                const included = g.show?.access !== "private";
                return (
                  <div key={slug} className={included ? "" : "opacity-40"}>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={(e) =>
                          toggleAccess(slug, e.target.checked ? "public" : "private")
                        }
                        className="rounded"
                      />
                      <span>
                        {formatMonthDay(g.show!.date)} &middot; {g.show!.city}, {g.show!.region}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={venueLabels[slug] ?? ""}
                      onChange={(e) =>
                        setVenueLabels((prev) => ({ ...prev, [slug]: e.target.value }))
                      }
                      disabled={!included}
                      placeholder={`${g.show!.venue || "Venue"}, ${g.show!.city}, ${g.show!.region}`}
                      className="w-full px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 disabled:opacity-30"
                    />
                    <input
                      type="text"
                      value={doorLabels[slug] ?? ""}
                      onChange={(e) =>
                        setDoorLabels((prev) => ({ ...prev, [slug]: e.target.value }))
                      }
                      disabled={!included}
                      placeholder={g.show!.doorTime || "7:00 PM"}
                      className="w-full px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 disabled:opacity-30 mt-1"
                    />
                  </div>
                );
              })}
            </div>
            {activeGroup.length > 0 ? (
              <a
                href={buildHref()}
                download={`pamphlet-${first.date}.jpg`}
                className="block text-center text-xs px-3 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors font-light"
              >
                Download ({activeGroup.length})
              </a>
            ) : (
              <div className="text-center text-xs px-3 py-1.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-400">
                Select at least one show
              </div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-light border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <span className="text-xs tracking-widest text-neutral-400 uppercase">Pamphlet</span>
        <span>
          {label} &middot; {group.length} show{group.length !== 1 ? "s" : ""}
        </span>
      </button>
    </>
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
  const [viewingSupporters, setViewingSupporters] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState<Sponsor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [labelValue, setLabelValue] = useState(show?.venueLabel ?? "");
  const [doorLabelValue, setDoorLabelValue] = useState(show?.doorLabel ?? "");
  const [labelSaveState, setLabelSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debounceSaveLabels = useCallback(
    (venue: string, door: string) => {
      if (!show) return;
      clearTimeout(debounceRef.current);
      setLabelSaveState("saving");
      debounceRef.current = setTimeout(async () => {
        const venueLabel = venue.trim() || null;
        const doorLabel = door.trim() || null;
        const res = await fetch("/api/shows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: show.slug, venueLabel, doorLabel }),
        });
        if (res.ok) {
          onShowUpdate(show.slug, { venueLabel, doorLabel });
          setLabelSaveState("saved");
          setTimeout(() => setLabelSaveState("idle"), 2000);
        } else {
          setLabelSaveState("idle");
        }
      }, 800);
    },
    [show, onShowUpdate],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

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

  const location = [host.venue || host.address, host.city, host.region].filter(Boolean).join(", ");

  return (
    <>
      {editingHost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditingHost(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                AMEND SPONSOR
              </h4>
              <button
                onClick={() => setEditingHost(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
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
          </div>
        </div>
      )}
      {viewingSupporters && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setViewingSupporters(false);
            setEditingSupporter(null);
          }}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                {editingSupporter ? "AMEND SUPPORTER" : `SUPPORTERS (${supporters.length})`}
              </h4>
              <button
                onClick={() => {
                  if (editingSupporter) setEditingSupporter(null);
                  else {
                    setViewingSupporters(false);
                  }
                }}
                className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                {editingSupporter ? "← Back" : "✕"}
              </button>
            </div>
            {editingSupporter ? (
              <SponsorForm
                showSlug={editingSupporter.showSlug ?? undefined}
                submittedAt={editingSupporter.submittedAt}
                venue={editingSupporter.venue}
                address={editingSupporter.address}
                city={editingSupporter.city}
                region={editingSupporter.region}
                country={editingSupporter.country}
                date={editingSupporter.date}
                doorTime={editingSupporter.doorTime}
                initialName={editingSupporter.name}
                initialPhone={editingSupporter.phone}
                initialEmail={editingSupporter.email}
                initialItems={editingSupporter.items}
                compact
                editMode
                onSuccess={(data) => {
                  onUpdateSponsor({ ...editingSupporter, ...data });
                  setEditingSupporter(null);
                }}
              />
            ) : (
              <div className="space-y-1">
                {supporters.map((s) => (
                  <button
                    key={s.submittedAt}
                    onClick={() => setEditingSupporter(s)}
                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="text-neutral-700 dark:text-neutral-300">
                      <span className="font-medium">{s.name || s.email}</span>
                      {s.name && s.email && (
                        <span className="text-neutral-400 dark:text-neutral-500 ml-2">
                          {s.email}
                        </span>
                      )}
                    </div>
                    {s.items.length > 0 && (
                      <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {s.items.join(" · ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex">
        {/* Left: info */}
        <div className="flex-1 min-w-0 p-4 space-y-3">
          <>
            <div>
              <p className="text-lg text-neutral-900 dark:text-white font-light">
                {host.date ? formatEventDate(host.date) : "No date"}
                {location && ` · ${location}`}
              </p>
            </div>

            {show && (
              <div className="space-y-2 pt-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm text-neutral-400 dark:text-neutral-500 uppercase tracking-wide font-light">
                    Poster Labels
                  </h4>
                  {labelSaveState === "saving" && (
                    <CircleNotchIcon size={14} className="text-neutral-400 animate-spin" />
                  )}
                  {labelSaveState === "saved" && (
                    <CheckCircleIcon size={14} weight="fill" className="text-green-500" />
                  )}
                </div>
                <input
                  type="text"
                  value={labelValue}
                  onChange={(e) => {
                    setLabelValue(e.target.value);
                    debounceSaveLabels(e.target.value, doorLabelValue);
                  }}
                  placeholder={`${host.venue || "Venue"}, ${host.city}, ${host.region}`}
                  className="w-full px-3 py-1.5 text-sm rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                />
                <input
                  type="text"
                  value={doorLabelValue}
                  onChange={(e) => {
                    setDoorLabelValue(e.target.value);
                    debounceSaveLabels(labelValue, e.target.value);
                  }}
                  placeholder={`Doors open at ${host.doorTime || "7PM"}`}
                  className="w-full px-3 py-1.5 text-sm rounded border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                />
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
        </div>

        {/* Right: actions — flush to top, right, bottom edges */}
        <div className="shrink-0 flex flex-col border-l border-neutral-200/50 dark:border-neutral-700/50 w-28">
          <button
            disabled
            title="PDF renovating"
            className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200/50 dark:border-neutral-700/50 text-neutral-400 dark:text-neutral-600 cursor-not-allowed font-light bg-neutral-50 dark:bg-neutral-800"
          >
            PDF
          </button>
          {show?.slug && (
            <button
              onClick={async () => {
                const next = show.access === "private" ? "public" : "private";
                onShowUpdate(show.slug, { access: next });
                await fetch("/api/shows", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ slug: show.slug, access: next }),
                });
              }}
              className={`flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200/50 dark:border-neutral-700/50 transition-colors font-light ${
                show.access === "private"
                  ? "text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {show.access === "private" ? "Private" : "Public"}
            </button>
          )}
          {supporters.length > 0 && (
            <button
              onClick={() => setViewingSupporters(true)}
              className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200/50 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors font-light"
            >
              +{supporters.length}
            </button>
          )}
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
      </div>
    </>
  );
}
