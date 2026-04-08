"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircleNotchIcon, CheckCircleIcon } from "@phosphor-icons/react";
import SponsorForm from "../../components/SponsorForm";
import Poster from "../../components/Poster";
import { type Show } from "../../lib/shows";
import { type Pamphlet, type PamphletShow } from "../../lib/pamphlets";
import { formatEventDate, formatMonthDay, formatDayMonthDay, isDatePast } from "../../lib/dates";
import { buildZip } from "../../lib/zip";

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
  const [pamphlets, setPamphlets] = useState<Pamphlet[]>([]);
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
      fetch("/api/pamphlets")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([showsData, sponsorsData, pamphletData]) => {
        setShows(Array.isArray(showsData) ? showsData : []);
        setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
        setPamphlets(Array.isArray(pamphletData) ? pamphletData : []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

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

  const groupIntoLegs = (items: ShowGroup[]): ShowGroup[][] => {
    const withSlug = items.filter((g) => g.show?.slug && g.show?.date);
    if (!withSlug.length) return [];
    const legs: ShowGroup[][] = [];
    let current = [withSlug[0]];
    for (let i = 1; i < withSlug.length; i++) {
      const prev = withSlug[i - 1];
      const next = withSlug[i];
      const diffDays =
        (new Date(next.show!.date).getTime() - new Date(prev.show!.date).getTime()) /
        (1000 * 60 * 60 * 24);
      const sameRegion = prev.show!.region === next.show!.region;
      if (Math.abs(diffDays) <= (sameRegion ? 21 : 7)) {
        current.push(next);
      } else {
        legs.push(current);
        current = [next];
      }
    }
    legs.push(current);
    return legs;
  };

  const upcoming = groups
    .filter((g) => g.host.date && !isDatePast(g.host.date))
    .sort((a, b) => new Date(a.host.date!).getTime() - new Date(b.host.date!).getTime());

  const pamphletGroups = groupIntoLegs(upcoming);

  const past = groups
    .filter((g) => !g.host.date || isDatePast(g.host.date))
    .sort(
      (a, b) => new Date(b.host.date ?? "0").getTime() - new Date(a.host.date ?? "0").getTime(),
    );

  const pastLegs = groupIntoLegs(past);
  const pastGrouped = new Set(pastLegs.flat().map((g) => g.showSlug));
  const pastUngrouped = past.filter((g) => !pastGrouped.has(g.showSlug));

  const cardProps = {
    onUpdateSponsor: (updated: Sponsor) =>
      setSponsors((prev) => prev.map((s) => (s.submittedAt === updated.submittedAt ? updated : s))),
    onRemoveSponsor: (submittedAt: string) =>
      setSponsors((prev) => prev.filter((s) => s.submittedAt !== submittedAt)),
    onShowUpdate: (slug: string, fields: Partial<Show>) =>
      setShows((prev) => prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s))),
  };

  const grouped = new Set(pamphletGroups.flat().map((g) => g.showSlug));
  const ungrouped = upcoming.filter((g) => !grouped.has(g.showSlug));

  const handlePamphletSaved = (p: Pamphlet) => {
    setPamphlets((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      return idx >= 0 ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {message && (
          <div
            className={`p-4 rounded-xl text-sm mb-8 border ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-44 bg-neutral-200 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800"
              />
            ))}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-16">
                <div className="flex items-baseline justify-between mb-8">
                  <h2 className="text-lg font-medium tracking-[0.15em] text-neutral-900 dark:text-white uppercase">
                    Upcoming
                  </h2>
                  <div className="flex items-center gap-2">
                    <CustomPosterButton />
                    <BlankPamphletButton />
                  </div>
                </div>
                <div className="space-y-10">
                  {pamphletGroups.map((cluster, i) => {
                    const clusterSlugs = cluster.map((g) => g.show!.slug);
                    const matched = pamphlets.find((p) =>
                      p.shows.some((ps) => clusterSlugs.includes(ps.slug)),
                    );
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-4 mb-4">
                          <PamphletGroupButton
                            group={cluster}
                            matchedPamphlet={matched ?? null}
                            onPamphletSaved={handlePamphletSaved}
                          />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                          {cluster.map((g) => (
                            <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {ungrouped.length > 0 && (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-xs tracking-[0.15em] text-neutral-500 uppercase shrink-0">
                          Unscheduled
                        </span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {ungrouped.map((g) => (
                          <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <CompletedSection legs={pastLegs} ungrouped={pastUngrouped} pamphlets={pamphlets} />
            )}

            {groups.length === 0 && (
              <div className="text-center py-24">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No shows yet.</p>
                <p className="text-xs text-neutral-600 mt-2">
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

function CompletedSection({
  legs,
  ungrouped,
  pamphlets,
}: {
  legs: ShowGroup[][];
  ungrouped: ShowGroup[];
  pamphlets: Pamphlet[];
}) {
  const [viewing, setViewing] = useState<ShowGroup | null>(null);

  return (
    <div>
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                SPONSOR
              </h4>
              <button
                onClick={() => setViewing(null)}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <SponsorForm
              showSlug={viewing.host.showSlug ?? undefined}
              submittedAt={viewing.host.submittedAt}
              venue={viewing.host.venue}
              address={viewing.host.address}
              city={viewing.host.city}
              region={viewing.host.region}
              country={viewing.host.country}
              date={viewing.host.date}
              doorTime={viewing.host.doorTime}
              initialName={viewing.host.name}
              initialPhone={viewing.host.phone}
              initialEmail={viewing.host.email}
              initialItems={viewing.host.items}
              compact
              readOnly
            />
            {viewing.supporters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-300 dark:border-neutral-700">
                <h4 className="text-xs font-light tracking-widest uppercase text-neutral-500 mb-3">
                  Supporters ({viewing.supporters.length})
                </h4>
                <div className="space-y-2">
                  {viewing.supporters.map((s) => (
                    <div
                      key={s.submittedAt}
                      className="text-sm text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="font-medium">{s.name || s.email}</span>
                      {s.name && s.email && (
                        <span className="text-neutral-500 ml-2">{s.email}</span>
                      )}
                      {s.phone && <span className="text-neutral-500 ml-2">{s.phone}</span>}
                      {s.items.length > 0 && (
                        <div className="text-xs text-neutral-500 mt-0.5">{s.items.join(" · ")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-xs tracking-[0.2em] text-neutral-600 uppercase shrink-0">Completed</h2>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="space-y-6">
        {legs.map((leg, i) => {
          const sorted = [...leg].sort(
            (a, b) => new Date(a.show!.date).getTime() - new Date(b.show!.date).getTime(),
          );
          const slugs = new Set(sorted.map((g) => g.show!.slug));
          const matched = pamphlets.find((p) => p.shows.some((s) => slugs.has(s.slug)));
          const legName = matched?.label || matched?.id?.replace(/-/g, " ");

          return (
            <div key={i}>
              {legName && (
                <h3
                  className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2"
                  style={{ fontFamily: '"Parkinsans", sans-serif' }}
                >
                  {legName}
                </h3>
              )}
              <div className="flex flex-wrap gap-2">
                {sorted.map((g) => (
                  <button
                    key={g.showSlug}
                    onClick={() => setViewing(g)}
                    className="px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-[#d4a553] hover:border-[#d4a553]/30 transition-colors"
                    style={{ fontFamily: '"Space Mono", monospace' }}
                  >
                    {formatDayMonthDay(g.show!.date)}
                    <span className="text-neutral-600 ml-1.5">{g.show!.city}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {ungrouped.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ungrouped.map((g) => (
              <button
                key={g.showSlug}
                onClick={() => setViewing(g)}
                className="px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-[#d4a553] hover:border-[#d4a553]/30 transition-colors"
                style={{ fontFamily: '"Space Mono", monospace' }}
              >
                {g.host.date ? formatDayMonthDay(g.host.date) : "No date"}
                <span className="text-neutral-600 ml-1.5">{g.host.city || g.host.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomPosterButton() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [venue, setVenue] = useState("");
  const [doorTime, setDoorTime] = useState("7PM");
  const [venueLabel, setVenueLabel] = useState("");
  const [doorLabel, setDoorLabel] = useState("");
  const [taglineSuffix, setTaglineSuffix] = useState("");

  const buildHref = () => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (city) params.set("city", city);
    if (region) params.set("region", region);
    if (venue) params.set("venue", venue);
    if (doorTime) params.set("doorTime", doorTime);
    if (venueLabel) params.set("venueLabel", venueLabel);
    if (doorLabel) params.set("doorLabel", doorLabel);
    if (taglineSuffix) params.set("label", taglineSuffix);
    return `/api/poster?${params.toString()}`;
  };

  const canDownload = date && city && region;
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!canDownload) return;
    setGenerating(true);
    try {
      const res = await fetch(buildHref());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `poster-${city.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  const inputClass =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl shadow-xl rounded-l-lg overflow-hidden flex h-[520px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0 bg-white dark:bg-neutral-800 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                  CUSTOM POSTER
                </h4>
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Region (e.g. BC, WA)"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Venue"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={doorTime}
                  onChange={(e) => setDoorTime(e.target.value)}
                  placeholder="Door time (e.g. 7PM)"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={venueLabel}
                  onChange={(e) => setVenueLabel(e.target.value)}
                  placeholder="Venue label override"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={doorLabel}
                  onChange={(e) => setDoorLabel(e.target.value)}
                  placeholder="Door label override"
                  className={inputClass}
                />
                <textarea
                  value={taglineSuffix}
                  onChange={(e) => setTaglineSuffix(e.target.value)}
                  placeholder="Tagline suffix (e.g. in British Columbia)"
                  rows={2}
                  className={inputClass + " resize-none"}
                />
              </div>
              <button
                onClick={handleDownload}
                disabled={!canDownload || generating}
                className="w-full text-center text-xs px-3 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors font-light disabled:opacity-30"
              >
                {generating ? "Generating..." : "Download Poster"}
              </button>
            </div>
            <div className="h-full">
              <Poster
                date={date || undefined}
                city={city || undefined}
                region={region || undefined}
                venue={venue || undefined}
                doorTime={doorTime || undefined}
                venueLabel={venueLabel || undefined}
                doorLabel={doorLabel || undefined}
                taglineSuffix={taglineSuffix || undefined}
              />
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
      >
        Custom Poster
      </button>
    </>
  );
}

function BlankPamphletButton() {
  const [downloading, setDownloading] = useState(false);
  const handleClick = async () => {
    setDownloading(true);
    try {
      const [igRes, ytRes] = await Promise.all([
        fetch("/api/pamphlet?blank=true&format=ig"),
        fetch("/api/pamphlet?blank=true&format=yt"),
      ]);
      const [igBuf, ytBuf] = await Promise.all([igRes.arrayBuffer(), ytRes.arrayBuffer()]);
      const zip = buildZip([
        { name: "pamphlet-blank-ig.jpg", data: new Uint8Array(igBuf) },
        { name: "pamphlet-blank-yt.jpg", data: new Uint8Array(ytBuf) },
      ]);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "pamphlet-blank.zip";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <button
      onClick={handleClick}
      disabled={downloading}
      className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors disabled:opacity-50"
    >
      {downloading ? "Generating..." : "Blank"}
    </button>
  );
}

function PamphletGroupButton({
  group,
  matchedPamphlet,
  onPamphletSaved,
}: {
  group: ShowGroup[];
  matchedPamphlet: Pamphlet | null;
  onPamphletSaved: (p: Pamphlet) => void;
}) {
  const [open, setOpen] = useState(false);
  const [legId, setLegId] = useState(matchedPamphlet?.id ?? "");
  const [legLabel, setLegLabel] = useState(matchedPamphlet?.label ?? "");
  const [venueLabels, setVenueLabels] = useState<Record<string, string>>(() => {
    if (matchedPamphlet) {
      return Object.fromEntries(
        group.map((g) => {
          const ps = matchedPamphlet.shows.find((s) => s.slug === g.show!.slug);
          return [g.show!.slug, ps?.venueLabel ?? g.show!.venueLabel ?? ""];
        }),
      );
    }
    return Object.fromEntries(group.map((g) => [g.show!.slug, g.show!.venueLabel ?? ""]));
  });
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    if (matchedPamphlet) {
      const savedSlugs = new Set(matchedPamphlet.shows.map((s) => s.slug));
      return Object.fromEntries(group.map((g) => [g.show!.slug, savedSlugs.has(g.show!.slug)]));
    }
    return Object.fromEntries(group.map((g) => [g.show!.slug, g.show?.access !== "private"]));
  });
  const [placeholders, setPlaceholders] = useState<{ date: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const first = group[0].show!;
  const last = group[group.length - 1].show!;
  const label =
    group.length === 1
      ? formatMonthDay(first.date)
      : `${formatMonthDay(first.date)} – ${formatMonthDay(last.date)}`;

  const activeGroup = group.filter((g) => included[g.show!.slug]);

  const buildPamphletShows = (): PamphletShow[] =>
    activeGroup.map((g) => {
      const slug = g.show!.slug;
      const vl = venueLabels[slug]?.trim();
      return vl ? { slug, venueLabel: vl } : { slug };
    });

  const appendPlaceholders = (params: URLSearchParams) => {
    placeholders.forEach((ph, i) => {
      if (ph.date) {
        params.set(`ph_${i}`, ph.date);
        if (ph.label.trim()) params.set(`phl_${i}`, ph.label.trim());
      }
    });
  };

  const buildHref = (format: "ig" | "yt") => {
    if (legId.trim()) {
      const params = new URLSearchParams({ id: legId.trim(), format });
      appendPlaceholders(params);
      return `/api/pamphlet?${params.toString()}`;
    }
    const slugsParam = activeGroup.map((g) => g.show!.slug).join(",");
    const params = new URLSearchParams({ slugs: slugsParam, format });
    for (const g of activeGroup) {
      const slug = g.show!.slug;
      if (venueLabels[slug]) params.set(`vl_${slug}`, venueLabels[slug]);
    }
    appendPlaceholders(params);
    return `/api/pamphlet?${params.toString()}`;
  };

  const savePamphlet = async (): Promise<boolean> => {
    const id = legId.trim();
    if (!id) return true;
    setSaving(true);
    setSaveError("");
    const label = legLabel.trim() || undefined;
    const payload = { id, shows: buildPamphletShows(), label };
    const isUpdate = matchedPamphlet?.id === id;
    const res = await fetch("/api/pamphlets", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      if (res.status === 409) {
        setSaveError("Name already taken by another pamphlet");
      } else {
        setSaveError("Failed to save");
      }
      return false;
    }
    onPamphletSaved({ id, label, shows: payload.shows });
    return true;
  };

  const handleDownload = async () => {
    const ok = await savePamphlet();
    if (!ok) return;
    setSaving(true);
    try {
      const [igRes, ytRes] = await Promise.all([fetch(buildHref("ig")), fetch(buildHref("yt"))]);
      const [igBuf, ytBuf] = await Promise.all([igRes.arrayBuffer(), ytRes.arrayBuffer()]);
      const name = legId.trim() || first.date;
      const zip = buildZip([
        { name: `pamphlet-${name}-ig.jpg`, data: new Uint8Array(igBuf) },
        { name: `pamphlet-${name}-yt.jpg`, data: new Uint8Array(ytBuf) },
      ]);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pamphlet-${name}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  };

  const total = activeGroup.length + placeholders.filter((p) => p.date).length;

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
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={legId}
              onChange={(e) => setLegId(e.target.value)}
              placeholder="ID (e.g. british-columbia)"
              className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 mb-2"
            />
            <input
              type="text"
              value={legLabel}
              onChange={(e) => setLegLabel(e.target.value)}
              placeholder="Tagline suffix (e.g. in British Columbia)"
              className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 mb-4"
            />
            <div className="space-y-3 mb-4">
              {group.map((g) => {
                const slug = g.show!.slug;
                const isIncluded = included[slug];
                return (
                  <div key={slug} className={isIncluded ? "" : "opacity-40"}>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(e) =>
                          setIncluded((prev) => ({ ...prev, [slug]: e.target.checked }))
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
                      disabled={!isIncluded}
                      placeholder={`${g.show!.venue || "Venue"}, ${g.show!.city}, ${g.show!.region}`}
                      className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 disabled:opacity-30"
                    />
                  </div>
                );
              })}
            </div>
            <div className="border-t border-neutral-300 dark:border-neutral-600 pt-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-neutral-600 dark:text-neutral-400 uppercase">
                  Placeholder dates
                </span>
                <button
                  onClick={() => setPlaceholders((prev) => [...prev, { date: "", label: "" }])}
                  className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
                >
                  + Add slot
                </button>
              </div>
              {placeholders.map((ph, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={ph.date}
                    onChange={(e) =>
                      setPlaceholders((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, date: e.target.value } : p)),
                      )
                    }
                    className="flex-[3] px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                  />
                  <input
                    type="text"
                    value={ph.label}
                    onChange={(e) =>
                      setPlaceholders((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)),
                      )
                    }
                    placeholder="TBA"
                    className="flex-[4] px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                  />
                  <button
                    onClick={() => setPlaceholders((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {saveError && <div className="text-xs text-red-500 mb-2">{saveError}</div>}
            {total > 0 ? (
              <button
                onClick={handleDownload}
                disabled={saving}
                className="w-full text-center text-xs px-3 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors font-light disabled:opacity-50"
              >
                {saving ? "Generating..." : `Save & Download (${total})`}
              </button>
            ) : (
              <div className="text-center text-xs px-3 py-1.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                Select at least one show
              </div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <span className="text-xs tracking-widest text-neutral-500 uppercase">Pamphlet</span>
        <span>
          {matchedPamphlet?.label || matchedPamphlet?.id || label} &middot; {group.length} show
          {group.length !== 1 ? "s" : ""}
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
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
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
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
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
                        <span className="text-neutral-500 ml-2">{s.email}</span>
                      )}
                    </div>
                    {s.items.length > 0 && (
                      <div className="text-xs text-neutral-500 mt-0.5">{s.items.join(" · ")}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 overflow-hidden transition-all h-full flex flex-col">
        <div className="flex flex-1">
          <div className="flex-1 min-w-0 p-5 flex flex-col gap-3">
            <div>
              <p className="text-base text-neutral-900 dark:text-white font-medium">
                {host.date ? formatEventDate(host.date) : "No date"}
              </p>
              {location && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{location}</p>
              )}
            </div>

            {show && (
              <div className="mt-auto space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs text-neutral-500 uppercase tracking-widest">
                    Poster Labels
                  </h4>
                  {labelSaveState === "saving" && (
                    <CircleNotchIcon size={14} className="text-neutral-500 animate-spin" />
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
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                />
                <input
                  type="text"
                  value={doorLabelValue}
                  onChange={(e) => {
                    setDoorLabelValue(e.target.value);
                    debounceSaveLabels(labelValue, e.target.value);
                  }}
                  placeholder={`Doors open at ${host.doorTime || "7PM"}`}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
                />
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col border-l border-neutral-200 dark:border-neutral-800 w-28">
            <button
              disabled
              title="PDF renovating"
              className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
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
                className={`flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200 dark:border-neutral-800 transition-colors ${
                  show.access === "private"
                    ? "text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {show.access === "private" ? "Private" : "Public"}
              </button>
            )}
            {supporters.length > 0 && (
              <button
                onClick={() => setViewingSupporters(true)}
                className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                +{supporters.length}
              </button>
            )}
            <button
              onClick={() => setEditingHost(true)}
              className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Amend
            </button>
            <button
              onClick={() => {
                setConfirmDelete(true);
                setDeleteInput("");
              }}
              className="flex-1 flex items-center justify-center text-sm px-3 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Delete
            </button>
            {show?.slug ? (
              <a
                href={`/api/poster/${show.slug}`}
                download={`poster-${show.slug}.jpg`}
                className="flex-1 flex items-center justify-center text-sm px-3 text-[#d4a553] hover:bg-[#d4a553]/5 dark:hover:bg-[#d4a553]/10 transition-colors"
              >
                Poster
              </a>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
        {confirmDelete && (
          <div className="flex gap-2 items-center px-5 py-3 border-t border-neutral-200 dark:border-neutral-800">
            <input
              autoFocus
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='type "delete"'
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
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
              className="text-sm text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
