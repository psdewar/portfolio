"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  CircleNotchIcon,
  CheckCircleIcon,
  TextAlignLeftIcon,
  TextAlignJustifyIcon,
} from "@phosphor-icons/react";
import SponsorForm from "../../components/SponsorForm";
import Poster from "../../components/Poster";
import { type Show } from "../../lib/shows";
import { type Pamphlet, type PamphletShow } from "../../lib/pamphlets";
import { formatEventDate, formatMonthDay, formatDayMonthDay, isDatePast } from "../../lib/dates";
import { buildZip } from "../../lib/zip";
import { useDebouncedSave } from "../../hooks/useDebouncedSave";
import { FREE_ADMISSION_TAG } from "../../lib/poster-defaults";
import { areRegionsAdjacent } from "../../lib/region-adjacency";

function Modal({
  onClose,
  title,
  header,
  children,
}: {
  onClose: () => void;
  title?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {header ??
          (title !== undefined && (
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                {title}
              </h4>
              <button
                onClick={onClose}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        {children}
      </div>
    </div>
  );
}

function TagsField({
  value,
  onChange,
  max = 3,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  max?: number;
  className?: string;
}) {
  const [input, setInput] = useState("");
  const list = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const commit = () => {
    const t = input.trim();
    if (!t || list.length >= max) {
      setInput("");
      return;
    }
    onChange([...list, t].join(", "));
    setInput("");
  };
  const remove = (idx: number) => onChange(list.filter((_, i) => i !== idx).join(", "));
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && input === "" && list.length > 0) {
      e.preventDefault();
      remove(list.length - 1);
    }
  };
  return (
    <div className={className}>
      {list.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-xs uppercase tracking-wider rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(i)}
            className="ml-0.5 text-neutral-500 hover:text-red-500 transition-colors leading-none"
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        disabled={list.length >= max}
        placeholder={
          list.length >= max
            ? `Max ${max} tags`
            : list.length === 0
              ? "Add tags (comma or Enter)"
              : ""
        }
        className="flex-1 min-w-[40px] outline-none bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// Renders the pamphlet HTML in a scaled iframe — no Puppeteer, instant preview.
function PamphletPreviewFrame({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientHeight / 720);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-full bg-[#0a0a0a]" style={{ width: scale ? 480 * scale : 360 }}>
      {src && scale > 0 && (
        <iframe
          src={src}
          title="Pamphlet preview"
          scrolling="no"
          style={{
            width: 480,
            height: 720,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      )}
    </div>
  );
}

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
    // Shows manually flagged standalone are pulled out before chaining and
    // re-added as their own one-show legs.
    const chainable = withSlug.filter((g) => !g.show!.standalone);
    const solo = withSlug.filter((g) => g.show!.standalone);
    const legs: ShowGroup[][] = [];
    if (chainable.length) {
      let current = [chainable[0]];
      for (let i = 1; i < chainable.length; i++) {
        const prev = chainable[i - 1];
        const next = chainable[i];
        const diffDays =
          (new Date(next.show!.date).getTime() - new Date(prev.show!.date).getTime()) /
          (1000 * 60 * 60 * 24);
        const sameRegion = prev.show!.region === next.show!.region;
        const adjacent =
          sameRegion || areRegionsAdjacent(prev.show!.region, next.show!.region);
        // Non-adjacent regions never chain — calendar proximity alone (e.g. WA
        // and NJ 6 days apart) is not a tour leg.
        if (adjacent && Math.abs(diffDays) <= (sameRegion ? 21 : 7)) {
          current.push(next);
        } else {
          legs.push(current);
          current = [next];
        }
      }
      legs.push(current);
    }
    for (const s of solo) legs.push([s]);
    legs.sort(
      (a, b) => new Date(a[0].show!.date).getTime() - new Date(b[0].show!.date).getTime(),
    );
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
    pamphlets,
    onUpdateSponsor: (updated: Sponsor) =>
      setSponsors((prev) =>
        prev.map((s) =>
          s.submittedAt === updated.submittedAt && s.showSlug === updated.showSlug ? updated : s,
        ),
      ),
    onRemoveSponsor: (submittedAt: string, showSlug?: string | null) =>
      setSponsors((prev) =>
        prev.filter((s) =>
          showSlug !== undefined
            ? !(s.submittedAt === submittedAt && s.showSlug === showSlug)
            : s.submittedAt !== submittedAt,
        ),
      ),
    onShowUpdate: (slug: string, fields: Partial<Show>) =>
      setShows((prev) => prev.map((s) => (s.slug === slug ? { ...s, ...fields } : s))),
    onPamphletCascade: (deletedSlug: string) =>
      setPamphlets((prev) =>
        prev.flatMap((p) => {
          const remaining = p.shows.filter((s) => s.slug !== deletedSlug);
          if (remaining.length === p.shows.length) return [p];
          if (remaining.length === 0) return [];
          return [{ ...p, shows: remaining }];
        }),
      ),
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
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
                          <PosterEditor
                            group={cluster}
                            matchedPamphlet={matched ?? null}
                            onPamphletSaved={handlePamphletSaved}
                            onShowUpdate={cardProps.onShowUpdate}
                            variant="leg"
                          />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
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
        <Modal onClose={() => setViewing(null)} title="SPONSOR">
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
                    {s.name && s.email && <span className="text-neutral-500 ml-2">{s.email}</span>}
                    {s.phone && <span className="text-neutral-500 ml-2">{s.phone}</span>}
                    {s.items.length > 0 && (
                      <div className="text-xs text-neutral-500 mt-0.5">{s.items.join(" · ")}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
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
  const [tags, setTags] = useState(FREE_ADMISSION_TAG);
  const [doorsOpen, setDoorsOpen] = useState("");

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
    if (tags.trim()) params.set("tags", tags.trim());
    if (doorsOpen.trim()) params.set("doorsOpen", doorsOpen.trim());
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
      link.download = `poster-${city.toLowerCase().replace(/\s+/g, "-")}.pdf`;
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
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={doorsOpen}
                  onChange={(e) => setDoorsOpen(e.target.value)}
                  placeholder="Doors open override"
                  className={inputClass}
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
                tags={tags || undefined}
                doorsOpen={doorsOpen || undefined}
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
        fetch("/api/pamphlet?blank=true&format=ig&pdf=true"),
        fetch("/api/pamphlet?blank=true&format=yt&pdf=true"),
      ]);
      const [igBuf, ytBuf] = await Promise.all([igRes.arrayBuffer(), ytRes.arrayBuffer()]);
      const zip = buildZip([
        { name: "pamphlet-blank-ig.pdf", data: new Uint8Array(igBuf) },
        { name: "pamphlet-blank-yt.pdf", data: new Uint8Array(ytBuf) },
      ]);
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(zip)], { type: "application/zip" }),
      );
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

// Unified poster / pamphlet editor. One date renders a poster (/api/poster),
// multiple dates render a pamphlet (/api/pamphlet) — the only difference is
// date grouping. Single-date edits persist to the Show record; multi-date
// edits persist to a Pamphlet record.
function PosterEditor({
  group,
  matchedPamphlet,
  onPamphletSaved,
  onShowUpdate,
  variant,
}: {
  group: ShowGroup[];
  matchedPamphlet: Pamphlet | null;
  onPamphletSaved: (p: Pamphlet) => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
  variant: "card" | "leg";
}) {
  const isSingle = group.length === 1;
  const soloShow = group[0].show;

  const [open, setOpen] = useState(false);
  const [legId, setLegId] = useState(matchedPamphlet?.id ?? "");
  const [tagline, setTagline] = useState(
    isSingle ? (soloShow?.taglineSuffix ?? "") : (matchedPamphlet?.label ?? ""),
  );
  const [showDoors, setShowDoors] = useState(matchedPamphlet?.showDoors ?? false);
  const [showQr, setShowQr] = useState(matchedPamphlet?.showQr ?? false);
  const [tags, setTags] = useState(
    isSingle
      ? (soloShow?.tags ?? FREE_ADMISSION_TAG)
      : (matchedPamphlet?.tags ?? FREE_ADMISSION_TAG),
  );
  const [venueImg, setVenueImg] = useState(
    isSingle ? (soloShow?.venueImg ?? "") : (matchedPamphlet?.venueImg ?? ""),
  );
  const [venueImgWidth, setVenueImgWidth] = useState(() => {
    const w = isSingle ? soloShow?.venueImgWidth : matchedPamphlet?.venueImgWidth;
    return w ? String(w) : "";
  });
  const [taglineAlign, setTaglineAlign] = useState<"justify" | "left">(() => {
    const a = isSingle ? soloShow?.taglineAlign : matchedPamphlet?.taglineAlign;
    return a === "left" ? "left" : "justify";
  });
  const [address, setAddress] = useState(matchedPamphlet?.address ?? "");
  const [doorsOpen, setDoorsOpen] = useState(matchedPamphlet?.doorsOpen ?? "");
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
  const [doorLabels, setDoorLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.map((g) => [g.show!.slug, g.show!.doorLabel ?? ""])),
  );
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    if (matchedPamphlet) {
      const savedSlugs = new Set(matchedPamphlet.shows.map((s) => s.slug));
      return Object.fromEntries(group.map((g) => [g.show!.slug, savedSlugs.has(g.show!.slug)]));
    }
    return Object.fromEntries(group.map((g) => [g.show!.slug, g.show?.access !== "private"]));
  });
  const [placeholders, setPlaceholders] = useState<{ date: string; label: string }[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [standalone, setStandalone] = useState(soloShow?.standalone ?? false);

  const first = group[0].show!;
  const last = group[group.length - 1].show!;
  const label = isSingle
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

  // ── multi-date: pamphlet ──────────────────────────────────────────────────
  const buildPamphletHref = (
    format: "ig" | "yt" | "print" | "standard" | "eb" | "fb" | "fbe",
    asPdf = false,
    forceSlugs = false,
  ) => {
    const applyExtras = (params: URLSearchParams) => {
      if (showDoors) params.set("doors", "1");
      if (showQr) params.set("qr", "1");
      if (tags.trim()) params.set("tags", tags);
      if (tagline.trim()) params.set("label", tagline.trim());
      if (venueImg.trim()) params.set("venueImg", venueImg.trim());
      if (venueImgWidth.trim()) params.set("venueImgW", venueImgWidth.trim());
      params.set("align", taglineAlign);
      if (address.trim()) params.set("address", address.trim());
      if (doorsOpen.trim()) params.set("doorsOpen", doorsOpen.trim());
      if (asPdf) params.set("pdf", "true");
    };
    if (legId.trim() && !forceSlugs) {
      const params = new URLSearchParams({ id: legId.trim(), format });
      applyExtras(params);
      appendPlaceholders(params);
      return `/api/pamphlet?${params.toString()}`;
    }
    const slugsParam = activeGroup.map((g) => g.show!.slug).join(",");
    const params = new URLSearchParams({ slugs: slugsParam, format });
    applyExtras(params);
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
    setSaveError("");
    const lbl = tagline.trim() || undefined;
    const payload = {
      id,
      shows: buildPamphletShows(),
      label: lbl,
      showDoors,
      showQr,
      tags: tags.trim() || undefined,
      venueImg: venueImg.trim() || undefined,
      venueImgWidth: Number(venueImgWidth) || undefined,
      taglineAlign,
      address: address.trim() || undefined,
      doorsOpen: doorsOpen.trim() || undefined,
    };
    const isUpdate = matchedPamphlet?.id === id;
    const res = await fetch("/api/pamphlets", {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setSaveError(res.status === 409 ? "Name already taken by another pamphlet" : "Failed to save");
      return false;
    }
    onPamphletSaved({
      id,
      label: lbl,
      shows: payload.shows,
      showDoors,
      showQr,
      tags: payload.tags,
      venueImg: payload.venueImg,
      venueImgWidth: payload.venueImgWidth,
      taglineAlign: payload.taglineAlign,
      address: payload.address,
      doorsOpen: payload.doorsOpen,
    });
    return true;
  };

  const zipAndDownload = (
    entries: { name: string; data: Uint8Array }[],
    zipName: string,
  ) => {
    const zip = buildZip(entries);
    const url = URL.createObjectURL(new Blob([Uint8Array.from(zip)], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = zipName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── single-date: poster ───────────────────────────────────────────────────
  const buildPosterHref = (
    format: "ig" | "yt" | "print" | "standard" | "eb" | "fb" | "fbe",
    asJpg = false,
  ) => {
    const params = new URLSearchParams({ format });
    if (tags.trim()) params.set("tags", tags.trim());
    if (tagline.trim()) params.set("label", tagline.trim());
    if (venueImg.trim()) params.set("venueImg", venueImg.trim());
    if (venueImgWidth.trim()) params.set("venueImgW", venueImgWidth.trim());
    params.set("align", taglineAlign);
    // Always sent so a download reflects the editor exactly, even unsaved.
    params.set("venueLabel", venueLabels[soloShow!.slug] ?? "");
    params.set("doorLabel", doorLabels[soloShow!.slug] ?? "");
    if (asJpg) params.set("jpg", "true");
    return `/api/poster/${soloShow!.slug}?${params.toString()}`;
  };

  // Persists immediately so the page regroups without waiting for download.
  const toggleStandalone = async (val: boolean) => {
    if (!soloShow) return;
    setStandalone(val);
    await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: soloShow.slug, standalone: val }),
    });
    onShowUpdate(soloShow.slug, { standalone: val });
  };

  const persistShow = async () => {
    const slug = soloShow!.slug;
    const fields: Partial<Show> = {
      venueLabel: venueLabels[slug]?.trim() || null,
      doorLabel: doorLabels[slug]?.trim() || null,
      tags: tags.trim() || null,
      taglineSuffix: tagline.trim() || null,
      venueImg: venueImg.trim() || null,
      venueImgWidth: Number(venueImgWidth) || null,
      taglineAlign,
    };
    await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...fields }),
    });
    onShowUpdate(slug, fields);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (isSingle) {
        const slug = soloShow!.slug;
        const pdfFmts = ["standard", "ig", "yt", "eb", "print"] as const;
        const jpgFmts = ["fb", "fbe"] as const;
        const entries = await Promise.all([
          ...pdfFmts.map((fmt) =>
            fetch(buildPosterHref(fmt))
              .then((r) => r.arrayBuffer())
              .then((buf) => ({
                name: `poster-${slug}${fmt === "standard" ? "" : `-${fmt}`}.pdf`,
                data: new Uint8Array(buf),
              })),
          ),
          ...jpgFmts.map((fmt) =>
            fetch(buildPosterHref(fmt, true))
              .then((r) => r.arrayBuffer())
              .then((buf) => ({ name: `poster-${slug}-${fmt}.jpg`, data: new Uint8Array(buf) })),
          ),
        ]);
        zipAndDownload(entries, `poster-${slug}.zip`);
      } else {
        const name = legId.trim() || first.date;
        const pdfFmts = ["ig", "yt", "print", "eb"] as const;
        const jpgFmts = ["fb", "fbe"] as const;
        // forceSlugs so the download reflects current edits without a save.
        const entries = await Promise.all([
          ...pdfFmts.map((fmt) =>
            fetch(buildPamphletHref(fmt, true, true))
              .then((r) => r.arrayBuffer())
              .then((buf) => ({ name: `pamphlet-${name}-${fmt}.pdf`, data: new Uint8Array(buf) })),
          ),
          ...jpgFmts.map((fmt) =>
            fetch(buildPamphletHref(fmt, false, true))
              .then((r) => r.arrayBuffer())
              .then((buf) => ({ name: `pamphlet-${name}-${fmt}.jpg`, data: new Uint8Array(buf) })),
          ),
        ]);
        zipAndDownload(entries, `pamphlet-${name}.zip`);
      }
    } finally {
      setDownloading(false);
    }
  };

  // Reset poster styling to defaults — auto-save then persists the cleared state.
  const handleReset = () => {
    setTags(FREE_ADMISSION_TAG);
    setTagline("");
    setTaglineAlign("justify");
    setVenueImg("");
    setVenueImgWidth("");
    setVenueLabels(Object.fromEntries(group.map((g) => [g.show!.slug, ""])));
    setDoorLabels(Object.fromEntries(group.map((g) => [g.show!.slug, ""])));
    if (!isSingle) {
      setAddress("");
      setDoorsOpen("");
      setShowDoors(false);
      setShowQr(false);
      setPlaceholders([]);
    }
  };

  // Esc closes the full-viewport editor — capture-phase + preventDefault so it
  // doesn't also trigger browser behavior (exit fullscreen, stop, etc.).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // Debounced auto-save — single edits persist to the show, multi to the
  // pamphlet record (when it has an ID). Mirrors the old inline Poster Labels.
  // No `open` gate: editor fields can only change while the modal is open, and
  // the gate would otherwise consume the initial-skip on the first real edit.
  const autoSaveInit = useRef(true);
  useEffect(() => {
    if (autoSaveInit.current) {
      autoSaveInit.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setAutoState("saving");
      try {
        if (isSingle) await persistShow();
        else if (legId.trim()) await savePamphlet();
        setAutoState("saved");
        setTimeout(() => setAutoState("idle"), 1800);
      } catch {
        setAutoState("idle");
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tags,
    tagline,
    taglineAlign,
    venueImg,
    venueImgWidth,
    address,
    doorsOpen,
    showDoors,
    showQr,
    legId,
    JSON.stringify(venueLabels),
    JSON.stringify(doorLabels),
    JSON.stringify(included),
    JSON.stringify(placeholders),
  ]);

  // Debounced pamphlet preview (raw-HTML iframe — no Puppeteer).
  useEffect(() => {
    if (!open || isSingle) return;
    if (activeGroup.length === 0) {
      setPreviewSrc("");
      return;
    }
    const t = setTimeout(() => {
      setPreviewSrc(`${buildPamphletHref("standard", false, true)}&html=true&_=${Date.now()}`);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    isSingle,
    tags,
    tagline,
    venueImg,
    address,
    doorsOpen,
    showDoors,
    showQr,
    JSON.stringify(venueLabels),
    JSON.stringify(included),
    JSON.stringify(placeholders),
  ]);

  const total = activeGroup.length + placeholders.filter((p) => p.date).length;
  const inputCls =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";
  const tagsCls =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-600 flex flex-wrap items-center gap-1.5 min-h-[34px]";
  const soloSlug = soloShow?.slug ?? "";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex bg-white dark:bg-neutral-800">
          {/* Inputs */}
          <div className="w-[460px] shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                  {isSingle ? "POSTER" : "PAMPHLET"} &middot; {label}
                </h4>
                {autoState === "saving" && (
                  <CircleNotchIcon size={14} className="text-neutral-500 animate-spin" />
                )}
                {autoState === "saved" && (
                  <CheckCircleIcon size={14} weight="fill" className="text-green-500" />
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-3">
              {!isSingle && (
                <input
                  type="text"
                  value={legId}
                  onChange={(e) => setLegId(e.target.value)}
                  placeholder="ID (e.g. british-columbia)"
                  className={`${inputCls} mb-2`}
                />
              )}
              <textarea
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Tagline suffix (e.g. in British Columbia, newlines allowed)"
                rows={2}
                className={`${inputCls} mb-2 resize-y`}
              />
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs text-neutral-500 mr-1">Tagline</span>
                {(
                  [
                    ["justify", TextAlignJustifyIcon, "Justify"],
                    ["left", TextAlignLeftIcon, "Left align"],
                  ] as const
                ).map(([val, Icon, title]) => (
                  <button
                    key={val}
                    type="button"
                    title={title}
                    aria-label={title}
                    aria-pressed={taglineAlign === val}
                    onClick={() => setTaglineAlign(val)}
                    className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${
                      taglineAlign === val
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300"
                        : "border-neutral-300 dark:border-neutral-600 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
              <TagsField value={tags} onChange={setTags} className={`${tagsCls} mb-3`} />
              <input
                type="text"
                value={venueImg}
                onChange={(e) => setVenueImg(e.target.value)}
                placeholder="Venue logo file in /public (e.g. tcc.webp)"
                className={`${inputCls} mb-2`}
              />
              <input
                type="number"
                value={venueImgWidth}
                onChange={(e) => setVenueImgWidth(e.target.value)}
                min={0}
                step={1}
                placeholder="Venue logo width in px (blank = default)"
                className={`${inputCls} mb-2`}
              />

              {isSingle ? (
                <>
                  <input
                    type="text"
                    value={venueLabels[soloSlug] ?? ""}
                    onChange={(e) =>
                      setVenueLabels((prev) => ({ ...prev, [soloSlug]: e.target.value }))
                    }
                    placeholder={`${soloShow?.venue || "Venue"}, ${soloShow?.city}, ${soloShow?.region}`}
                    className={`${inputCls} mb-2`}
                  />
                  <input
                    type="text"
                    value={doorLabels[soloSlug] ?? ""}
                    onChange={(e) =>
                      setDoorLabels((prev) => ({ ...prev, [soloSlug]: e.target.value }))
                    }
                    placeholder={`Doors open at ${soloShow?.doorTime || "7PM"}`}
                    className={`${inputCls} mb-3`}
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={standalone}
                      onChange={(e) => toggleStandalone(e.target.checked)}
                      className="rounded"
                    />
                    <span>Keep separate — never group into a pamphlet leg</span>
                  </label>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address override (overrides show address line on pamphlet)"
                    className={`${inputCls} mb-2`}
                  />
                  <input
                    type="text"
                    value={doorsOpen}
                    onChange={(e) => setDoorsOpen(e.target.value)}
                    placeholder="Doors open override (e.g. Doors open at 7:30PM both nights)"
                    className={`${inputCls} mb-3`}
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-1.5">
                    <input
                      type="checkbox"
                      checked={showDoors}
                      onChange={(e) => setShowDoors(e.target.checked)}
                      className="rounded"
                    />
                    <span>Show door times on pamphlet</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={showQr}
                      onChange={(e) => setShowQr(e.target.checked)}
                      className="rounded"
                    />
                    <span>Show QR code on pamphlet</span>
                  </label>
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
                              {formatMonthDay(g.show!.date)} &middot; {g.show!.city},{" "}
                              {g.show!.region}
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
                        onClick={() =>
                          setPlaceholders((prev) => [...prev, { date: "", label: "" }])
                        }
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
                          onClick={() =>
                            setPlaceholders((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-colors px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 p-6 pt-4">
              {saveError && <div className="text-sm text-red-500 mb-2">{saveError}</div>}
              {!isSingle && total === 0 ? (
                <div className="text-center text-sm px-3 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                  Select at least one show
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    disabled={downloading}
                    className="shrink-0 text-center text-base font-semibold tracking-tight px-4 py-3.5 rounded-lg border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-500 dark:hover:border-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 text-center text-base font-semibold tracking-tight px-4 py-3.5 rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 active:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {downloading ? "Downloading…" : "Download"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview — flush, full viewport height */}
          <div className="flex-1 flex justify-end overflow-hidden bg-[#0a0a0a]">
              {isSingle && soloShow ? (
                <Poster
                  date={soloShow.date}
                  city={soloShow.city}
                  region={soloShow.region}
                  doorTime={soloShow.doorTime}
                  doorLabel={doorLabels[soloSlug] || null}
                  venue={soloShow.venue}
                  venueLabel={venueLabels[soloSlug] || null}
                  address={soloShow.address}
                  taglineSuffix={tagline}
                  tags={tags}
                  venueImg={venueImg}
                  venueImgWidth={Number(venueImgWidth) || undefined}
                  taglineAlign={taglineAlign}
                  showQr
                  debug
                />
              ) : (
                <PamphletPreviewFrame src={previewSrc} />
              )}
          </div>
        </div>
      )}
      {variant === "card" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center text-sm px-3 py-2.5 text-[#d4a553] hover:bg-[#d4a553]/5 dark:hover:bg-[#d4a553]/10 transition-colors"
        >
          Poster
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <span className="text-xs tracking-widest text-neutral-500 uppercase">
            {isSingle ? "Poster" : "Pamphlet"}
          </span>
          <span>
            {matchedPamphlet?.label || matchedPamphlet?.id || label}
            {!isSingle && ` · ${group.length} shows`}
          </span>
        </button>
      )}
    </>
  );
}

function ShowGroupCard({
  group,
  pamphlets,
  onUpdateSponsor,
  onRemoveSponsor,
  onShowUpdate,
  onPamphletCascade,
}: {
  group: ShowGroup;
  pamphlets: Pamphlet[];
  onUpdateSponsor: (updated: Sponsor) => void;
  onRemoveSponsor: (submittedAt: string, showSlug?: string | null) => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
  onPamphletCascade: (deletedSlug: string) => void;
}) {
  const { show, host, supporters } = group;
  const [editingHost, setEditingHost] = useState(false);
  const [viewingSupporters, setViewingSupporters] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState<Sponsor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [confirmAccess, setConfirmAccess] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSchedule, setEmailSchedule] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [emailRecipientCount, setEmailRecipientCount] = useState<number | null>(null);
  const [rsvpCounts, setRsvpCounts] = useState<{ responses: number; attending: number } | null>(
    null,
  );
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [emailSentSlugs, setEmailSentSlugs] = useState<Set<string>>(new Set());
  const [dateValue, setDateValue] = useState(show?.date ?? host.date ?? "");
  const [editingDate, setEditingDate] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateSave = useDebouncedSave(show, onShowUpdate);

  useEffect(() => {
    if (!group.showSlug) return;
    fetch("/api/rsvp")
      .then((r) => r.json())
      .then((counts) => {
        const c = counts[group.showSlug];
        setRsvpCounts(c || null);
      })
      .catch(() => setRsvpCounts(null));
  }, [group.showSlug]);

  const debounceSaveDate = (newDate: string) => {
    if (!newDate) return;
    dateSave.save({ date: newDate });
  };

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
        fetch("/api/rsvp", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: group.showSlug }),
        }),
      ]);
      await fetch("/api/shows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: group.showSlug }),
      });
      const orphaned = pamphlets.filter(
        (p) => p.shows.length === 1 && p.shows[0].slug === group.showSlug,
      );
      await Promise.all(
        orphaned.map((p) =>
          fetch("/api/pamphlets", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id }),
          }),
        ),
      );
      onPamphletCascade(group.showSlug);
    }
    onRemoveSponsor(host.submittedAt, host.showSlug);
    for (const s of supporters) onRemoveSponsor(s.submittedAt, s.showSlug);
  };

  const location = [host.venue || host.address, host.city, host.region].filter(Boolean).join(", ");

  return (
    <>
      {editingHost && (
        <Modal
          onClose={() => setEditingHost(false)}
          title={host.showSlug ? `AMEND SPONSOR · ${host.showSlug}` : "AMEND SPONSOR"}
        >
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
        </Modal>
      )}
      {viewingSupporters && (
        <Modal
          onClose={() => {
            setViewingSupporters(false);
            setEditingSupporter(null);
          }}
          header={
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                {editingSupporter ? "AMEND SUPPORTER" : `SUPPORTERS (${supporters.length})`}
              </h4>
              <button
                onClick={() => {
                  if (editingSupporter) setEditingSupporter(null);
                  else setViewingSupporters(false);
                }}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                {editingSupporter ? "← Back" : "✕"}
              </button>
            </div>
          }
        >
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
                    {s.name && s.email && <span className="text-neutral-500 ml-2">{s.email}</span>}
                  </div>
                  {s.items.length > 0 && (
                    <div className="text-xs text-neutral-500 mt-0.5">{s.items.join(" · ")}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
      {emailOpen && (
        <Modal
          onClose={() => {
            setEmailOpen(false);
            setEmailConfirming(false);
          }}
          title={
            <>
              EMAIL RSVPS
              {emailRecipientCount !== null && (
                <span className="ml-2 text-neutral-500">({emailRecipientCount} recipients)</span>
              )}
            </>
          }
        >
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => {
              setEmailSubject(e.target.value);
              setEmailConfirming(false);
            }}
            placeholder="Subject"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 mb-3 focus:outline-none focus:border-neutral-400"
          />
          <textarea
            value={emailBody}
            onChange={(e) => {
              setEmailBody(e.target.value);
              setEmailConfirming(false);
            }}
            placeholder="Body (links like peytspencer.com/listen will auto-link)"
            rows={8}
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 mb-3 focus:outline-none focus:border-neutral-400 resize-y"
          />
          <input
            type="datetime-local"
            value={emailSchedule}
            onChange={(e) => {
              setEmailSchedule(e.target.value);
              setEmailConfirming(false);
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white mb-3 focus:outline-none focus:border-neutral-400"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {emailSchedule
                ? `Scheduled: ${new Date(emailSchedule).toLocaleString()} ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
                : "Sends immediately"}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                onClick={async () => {
                  setEmailSending(true);
                  setEmailResult(null);
                  const res = await fetch("/api/show-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      slug: group.showSlug,
                      subject: emailSubject,
                      body: emailBody,
                      test: true,
                    }),
                  });
                  const data = await res.json();
                  setEmailSending(false);
                  setEmailResult(res.ok ? "Test sent to you" : data.error || "Failed");
                }}
                className="px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
              >
                Test
              </button>
              {emailConfirming ? (
                <button
                  disabled={emailSending}
                  onClick={async () => {
                    setEmailSending(true);
                    setEmailResult(null);
                    const sendAt = emailSchedule
                      ? Math.floor(new Date(emailSchedule).getTime() / 1000)
                      : undefined;
                    const res = await fetch("/api/show-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        slug: group.showSlug,
                        subject: emailSubject,
                        body: emailBody,
                        sendAt,
                      }),
                    });
                    const data = await res.json();
                    setEmailSending(false);
                    setEmailConfirming(false);
                    if (res.ok) {
                      setEmailResult(`Sent to ${data.sent} of ${data.total}`);
                      setEmailSentSlugs((prev) => new Set(prev).add(group.showSlug));
                    } else {
                      setEmailResult(data.error || "Failed");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {emailSending ? "Sending..." : `Confirm ${emailSchedule ? "Schedule" : "Send"}`}
                </button>
              ) : (
                <button
                  disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                  onClick={() => setEmailConfirming(true)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  {emailSchedule ? "Schedule" : "Send"}
                </button>
              )}
            </div>
          </div>
          {emailSentSlugs.has(group.showSlug) && !emailResult && (
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-500">
              You already sent an email for this show in this session
            </div>
          )}
          {emailResult && <div className="mt-3 text-xs text-neutral-500">{emailResult}</div>}
        </Modal>
      )}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 overflow-hidden transition-all h-full flex flex-col">
        <div className="flex flex-1">
          <div className="flex-1 min-w-0 p-5 flex flex-col justify-center gap-3">
            <div>
              {show?.slug ? (
                <div className="flex items-center gap-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDate(true);
                      requestAnimationFrame(() => {
                        dateInputRef.current?.focus();
                        dateInputRef.current?.showPicker?.();
                      });
                    }}
                    className="text-base text-neutral-900 dark:text-white font-medium hover:text-[#d4a553] dark:hover:text-[#e0b860] transition-colors"
                  >
                    {dateValue ? formatEventDate(dateValue) : "No date"}
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dateValue}
                    onChange={(e) => {
                      setDateValue(e.target.value);
                      debounceSaveDate(e.target.value);
                    }}
                    onBlur={() => setEditingDate(false)}
                    className={`absolute left-0 top-0 ${editingDate ? "opacity-0 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    tabIndex={-1}
                  />
                  {dateSave.state === "saving" && (
                    <CircleNotchIcon size={14} className="text-neutral-500 animate-spin" />
                  )}
                  {dateSave.state === "saved" && (
                    <CheckCircleIcon size={14} weight="fill" className="text-green-500" />
                  )}
                </div>
              ) : (
                <p className="text-base text-neutral-900 dark:text-white font-medium">
                  {host.date ? formatEventDate(host.date) : "No date"}
                </p>
              )}
              {location && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{location}</p>
              )}
              {rsvpCounts && (
                <p className="text-xs text-neutral-500 mt-1">
                  {rsvpCounts.responses} responses &middot; {rsvpCounts.attending} attending
                </p>
              )}
            </div>

          </div>

          <div className="shrink-0 flex flex-col border-l border-neutral-200 dark:border-neutral-800 w-28">
            <button
              disabled
              title="PDF renovating"
              className="flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
            >
              PDF
            </button>
            {show?.slug &&
              (confirmAccess ? (
                <div className="flex items-center justify-center gap-1 text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={async () => {
                      const next = show.access === "private" ? "public" : "private";
                      onShowUpdate(show.slug, { access: next });
                      setConfirmAccess(false);
                      await fetch("/api/shows", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ slug: show.slug, access: next }),
                      });
                    }}
                    className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                  >
                    {show.access === "private" ? "Make Public" : "Make Private"}
                  </button>
                  <span className="text-neutral-300 dark:text-neutral-700">/</span>
                  <button
                    onClick={() => setConfirmAccess(false)}
                    className="text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAccess(true)}
                  className={`flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 transition-colors ${
                    show.access === "private"
                      ? "text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {show.access === "private" ? "Private" : "Public"}
                </button>
              ))}
            {supporters.length > 0 && (
              <button
                onClick={() => setViewingSupporters(true)}
                className="flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                +{supporters.length}
              </button>
            )}
            <button
              onClick={() => setEditingHost(true)}
              className="flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Amend
            </button>
            <button
              onClick={() => {
                setEmailOpen(true);
                setEmailResult(null);
                setEmailConfirming(false);
                fetch("/api/rsvp")
                  .then((r) => r.json())
                  .then((counts) => {
                    const c = counts[group.showSlug];
                    setEmailRecipientCount(c?.responses || 0);
                    setRsvpCounts(c || null);
                  })
                  .catch(() => {
                    setEmailRecipientCount(null);
                    setRsvpCounts(null);
                  });
              }}
              className="flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Email
            </button>
            <button
              onClick={() => {
                setConfirmDelete(true);
                setDeleteInput("");
              }}
              className="flex items-center justify-center text-sm px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Delete
            </button>
            {show?.slug ? (
              <PosterEditor
                group={[group]}
                matchedPamphlet={null}
                onPamphletSaved={() => {}}
                onShowUpdate={onShowUpdate}
                variant="card"
              />
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
        {confirmDelete && (
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            {rsvpCounts && rsvpCounts.responses > 0 && !emailSentSlugs.has(group.showSlug) && (
              <div className="px-5 pt-3 text-xs text-amber-600 dark:text-amber-500">
                ⚠ {rsvpCounts.responses} RSVP{rsvpCounts.responses === 1 ? "" : "s"} not yet
                notified. Send a cancel email first.
              </div>
            )}
            <div className="flex gap-2 items-center px-5 py-3">
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
          </div>
        )}
      </div>
    </>
  );
}
