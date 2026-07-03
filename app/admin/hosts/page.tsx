"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  CircleNotchIcon,
  CheckCircleIcon,
  TextAlignLeftIcon,
  TextAlignJustifyIcon,
  DownloadSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import SponsorForm from "../../components/SponsorForm";
import Poster, { type PamphletShowItem } from "../../components/Poster";
import { type Show, isShowDraft, isShowListed } from "../../lib/shows";
import { PAYMENT_MODEL } from "../../lib/flights";
import { type Pamphlet, type PamphletShow } from "../../lib/pamphlets";
import { type Leg, type PamphletFacet, FUND_LEGS } from "../../fund/legs";
import projectsData from "../../../data/projects.json";
import LegsManager from "../LegsManager";
import BookingLoop from "../BookingLoop";
import { areRegionsAdjacent } from "../../lib/region-adjacency";
import {
  formatEventDate,
  formatEventDateShort,
  formatMonthDay,
  formatDayMonthDay,
  isDatePast,
} from "../../lib/dates";
import { buildZip } from "../../lib/zip";
import { useDebouncedSave } from "../../hooks/useDebouncedSave";
import { PAY_WHAT_YOU_WANT_TAG, DEFAULT_TAGLINE } from "../../lib/poster-defaults";
import {
  type PosterFormat,
  PAMPHLET_PREVIEW_FORMATS,
  POSTER_PREVIEW_FORMATS,
} from "../../lib/poster-formats";

const WEEKDAY_PREFIXES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_PREFIXES = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];
const WEEKDAY_RE = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i;
const MONTH_DAY_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(\s+)(\d{1,2})\b/i;
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

function dateMisaligned(input: string, iso: string): boolean {
  const text = input.trim().toLowerCase();
  if (!text || !iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const wd = text.match(WEEKDAY_RE);
  if (wd && WEEKDAY_PREFIXES.indexOf(wd[1].slice(0, 3)) !== d.getDay()) return true;
  const md = text.match(MONTH_DAY_RE);
  if (md) {
    if (MONTH_PREFIXES.indexOf(md[1].slice(0, 3)) !== d.getMonth()) return true;
    if (parseInt(md[3], 10) !== d.getDate()) return true;
  } else {
    const mo = text.match(MONTH_RE);
    if (mo && MONTH_PREFIXES.indexOf(mo[1].slice(0, 3)) !== d.getMonth()) return true;
  }
  return false;
}

function realignDate(input: string, iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return input;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = String(d.getDate());
  return input
    .replace(WEEKDAY_RE, weekday)
    .replace(MONTH_DAY_RE, `${month}$2${day}`);
}

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
                aria-label="Close"
                className="-m-2 flex h-11 w-11 items-center justify-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
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

// A full-width pressable row whose entire hit area toggles the switch.
function ToggleRow({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={className}
    >
      <span className="text-neutral-800 dark:text-neutral-200">{label}</span>
      <span
        aria-hidden
        className={`relative shrink-0 h-6 w-10 rounded-full transition-colors ${
          checked ? "bg-[#d4a553]" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

// Single source of truth for a show's lifecycle status: label + color tone.
// Read by the manage modal's pulse and the card badge so they never disagree.
type StatusTone = "neutral" | "amber" | "sky" | "green";

const STATUS_TONE: Record<StatusTone, { dot: string; text: string; pill: string }> = {
  neutral: {
    dot: "bg-neutral-400",
    text: "text-neutral-400",
    pill: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
  },
  amber: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  },
  sky: {
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    pill: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400",
  },
  green: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    pill: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
  },
};

function getShowStatus(show?: Show | null): { label: string; tone: StatusTone } {
  if (!show?.slug) return { label: "No show", tone: "neutral" };
  if (isShowDraft(show)) return { label: "Draft", tone: "sky" };
  if (show.visibility === "private") return { label: "Private", tone: "amber" };
  return { label: "Public", tone: "green" };
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

const ADMIN_NAV = [
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/catalog", label: "Catalog" },
];

export default function HostsAdminPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = (withSpinner: boolean) => {
      Promise.all([
        fetch("/api/shows")
          .then((r) => r.json())
          .catch(() => []),
        fetch("/api/sponsors")
          .then((r) => r.json())
          .catch(() => []),
        fetch("/api/legs")
          .then((r) => r.json())
          .catch(() => []),
      ])
        .then(([showsData, sponsorsData, legsData]) => {
          if (cancelled) return;
          setShows(Array.isArray(showsData) ? showsData : []);
          setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
          setLegs(Array.isArray(legsData) ? legsData : []);
        })
        .catch(() => !cancelled && setMessage({ type: "error", text: "Failed to load data" }))
        .finally(() => !cancelled && withSpinner && setLoading(false));
    };
    load(true);
    // Re-fetch when the tab regains focus so host confirmations show up without a manual reload.
    const refresh = () => document.visibilityState === "visible" && load(false);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (message?.type !== "success") return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

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

  // Group shows by their explicit leg (Show.leg). Shows without a leg are left
  // out here and surface in the ungrouped buckets below.
  const groupIntoLegs = (items: ShowGroup[]): ShowGroup[][] => {
    const byLeg = new Map<string, ShowGroup[]>();
    for (const g of items) {
      const leg = g.show?.leg;
      if (!g.show?.date || !leg) continue;
      if (!byLeg.has(leg)) byLeg.set(leg, []);
      byLeg.get(leg)!.push(g);
    }
    const legs: ShowGroup[][] = [...byLeg.values()].map((leg) =>
      leg.sort((a, b) => new Date(a.show!.date).getTime() - new Date(b.show!.date).getTime()),
    );
    legs.sort(
      (a, b) => new Date(a[0].show!.date).getTime() - new Date(b[0].show!.date).getTime(),
    );
    return legs;
  };

  // Adjacency + date heuristic, kept only as a *suggestion* for ungrouped shows.
  // Standalone shows opt out. Returns clusters of 2+ worth proposing as a leg.
  const suggestLegs = (items: ShowGroup[]): ShowGroup[][] => {
    const chainable = items.filter((g) => g.show?.slug && g.show?.date && !g.show!.standalone);
    const n = chainable.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = chainable[i].show!;
        const b = chainable[j].show!;
        const diffDays =
          Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / 86400000;
        const sameRegion = a.region === b.region;
        if (
          (sameRegion || areRegionsAdjacent(a.region, b.region)) &&
          diffDays <= (sameRegion ? 21 : 7)
        ) {
          parent[find(i)] = find(j);
        }
      }
    }
    const buckets = new Map<number, ShowGroup[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!buckets.has(root)) buckets.set(root, []);
      buckets.get(root)!.push(chainable[i]);
    }
    return [...buckets.values()]
      .filter((c) => c.length >= 2)
      .map((c) =>
        c.sort((a, b) => new Date(a.show!.date).getTime() - new Date(b.show!.date).getTime()),
      );
  };

  // Parked shows (cancelled, awaiting a new date) sit in their own section, off the
  // live schedule and out of Completed, so their poster survives for reuse.
  const upcoming = groups
    .filter((g) => g.host.date && !isDatePast(g.host.date))
    .sort((a, b) => new Date(a.host.date!).getTime() - new Date(b.host.date!).getTime());

  const pamphletGroups = groupIntoLegs(upcoming);

  // Drafts never belong in Completed — they never happened.
  const past = groups
    .filter(
      (g) => !(g.show && isShowDraft(g.show)) && (!g.host.date || isDatePast(g.host.date)),
    )
    .sort(
      (a, b) => new Date(b.host.date ?? "0").getTime() - new Date(a.host.date ?? "0").getTime(),
    );

  // Drafts whose proposed date already passed — including shows reverted to draft
  // for rescheduling. Kept (never auto-deleted) so the poster survives for reuse,
  // and surfaced under Unscheduled so they stay reachable to re-date or delete.
  const staleDrafts = groups
    .filter((g) => g.show && isShowDraft(g.show) && g.host.date && isDatePast(g.host.date))
    .sort(
      (a, b) => new Date(b.host.date ?? "0").getTime() - new Date(a.host.date ?? "0").getTime(),
    );

  const pastLegs = groupIntoLegs(past);
  const pastGrouped = new Set(pastLegs.flat().map((g) => g.showSlug));
  const pastUngrouped = past.filter((g) => !pastGrouped.has(g.showSlug));

  const assignShow = (slug: string, leg: string | null) => {
    setShows((prev) => prev.map((s) => (s.slug === slug ? { ...s, leg } : s)));
    fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, leg }),
    });
  };

  const createLeg = async (slug: string) => {
    setLegs((prev) => (prev.some((l) => l.slug === slug) ? prev : [...prev, { slug }]));
    await fetch("/api/legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  };

  const acceptSuggestion = async (cluster: ShowGroup[]) => {
    const raw = window.prompt("New leg slug for these shows (e.g. socal)") ?? "";
    const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!slug) return;
    if (!legs.some((l) => l.slug === slug)) await createLeg(slug);
    cluster.forEach((g) => g.show?.slug && assignShow(g.show.slug, slug));
  };

  const cardProps = {
    legs,
    onCreateLeg: createLeg,
    onMessage: (text: string) => setMessage({ type: "success", text }),
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
  };

  const grouped = new Set(pamphletGroups.flat().map((g) => g.showSlug));
  const ungrouped = upcoming.filter((g) => !grouped.has(g.showSlug));
  // Solo = confirmed shows with no leg (own poster). Unscheduled = drafts, plus
  // past-dated ones (e.g. reverted for rescheduling) so they stay reachable.
  const solo = ungrouped.filter((g) => g.show && !isShowDraft(g.show));
  const unscheduled = [
    ...ungrouped.filter((g) => !g.show || isShowDraft(g.show)),
    ...staleDrafts,
  ];
  const suggested = suggestLegs(solo);

  const handlePamphletSaved = (slug: string, pamphlet: PamphletFacet) => {
    setLegs((prev) =>
      prev.some((l) => l.slug === slug)
        ? prev.map((l) => (l.slug === slug ? { ...l, pamphlet } : l))
        : [...prev, { slug, pamphlet }],
    );
  };

  // Adapt a leg's pamphlet facet to the Pamphlet shape the editor reads.
  const legPamphlet = (slug: string): Pamphlet | null => {
    const pf = legs.find((l) => l.slug === slug)?.pamphlet;
    if (!pf) return null;
    return {
      id: slug,
      label: pf.label,
      showDoors: pf.showDoors,
      showQr: pf.showQr,
      pinTopRsvp: pf.pinTopRsvp,
      tags: pf.tags,
      venueImg: pf.venueImg,
      venueImgWidth: pf.venueImgWidth,
      venueImgOffsetY: pf.venueImgOffsetY,
      centerLogo: pf.centerLogo,
      taglineAlign: pf.taglineAlign,
      doorsOpen: pf.doorsOpen,
      scale: pf.scale,
      shows: Object.entries(pf.shows ?? {}).map(([s, o]) => ({ slug: s, ...o })),
    };
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-900 dark:text-white">
            Admin
          </h1>
          <nav className="flex items-center gap-2">
            {ADMIN_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        {message && (
          <div
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm border shadow-lg ${
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
            <BookingLoop />
            <LegsManager
              legs={legs}
              shows={shows}
              setLegs={setLegs}
              assignShow={assignShow}
              onMessage={(type, text) => setMessage({ type, text })}
            />
            {upcoming.length > 0 && (
              <div className="mb-16">
                <div className="flex items-baseline justify-between mb-8">
                  <h2 className="text-lg font-medium tracking-[0.15em] text-neutral-900 dark:text-white uppercase">
                    Upcoming
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/pending"
                      className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
                    >
                      Invite host
                    </Link>
                    <CustomPosterButton />
                    <BlankPamphletButton />
                  </div>
                </div>
                <div className="space-y-10">
                  {pamphletGroups.map((cluster, i) => {
                    const matched = legPamphlet(cluster[0]?.show?.leg ?? "");
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
                  {solo.length > 0 && (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-xs tracking-[0.15em] text-neutral-500 uppercase shrink-0">
                          Solo
                        </span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                      {suggested.length > 0 && (
                        <div className="mb-4 rounded-lg border border-dashed border-[#d4a553]/40 p-3 space-y-2">
                          <div className="text-xs uppercase tracking-wider text-[#d4a553]">
                            Suggested legs
                          </div>
                          {suggested.map((cluster, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-sm text-neutral-700 dark:text-neutral-300">
                                {cluster
                                  .map((g) => `${formatMonthDay(g.show!.date)} ${g.show!.city}`)
                                  .join(" · ")}
                              </span>
                              <button
                                onClick={() => acceptSuggestion(cluster)}
                                className="shrink-0 rounded-lg border border-[#d4a553]/50 px-3 py-1.5 text-xs text-[#d4a553] transition-colors hover:bg-[#d4a553]/10"
                              >
                                Group into a leg
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                        {solo.map((g) => (
                          <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                        ))}
                      </div>
                    </div>
                  )}
                  {unscheduled.length > 0 && (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-xs tracking-[0.15em] text-neutral-500 uppercase shrink-0">
                          Unscheduled
                        </span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                        {unscheduled.map((g) => (
                          <ShowGroupCard key={g.showSlug} group={g} {...cardProps} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <CompletedSection legs={pastLegs} ungrouped={pastUngrouped} />
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
}: {
  legs: ShowGroup[][];
  ungrouped: ShowGroup[];
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
          const legName = sorted[0].show!.leg?.replace(/-/g, " ");

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
  const [taglineSuffix, setTaglineSuffix] = useState(DEFAULT_TAGLINE);
  const [tags, setTags] = useState(PAY_WHAT_YOU_WANT_TAG);
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
                  placeholder="Tagline"
                  rows={3}
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
  onPamphletSaved: (slug: string, pamphlet: PamphletFacet) => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
  variant: "card" | "leg" | "drawer";
}) {
  const isSingle = group.length === 1;
  const soloShow = group[0].show;

  const defaultLoc = (s: Show) =>
    s.venueLabel || `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const defaultDoorsText = (s: Show) =>
    s.doorLabel || (s.doorTime ? `Doors open at ${s.doorTime}` : "");
  const defaultDateText = (s: Show) => formatEventDateShort(s.date);
  // "" = explicitly cleared (drop the line); undefined = unchanged (fall back to default).
  const normOverride = (val: string, def: string): string | undefined => {
    const t = val.trim();
    return t === "" ? "" : t === def ? undefined : t;
  };

  const [open, setOpen] = useState(false);
  const [legId, setLegId] = useState(matchedPamphlet?.id ?? group[0]?.show?.leg ?? "");
  const [tagline, setTagline] = useState(
    isSingle ? (soloShow?.taglineSuffix ?? DEFAULT_TAGLINE) : (matchedPamphlet?.label ?? DEFAULT_TAGLINE),
  );
  const [showDoors, setShowDoors] = useState(matchedPamphlet?.showDoors ?? false);
  const [showQr, setShowQr] = useState(matchedPamphlet?.showQr ?? false);
  const [pinTopRsvp, setPinTopRsvp] = useState(matchedPamphlet?.pinTopRsvp ?? true);
  const [tags, setTags] = useState(
    isSingle
      ? (soloShow?.tags ?? PAY_WHAT_YOU_WANT_TAG)
      : (matchedPamphlet?.tags ?? PAY_WHAT_YOU_WANT_TAG),
  );
  const [venueImg, setVenueImg] = useState(
    isSingle ? (soloShow?.venueImg ?? "") : (matchedPamphlet?.venueImg ?? ""),
  );
  const [venueImgWidth, setVenueImgWidth] = useState(() => {
    const w = isSingle ? soloShow?.venueImgWidth : matchedPamphlet?.venueImgWidth;
    return w ? String(w) : "";
  });
  const [committedImgWidth, setCommittedImgWidth] = useState(() => {
    const w = isSingle ? soloShow?.venueImgWidth : matchedPamphlet?.venueImgWidth;
    return w ? String(w) : "";
  });
  const initOffsetY = isSingle ? soloShow?.venueImgOffsetY : matchedPamphlet?.venueImgOffsetY;
  const [venueImgOffsetY, setVenueImgOffsetY] = useState(initOffsetY ? String(initOffsetY) : "");
  const [committedOffsetY, setCommittedOffsetY] = useState(initOffsetY ? String(initOffsetY) : "");
  const [taglineAlign, setTaglineAlign] = useState<"justify" | "left">(() => {
    const a = isSingle ? soloShow?.taglineAlign : matchedPamphlet?.taglineAlign;
    return a === "justify" ? "justify" : "left";
  });
  const [scale, setScale] = useState(matchedPamphlet?.scale ?? 1);
  const perShow = (
    read: (ps: PamphletShow | undefined, show: Show) => string,
  ): Record<string, string> =>
    Object.fromEntries(
      group.map((g) => [
        g.show!.slug,
        read(
          matchedPamphlet?.shows.find((s) => s.slug === g.show!.slug),
          g.show!,
        ),
      ]),
    );
  const [dateLabels, setDateLabels] = useState<Record<string, string>>(() =>
    perShow((ps, s) => ps?.dateLabel ?? (isSingle ? "" : defaultDateText(s))),
  );
  const [doorsByShow, setDoorsByShow] = useState<Record<string, string>>(() =>
    perShow((ps, s) => ps?.doorsOpen ?? (isSingle ? "" : defaultDoorsText(s))),
  );
  const [venueLabels, setVenueLabels] = useState<Record<string, string>>(() =>
    perShow((ps, s) => ps?.venueLabel ?? (isSingle ? (s.venueLabel ?? "") : defaultLoc(s))),
  );
  const [doorLabels, setDoorLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.map((g) => [g.show!.slug, g.show!.doorLabel ?? ""])),
  );
  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    if (matchedPamphlet) {
      const savedSlugs = new Set(matchedPamphlet.shows.map((s) => s.slug));
      return Object.fromEntries(group.map((g) => [g.show!.slug, savedSlugs.has(g.show!.slug)]));
    }
    return Object.fromEntries(group.map((g) => [g.show!.slug, isShowListed(g.show!)]));
  });
  const [placeholders, setPlaceholders] = useState<{ date: string; label: string }[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [dateFocus, setDateFocus] = useState<string | null>(null);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");
  const [centerLogo, setCenterLogo] = useState(
    isSingle ? (soloShow?.centerLogo ?? false) : (matchedPamphlet?.centerLogo ?? false),
  );
  const [privateNote, setPrivateNote] = useState(soloShow?.privateNote ?? "");
  const [previewFormat, setPreviewFormat] = useState<PosterFormat>(isSingle ? "standard" : "print");
  const previewRef = useRef<HTMLDivElement>(null);

  // Live logo nudge — write width/offset straight to the logo node so a drag
  // moves only the logo, not a full Poster re-render. State commits on release.
  const liveLogo = (widthStr: string, offsetStr: string) => {
    const w = Number(widthStr);
    const o = Number(offsetStr);
    previewRef.current?.querySelectorAll<HTMLElement>("[data-logo]").forEach((el) => {
      el.style.width = widthStr.trim() && w ? `${(w * 100) / 480}cqw` : "";
      el.style.height = widthStr.trim() && w ? "auto" : "";
      el.style.maxWidth = widthStr.trim() && w ? "none" : "";
      el.style.transform = offsetStr.trim() && o ? `translateY(${(o * 100) / 480}cqw)` : "";
    });
  };

  const first = group[0].show!;
  const last = group[group.length - 1].show!;
  const label = isSingle
    ? formatMonthDay(first.date)
    : `${formatMonthDay(first.date)} – ${formatMonthDay(last.date)}`;

  const activeGroup = useMemo(
    () => group.filter((g) => included[g.show!.slug]),
    [group, included],
  );
  const previewShows = useMemo(
    () =>
      activeGroup.map(
        (g): PamphletShowItem => ({
          date: g.show!.date,
          city: g.show!.city,
          region: g.show!.region,
          venue: g.show!.venue,
          venueLabel: venueLabels[g.show!.slug] || undefined,
          dateLabel: dateLabels[g.show!.slug] || undefined,
          doorsOpen: doorsByShow[g.show!.slug] || undefined,
          doorTime: g.show!.doorTime,
          doorLabel: g.show!.doorLabel,
        }),
      ),
    [activeGroup, venueLabels, dateLabels, doorsByShow],
  );

  const buildPamphletShows = (): PamphletShow[] =>
    activeGroup.map((g) => {
      const s = g.show!;
      const slug = s.slug;
      const entry: PamphletShow = { slug };
      const vl = normOverride(venueLabels[slug] ?? "", defaultLoc(s));
      const dl = normOverride(dateLabels[slug] ?? "", defaultDateText(s));
      const dr = normOverride(doorsByShow[slug] ?? "", defaultDoorsText(s));
      if (vl !== undefined) entry.venueLabel = vl;
      if (dl !== undefined) entry.dateLabel = dl;
      if (dr !== undefined) entry.doorsOpen = dr;
      return entry;
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
      if (!pinTopRsvp) params.set("pinTopRsvp", "0");
      params.set("centerLogo", centerLogo ? "1" : "0");
      if (tags.trim()) params.set("tags", tags);
      if (tagline.trim()) params.set("label", tagline.trim());
      if (venueImg.trim()) params.set("venueImg", venueImg.trim());
      if (venueImgWidth.trim()) params.set("venueImgW", venueImgWidth.trim());
      if (venueImgOffsetY.trim()) params.set("venueImgOffsetY", venueImgOffsetY.trim());
      params.set("align", taglineAlign);
      if (scale !== 1) params.set("scale", String(scale));
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
      const s = g.show!;
      const slug = s.slug;
      const vl = normOverride(venueLabels[slug] ?? "", defaultLoc(s));
      const dl = normOverride(dateLabels[slug] ?? "", defaultDateText(s));
      const dr = normOverride(doorsByShow[slug] ?? "", defaultDoorsText(s));
      if (vl !== undefined) params.set(`vl_${slug}`, vl);
      if (dl !== undefined) params.set(`dt_${slug}`, dl);
      if (dr !== undefined) params.set(`do_${slug}`, dr);
    }
    appendPlaceholders(params);
    return `/api/pamphlet?${params.toString()}`;
  };

  const savePamphlet = async (): Promise<boolean> => {
    const id = legId.trim();
    if (!id) return true;
    setSaveError("");
    const pamphlet: PamphletFacet = {
      label: tagline.trim() || undefined,
      showDoors,
      showQr,
      pinTopRsvp,
      tags: tags.trim() || undefined,
      venueImg: venueImg.trim() || undefined,
      venueImgWidth: Number(venueImgWidth) || undefined,
      venueImgOffsetY: Number(venueImgOffsetY) || undefined,
      centerLogo,
      taglineAlign,
      scale: scale !== 1 ? scale : undefined,
      shows: Object.fromEntries(buildPamphletShows().map(({ slug, ...rest }) => [slug, rest])),
    };
    let res = await fetch("/api/legs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: id, pamphlet }),
    });
    if (res.status === 404) {
      res = await fetch("/api/legs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: id, pamphlet }),
      });
    }
    if (!res.ok) {
      setSaveError("Failed to save");
      return false;
    }
    onPamphletSaved(id, pamphlet);
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

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
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
    if (venueImgOffsetY.trim()) params.set("venueImgOffsetY", venueImgOffsetY.trim());
    params.set("centerLogo", centerLogo ? "1" : "0");
    params.set("align", taglineAlign);
    // Always sent so a download reflects the editor exactly, even unsaved.
    params.set("venueLabel", venueLabels[soloShow!.slug] ?? "");
    params.set("doorLabel", doorLabels[soloShow!.slug] ?? "");
    if (asJpg) params.set("jpg", "true");
    return `/api/poster/${soloShow!.slug}?${params.toString()}`;
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
      venueImgOffsetY: Number(venueImgOffsetY) || null,
      centerLogo,
      privateNote: privateNote.trim() || null,
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
        const pdfFmts = ["print", "ig", "yt", "eb"] as const;
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

  // Download just the format currently shown in the preview.
  const downloadOne = async (fmt: PosterFormat) => {
    setDownloading(true);
    try {
      const jpg = fmt === "fb" || fmt === "fbe";
      const ext = jpg ? "jpg" : "pdf";
      if (isSingle) {
        const slug = soloShow!.slug;
        const res = await fetch(buildPosterHref(fmt, jpg));
        const suffix = fmt === "standard" ? "" : `-${fmt}`;
        downloadBlob(await res.blob(), `poster-${slug}${suffix}.${ext}`);
      } else {
        const name = legId.trim() || first.date;
        const res = await fetch(buildPamphletHref(fmt, !jpg, true));
        downloadBlob(await res.blob(), `pamphlet-${name}-${fmt}.${ext}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  // Reset poster styling to defaults — auto-save then persists the cleared state.
  const handleReset = () => {
    setTags(PAY_WHAT_YOU_WANT_TAG);
    setTagline("");
    setTaglineAlign("left");
    setVenueImg("");
    setVenueImgWidth("");
    setCommittedImgWidth("");
    setVenueImgOffsetY("");
    setCommittedOffsetY("");
    setCenterLogo(false);
    liveLogo("", "");
    setDoorLabels(Object.fromEntries(group.map((g) => [g.show!.slug, ""])));
    if (isSingle) {
      setVenueLabels(Object.fromEntries(group.map((g) => [g.show!.slug, ""])));
    } else {
      setVenueLabels(Object.fromEntries(group.map((g) => [g.show!.slug, defaultLoc(g.show!)])));
      setDateLabels(Object.fromEntries(group.map((g) => [g.show!.slug, defaultDateText(g.show!)])));
      setDoorsByShow(
        Object.fromEntries(group.map((g) => [g.show!.slug, defaultDoorsText(g.show!)])),
      );
      setScale(1);
      setShowDoors(false);
      setShowQr(false);
      setPinTopRsvp(true);
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

  const prevVenueImg = useRef(venueImg);
  useEffect(() => {
    const was = prevVenueImg.current.trim();
    const now = venueImg.trim();
    prevVenueImg.current = venueImg;
    if (!was && now) {
      setTagline((prev) => {
        const lines = prev.split("\n");
        const last = lines[lines.length - 1];
        if (!last.endsWith(" at")) lines[lines.length - 1] = last + " at";
        return lines.join("\n");
      });
    }
  }, [venueImg]);

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
    venueImgOffsetY,
    centerLogo,
    privateNote,
    scale,
    showDoors,
    showQr,
    pinTopRsvp,
    legId,
    JSON.stringify(venueLabels),
    JSON.stringify(dateLabels),
    JSON.stringify(doorsByShow),
    JSON.stringify(doorLabels),
    JSON.stringify(included),
    JSON.stringify(placeholders),
  ]);


  const total = activeGroup.length + placeholders.filter((p) => p.date).length;
  const inputCls =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";
  const tagsCls =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-600 flex flex-wrap items-center gap-1.5 min-h-[34px]";
  const subInputCls =
    "w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 disabled:opacity-30";
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
                placeholder="Tagline"
                rows={3}
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
                placeholder="Logo: /public file (tcc.webp) or image URL"
                className={`${inputCls} mb-2`}
              />
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={venueImgWidth}
                  onChange={(e) => {
                    setVenueImgWidth(e.target.value);
                    liveLogo(e.target.value, venueImgOffsetY);
                  }}
                  onBlur={() => setCommittedImgWidth(venueImgWidth)}
                  min={0}
                  step={1}
                  placeholder="Logo width px"
                  className={`${inputCls} min-w-0`}
                />
                <input
                  type="number"
                  value={venueImgOffsetY}
                  onChange={(e) => {
                    setVenueImgOffsetY(e.target.value);
                    liveLogo(venueImgWidth, e.target.value);
                  }}
                  onBlur={() => setCommittedOffsetY(venueImgOffsetY)}
                  step={1}
                  placeholder="Y offset px"
                  title="Logo vertical offset — negative moves up, positive down"
                  className={`${inputCls} min-w-0`}
                />
                <label className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={centerLogo}
                    onChange={(e) => setCenterLogo(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs">Center</span>
                </label>
              </div>
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
                </>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-1.5">
                    <input
                      type="checkbox"
                      checked={showDoors}
                      onChange={(e) => setShowDoors(e.target.checked)}
                      className="rounded"
                    />
                    <span>Show door times on pamphlet</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-1.5">
                    <input
                      type="checkbox"
                      checked={showQr}
                      onChange={(e) => setShowQr(e.target.checked)}
                      className="rounded"
                    />
                    <span>Show QR code on pamphlet</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={pinTopRsvp}
                      onChange={(e) => setPinTopRsvp(e.target.checked)}
                      className="rounded"
                    />
                    <span>Pin RSVP link to top</span>
                  </label>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-neutral-500 shrink-0">Schedule size</span>
                    <input
                      type="range"
                      min={0.6}
                      max={1.5}
                      step={0.05}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setScale(1)}
                      className="text-xs tabular-nums text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 w-10 text-right transition-colors"
                      title="Reset to 100%"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  </div>
                  <div className="space-y-3 mb-4">
                    {group.map((g) => {
                      const slug = g.show!.slug;
                      const isIncluded = included[slug];
                      const dateBad =
                        isIncluded &&
                        dateFocus !== slug &&
                        dateMisaligned(dateLabels[slug] ?? "", g.show!.date);
                      return (
                        <div
                          key={slug}
                          className={`rounded-md border border-neutral-200 dark:border-neutral-700 p-2.5 space-y-1.5 ${
                            isIncluded ? "" : "opacity-40"
                          }`}
                        >
                          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
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
                            value={dateLabels[slug] ?? ""}
                            onChange={(e) =>
                              setDateLabels((prev) => ({ ...prev, [slug]: e.target.value }))
                            }
                            onFocus={() => setDateFocus(slug)}
                            onBlur={() => setDateFocus(null)}
                            disabled={!isIncluded}
                            placeholder={formatEventDateShort(g.show!.date)}
                            className={`${subInputCls} ${dateBad ? "ring-1 ring-amber-500 border-amber-500" : ""}`}
                          />
                          {dateBad && (
                            <button
                              type="button"
                              onClick={() =>
                                setDateLabels((prev) => ({
                                  ...prev,
                                  [slug]: realignDate(prev[slug] ?? "", g.show!.date),
                                }))
                              }
                              title="Fix to match the real date"
                              className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-500 hover:underline"
                            >
                              <WarningIcon size={12} weight="fill" />
                              Should be {formatEventDateShort(g.show!.date)}. Fix
                            </button>
                          )}
                          <input
                            type="text"
                            value={venueLabels[slug] ?? ""}
                            onChange={(e) =>
                              setVenueLabels((prev) => ({ ...prev, [slug]: e.target.value }))
                            }
                            disabled={!isIncluded}
                            placeholder={`${g.show!.venue || "Venue"}, ${g.show!.city}, ${g.show!.region}`}
                            className={subInputCls}
                          />
                          <input
                            type="text"
                            value={doorsByShow[slug] ?? ""}
                            onChange={(e) =>
                              setDoorsByShow((prev) => ({ ...prev, [slug]: e.target.value }))
                            }
                            disabled={!isIncluded}
                            placeholder={g.show!.doorLabel || `Doors open at ${g.show!.doorTime || "7PM"}`}
                            className={subInputCls}
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
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 bg-black/40 shrink-0">
              {(isSingle ? POSTER_PREVIEW_FORMATS : PAMPHLET_PREVIEW_FORMATS).map((f) => (
                <button
                  key={f}
                  onClick={() => setPreviewFormat(f)}
                  className={`px-2.5 py-1 text-xs uppercase tracking-wider rounded transition-colors ${
                    previewFormat === f
                      ? "bg-[#d4a553] text-black"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => downloadOne(previewFormat)}
                disabled={downloading}
                title={`Download ${previewFormat.toUpperCase()} only`}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-xs uppercase tracking-wider rounded text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors disabled:opacity-50"
              >
                <DownloadSimpleIcon size={14} />
                {previewFormat}
              </button>
            </div>
            <div ref={previewRef} className="flex-1 flex justify-end overflow-hidden">
              {isSingle && soloShow ? (
                <Poster
                  slug={soloSlug}
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
                  venueImgWidth={Number(committedImgWidth) || undefined}
                  venueImgOffsetY={Number(committedOffsetY) || undefined}
                  taglineAlign={taglineAlign}
                  showQr
                  debug
                  centerLogo={centerLogo}
                  format={previewFormat}
                />
              ) : (
                <Poster
                  taglineSuffix={tagline}
                  tags={tags}
                  venueImg={venueImg}
                  venueImgWidth={Number(committedImgWidth) || undefined}
                  venueImgOffsetY={Number(committedOffsetY) || undefined}
                  taglineAlign={taglineAlign}
                  showDoors={showDoors}
                  showQr={showQr}
                  pinTopRsvp={pinTopRsvp}
                  scale={scale}
                  debug
                  centerLogo={centerLogo}
                  format={previewFormat}
                  shows={previewShows}
                />
              )}
            </div>
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
      ) : variant === "drawer" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-between gap-3 w-full px-6 py-3 text-sm text-left hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <span className="text-neutral-800 dark:text-neutral-200">Poster</span>
          <span className="text-neutral-400">Edit</span>
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
            {matchedPamphlet?.id || label}
            {!isSingle && ` · ${group.length} shows`}
          </span>
        </button>
      )}
    </>
  );
}

function ManageModal({
  group,
  show,
  host,
  supporters,
  legs,
  rsvpCounts,
  emailSentSlugs,
  onCreateLeg,
  onShowUpdate,
  onUpdateSponsor,
  onMessage,
  onRemoveSponsor,
  onClose,
  onEditHost,
  onViewSupporters,
  onOpenEmail,
}: {
  group: ShowGroup;
  show: Show | null;
  host: Sponsor;
  supporters: Sponsor[];
  legs: Leg[];
  rsvpCounts: { responses: number; attending: number } | null;
  emailSentSlugs: Set<string>;
  onCreateLeg: (slug: string) => Promise<void>;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
  onUpdateSponsor: (updated: Sponsor) => void;
  onMessage: (text: string) => void;
  onRemoveSponsor: (submittedAt: string, showSlug?: string | null) => void;
  onClose: () => void;
  onEditHost: () => void;
  onViewSupporters: () => void;
  onOpenEmail: () => void;
}) {
  const [askingPrivate, setAskingPrivate] = useState(false);
  const [privateDraft, setPrivateDraft] = useState("");
  const [askingReschedule, setAskingReschedule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Opt-in for the current destructive action: also take the Eventbrite listing down.
  const [cancelEb, setCancelEb] = useState(false);
  const hasEb = !!show?.eventbriteId;
  // Inline confirm/book — no page hop, no host roundtrip when the artist books it.
  const [confirmDate, setConfirmDate] = useState(show?.date ?? host.date ?? "");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [ebSyncing, setEbSyncing] = useState(false);
  const [ebSynced, setEbSynced] = useState<number | null>(null);
  const [ebSyncFailed, setEbSyncFailed] = useState(false);
  const ebSyncedOnce = useRef(false);

  const drawerRow =
    "flex items-center justify-between gap-3 w-full px-6 py-3 text-sm text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 transition-colors";
  const groupList =
    "border-y border-neutral-100 dark:border-neutral-800/80 divide-y divide-neutral-100 dark:divide-neutral-800/80";
  const sectionLabel =
    "text-xs font-medium uppercase tracking-wider text-neutral-400 px-6 mb-1";
  const inputCls =
    "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";

  const status = getShowStatus(show);
  const tone = STATUS_TONE[status.tone];

  const patchShow = async (fields: Partial<Show>) => {
    if (!show?.slug) return;
    onShowUpdate(show.slug, fields);
    await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug, ...fields }),
    });
  };

  // "Needs rescheduling": revert a confirmed show to a draft (stage "intent") so it
  // drops off the public schedule but keeps its poster and details for reuse. Clearing
  // `leg` pulls it out of any pamphlet so it lands under Unscheduled, not a live leg.
  // Re-confirm from the draft's Confirm section to give it a new date. Eventbrite is
  // only touched when opted in (cancelEb) — a bare stage change never forwards the flag.
  const rescheduleShow = async () => {
    if (!show?.slug) return;
    onShowUpdate(show.slug, { stage: "intent", leg: null });
    setAskingReschedule(false);
    onClose();
    onMessage(`${show.slug} reverted to draft — poster kept`);
    await fetch("/api/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug, stage: "intent", leg: null, cancelEventbrite: cancelEb }),
    });
  };

  // Confirm & book a draft in place — the artist's own booking, no signed-link
  // roundtrip (the admin cookie authorizes it). Optimistically advance stage + date
  // on both the show and its host record so it lands in Upcoming without a refetch.
  const confirmNow = async () => {
    if (!show?.slug || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: show.slug,
        name: host.name,
        email: host.email,
        phone: host.phone,
        date: confirmDate || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setConfirmError(data.error || "Couldn't confirm — check the host's name and email.");
      setConfirming(false);
      return;
    }
    const nextDate = confirmDate || show.date;
    onShowUpdate(show.slug, { stage: "booked", date: nextDate });
    onUpdateSponsor({ ...host, date: nextDate });
    onClose();
    onMessage(`${show.slug} is booked`);
  };

  const copyConfirmLink = async () => {
    if (!show?.slug) return;
    const res = await fetch(`/api/confirm-link?slug=${encodeURIComponent(show.slug)}`);
    if (!res.ok) {
      setConfirmError("Couldn't get the confirmation link.");
      return;
    }
    const { url } = await res.json();
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  // Auto-sync Eventbrite registrants into Supabase when the modal opens (once per open,
  // only for shows with an Eventbrite event). The route writes only new/changed rows,
  // so this is cheap even when nothing's new — no manual save step. The `ebSyncedOnce`
  // ref (not a cleanup flag) guards Strict Mode's double-invoke; state updates after an
  // unmount are harmless no-ops in React 18, so the fetch handlers always settle.
  useEffect(() => {
    if (!hasEb || !show?.slug || ebSyncedOnce.current) return;
    ebSyncedOnce.current = true;
    setEbSyncing(true);
    fetch("/api/admin/import-eventbrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: show.slug }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("sync failed");
        return r.json();
      })
      .then((d) => {
        if (typeof d.synced === "number") setEbSynced(d.synced);
      })
      .catch(() => setEbSyncFailed(true))
      .finally(() => setEbSyncing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEb, show?.slug]);

  const flightOn = !!show?.flights?.includes(PAYMENT_MODEL);
  const toggleFlight = (on: boolean) => {
    const others = (show?.flights ?? []).filter((f) => f !== PAYMENT_MODEL);
    patchShow({ flights: on ? [...others, PAYMENT_MODEL] : others });
  };

  // Where a private show's direct /rsvp/<slug> link redirects. Funds add a networking toast.
  const redirectOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "Default: other shows (/rsvp)" },
    ];
    const seen = new Set<string>();
    const addFund = (slug: string, name: string) => {
      const value = `/fund/${slug}`;
      if (seen.has(value)) return;
      seen.add(value);
      opts.push({ value, label: `Fund · ${name}` });
    };
    legs.forEach((l) => l.fund && addFund(l.slug, l.fund.destination));
    Object.entries(FUND_LEGS).forEach(([slug, f]) => addFund(slug, f.destination));
    (Object.values(projectsData) as { slug: string; title: string }[]).forEach((p) =>
      addFund(p.slug, p.title),
    );
    opts.push(
      { value: "/support", label: "Support" },
      { value: "/listen", label: "Listen" },
      { value: "/hire", label: "Hire" },
      { value: "/", label: "Home" },
    );
    return opts;
  }, [legs]);

  const location = [host.venue || host.address, host.city, host.region].filter(Boolean).join(", ");

  const handleDeleteShow = async () => {
    setDeleting(true);
    try {
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
          body: JSON.stringify({ slug: group.showSlug, cancelEventbrite: cancelEb }),
        });
      }
      onRemoveSponsor(host.submittedAt, host.showSlug);
      for (const s of supporters) onRemoveSponsor(s.submittedAt, s.showSlug);
      onMessage(`Removed ${location || host.name || host.email}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      header={
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-light tracking-widest text-neutral-900 dark:text-white shrink-0">
              MANAGE
            </h4>
            {show?.slug && (
              <span className="text-sm text-neutral-400 truncate">· {show.slug}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              aria-label="Close"
              className="-m-2 flex h-11 w-11 items-center justify-center text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      }
    >
      <div className="-mx-6 space-y-5">
        {show?.slug && (
          <section>
            <h5 className={sectionLabel}>Show</h5>
            <div className={groupList}>
              {show.visibility !== "private" ? (
                askingPrivate ? (
                  <div className="px-6 py-3 space-y-2.5 bg-amber-50/50 dark:bg-amber-950/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        Make private
                      </span>
                      <button
                        onClick={() => { setAskingPrivate(false); setPrivateDraft(""); }}
                        className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={privateDraft}
                      onChange={(e) => setPrivateDraft(e.target.value)}
                      placeholder="Private reason (e.g. Youth camp, private house concert)"
                      className={inputCls}
                    />
                    <button
                      onClick={() => {
                        patchShow({ visibility: "private", privateNote: privateDraft.trim() || null });
                        setAskingPrivate(false);
                        setPrivateDraft("");
                      }}
                      className="w-full py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                    >
                      Make private
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAskingPrivate(true); setPrivateDraft(""); }}
                    className={drawerRow}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-neutral-800 dark:text-neutral-200">Visibility</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} animate-pulse`} />
                        {status.label}
                      </span>
                    </span>
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                      Make private
                    </span>
                  </button>
                )
              ) : (
                <div className="px-6 py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm text-neutral-800 dark:text-neutral-200">Visibility</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} animate-pulse`} />
                        {status.label}
                      </span>
                    </span>
                    <button
                      onClick={() => patchShow({ visibility: "public" })}
                      className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-500 transition-colors shrink-0"
                    >
                      Make public
                    </button>
                  </div>
                  <input
                    type="text"
                    defaultValue={show.privateNote ?? ""}
                    onBlur={(e) => patchShow({ privateNote: e.target.value.trim() || null })}
                    placeholder="Private reason (e.g. Youth camp, private house concert)"
                    className={inputCls}
                  />
                  <ToggleRow
                    label="Show reason on tour list"
                    checked={!show.hidePrivateNote}
                    onChange={(v) => patchShow({ hidePrivateNote: !v })}
                    className="flex items-center justify-between gap-3 w-full text-sm text-left text-neutral-700 dark:text-neutral-300"
                  />
                  <label className="flex items-center justify-between gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                    <span className="shrink-0">Direct link goes to</span>
                    <select
                      value={show.privateRedirect ?? ""}
                      onChange={(e) => patchShow({ privateRedirect: e.target.value || null })}
                      className="text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-2 py-1 min-w-0"
                    >
                      {redirectOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <ToggleRow
                label="Never group into a leg"
                checked={!!show.standalone}
                onChange={(v) => patchShow({ standalone: v })}
                className={drawerRow}
              />
              <ToggleRow
                label="Start payment at $0"
                checked={flightOn}
                onChange={toggleFlight}
                className={drawerRow}
              />
              <label className={`${drawerRow} cursor-pointer`}>
                <span className="text-neutral-800 dark:text-neutral-200">Leg</span>
                <select
                  value={show.leg ?? ""}
                  onChange={async (e) => {
                    const v = e.target.value;
                    if (v === "__new__") {
                      const raw = window.prompt("New leg slug (e.g. socal)") ?? "";
                      const slug = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      if (!slug) return;
                      if (!legs.some((l) => l.slug === slug)) await onCreateLeg(slug);
                      patchShow({ leg: slug });
                    } else {
                      patchShow({ leg: v || null });
                    }
                  }}
                  className="text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-2 py-1 shrink-0"
                >
                  <option value="">— none —</option>
                  {legs.map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {l.slug}
                    </option>
                  ))}
                  <option value="__new__">+ New leg…</option>
                </select>
              </label>
            </div>
          </section>
        )}

        {show?.slug && isShowDraft(show) && (
          <section>
            <h5 className={sectionLabel}>Confirm</h5>
            <div className={groupList}>
              <label className={`${drawerRow} cursor-pointer`}>
                <span className="text-neutral-800 dark:text-neutral-200">Date</span>
                <input
                  type="date"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-2 py-1 shrink-0"
                />
              </label>
              <button
                onClick={confirmNow}
                disabled={confirming}
                className={`${drawerRow} text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 disabled:opacity-50`}
              >
                <span>{confirming ? "Booking…" : "Confirm & book"}</span>
                <span className="text-neutral-400 truncate ml-3">
                  {host.name || host.email || "add a host first"}
                </span>
              </button>
              <button className={drawerRow} onClick={copyConfirmLink}>
                <span className="text-neutral-800 dark:text-neutral-200">Copy confirm link</span>
                <span className="text-neutral-400">{copiedLink ? "Copied" : "for the host"}</span>
              </button>
              {confirmError && (
                <p className="px-6 py-2 text-xs text-red-600 dark:text-red-400">{confirmError}</p>
              )}
            </div>
          </section>
        )}

        {show?.slug && !isShowDraft(show) && (
          <section>
            <h5 className={sectionLabel}>Schedule</h5>
            <div className={groupList}>
              {askingReschedule ? (
                <div className="px-6 py-3 space-y-2.5">
                  <p className="text-sm text-neutral-800 dark:text-neutral-200">
                    Revert to draft? Keeps the poster.
                  </p>
                  {hasEb && (
                    <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <input
                        type="checkbox"
                        checked={cancelEb}
                        onChange={(e) => setCancelEb(e.target.checked)}
                        className="rounded"
                      />
                      Also cancel the Eventbrite listing
                    </label>
                  )}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={rescheduleShow}
                      className="text-sm font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setAskingReschedule(false)}
                      className="text-sm text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setCancelEb(false); setAskingReschedule(true); }}
                  className={`${drawerRow} text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20`}
                >
                  <span>Needs rescheduling</span>
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h5 className={sectionLabel}>People</h5>
          <div className={groupList}>
            <button className={drawerRow} onClick={onEditHost}>
              <span className="text-neutral-800 dark:text-neutral-200">Edit host</span>
              <span className="text-neutral-400 truncate ml-3">{host.name || host.email}</span>
            </button>
            {supporters.length > 0 && (
              <button className={drawerRow} onClick={onViewSupporters}>
                <span className="text-neutral-800 dark:text-neutral-200">Supporters</span>
                <span className="text-neutral-400">+{supporters.length}</span>
              </button>
            )}
          </div>
        </section>

        <section>
          <h5 className={sectionLabel}>Promote</h5>
          <div className={groupList}>
            <button className={drawerRow} onClick={onOpenEmail}>
              <span className="text-neutral-800 dark:text-neutral-200">Email RSVPs</span>
              {rsvpCounts && <span className="text-neutral-400">{rsvpCounts.responses}</span>}
            </button>
            {hasEb && (
              <div className={`${drawerRow} hover:bg-transparent dark:hover:bg-transparent`}>
                <span className="text-neutral-800 dark:text-neutral-200">Eventbrite RSVPs</span>
                <span
                  className={
                    ebSyncFailed
                      ? "text-red-600 dark:text-red-400"
                      : ebSynced
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-neutral-400"
                  }
                >
                  {ebSyncing
                    ? "syncing…"
                    : ebSyncFailed
                      ? "sync failed"
                      : ebSynced == null
                        ? ""
                        : ebSynced > 0
                          ? `synced ${ebSynced}`
                          : "up to date"}
                </span>
              </div>
            )}
            {show?.slug && (
              <PosterEditor
                group={[group]}
                matchedPamphlet={null}
                onPamphletSaved={() => {}}
                onShowUpdate={onShowUpdate}
                variant="drawer"
              />
            )}
            <button
              disabled
              title="PDF renovating"
              className={`${drawerRow} opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent`}
            >
              <span className="text-neutral-800 dark:text-neutral-200">PDF</span>
              <span className="text-neutral-400">soon</span>
            </button>
          </div>
        </section>

        <section>
          <h5 className={sectionLabel}>Danger</h5>
          <div className={groupList}>
            {!confirmDelete ? (
              <button
                className={`${drawerRow} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20`}
                onClick={() => {
                  setConfirmDelete(true);
                  setDeleteInput("");
                  setCancelEb(false);
                }}
              >
                <span>Delete show</span>
              </button>
            ) : (
              <div className="px-6 py-3 space-y-2">
                {rsvpCounts &&
                  rsvpCounts.responses > 0 &&
                  !emailSentSlugs.has(group.showSlug) && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      {rsvpCounts.responses} RSVP{rsvpCounts.responses === 1 ? "" : "s"} not yet
                      notified. Send a cancel email first.
                    </p>
                  )}
                {hasEb && (
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      checked={cancelEb}
                      onChange={(e) => setCancelEb(e.target.checked)}
                      className="rounded"
                    />
                    Also cancel the Eventbrite listing
                  </label>
                )}
                <div className="flex gap-2 items-center">
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
                    disabled={deleteInput !== "delete" || deleting}
                    className="text-sm px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                  >
                    {deleting ? "Deleting..." : "Confirm"}
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
        </section>
      </div>
    </Modal>
  );
}

function ShowGroupCard({
  group,
  legs,
  onCreateLeg,
  onMessage,
  onUpdateSponsor,
  onRemoveSponsor,
  onShowUpdate,
}: {
  group: ShowGroup;
  legs: Leg[];
  onCreateLeg: (slug: string) => Promise<void>;
  onMessage: (text: string) => void;
  onUpdateSponsor: (updated: Sponsor) => void;
  onRemoveSponsor: (submittedAt: string, showSlug?: string | null) => void;
  onShowUpdate: (slug: string, fields: Partial<Show>) => void;
}) {
  const { show, host, supporters } = group;
  const [editingHost, setEditingHost] = useState(false);
  const [viewingSupporters, setViewingSupporters] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState<Sponsor | null>(null);
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
  const [managing, setManaging] = useState(false);

  const openEmail = () => {
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
  };

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

  const location = [host.venue || host.address, host.city, host.region].filter(Boolean).join(", ");
  const status = getShowStatus(show);
  const statusTone = STATUS_TONE[status.tone];

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
            pending={!!show && isShowDraft(show)}
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
      {managing && (
        <ManageModal
          group={group}
          show={show}
          host={host}
          supporters={supporters}
          legs={legs}
          rsvpCounts={rsvpCounts}
          emailSentSlugs={emailSentSlugs}
          onCreateLeg={onCreateLeg}
          onShowUpdate={onShowUpdate}
          onUpdateSponsor={onUpdateSponsor}
          onMessage={onMessage}
          onRemoveSponsor={onRemoveSponsor}
          onClose={() => setManaging(false)}
          onEditHost={() => { setManaging(false); setEditingHost(true); }}
          onViewSupporters={() => { setManaging(false); setViewingSupporters(true); }}
          onOpenEmail={() => { setManaging(false); openEmail(); }}
        />
      )}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 overflow-hidden transition-all h-full flex flex-col">
        <div className="flex-1 p-5 flex flex-col gap-3">
          <div className="min-w-0">
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

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            {!show?.slug ? (
              <span className="text-xs text-neutral-400">{status.label}</span>
            ) : isShowDraft(show) ? (
              <button
                onClick={() => setManaging(true)}
                title="Confirm or send a link"
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusTone.pill} hover:bg-sky-100 dark:hover:bg-sky-950/50 transition-colors`}
              >
                {status.label}
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusTone.pill}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusTone.dot}`} />
                {status.label}
              </span>
            )}
            <button
              onClick={() => setManaging(true)}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
