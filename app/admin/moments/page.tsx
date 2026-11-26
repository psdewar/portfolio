"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CameraIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PlayIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { uploadFile } from "../../moments/upload";
import { renderSlide } from "./slides";
import { momentDate } from "../../lib/moment-date";

interface MomentItem {
  key: string;
  size: number;
  lastModified: string | null;
  url: string;
  thumb?: string;
  large?: string;
  downloadUrl: string;
  city?: string;
  visit?: string;
  show?: string;
  offConcert?: boolean;
  place?: string;
  leg?: string;
  hasOriginal: boolean;
  dims?: [number, number];
  taken?: number;
  duration?: number;
}

interface Concert {
  date: string;
  label: string;
  venue: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const STAGGER_MS = 70;

const VIDEO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogg: "video/ogg",
};

async function fetchShareFile(item: MomentItem) {
  const res = await fetch(item.downloadUrl);
  if (!res.ok) throw new Error(`Could not load ${filename(item.key)}`);
  const blob = await res.blob();
  const name = filename(item.key);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : (VIDEO_MIME[ext] ?? blob.type);
  return new File([blob], name, { type });
}

function useShare(items: MomentItem[]) {
  const [canShare, setCanShare] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [ready, setReady] = useState<File[] | null>(null);
  const signature = items.map((it) => `${it.key}:${groupOf(it)}`).join("|");

  useEffect(() => {
    setCanShare(
      !!navigator.canShare?.({ files: [new File([], "x.jpg", { type: "image/jpeg" })] }),
    );
  }, []);

  useEffect(() => {
    setReady(null);
  }, [signature]);

  async function send(files: File[]) {
    try {
      await navigator.share({ files });
      setReady(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setReady(files);
        return;
      }
      throw err;
    }
  }

  async function share() {
    if (ready) return send(ready);
    const files: File[] = [];
    const labeled = labeledKeys(items);
    try {
      for (const item of items) {
        setProgress(`Preparing ${files.length + 1}/${items.length}`);
        if (VIDEO_EXT.test(item.key)) {
          files.push(await fetchShareFile(item));
          continue;
        }
        const slide = await renderSlide(
          item,
          labeled.has(item.key) ? { city: item.city!, visit: dateOf(item)! } : null,
        );
        const name = `slide-${String(files.length + 1).padStart(2, "0")}.jpg`;
        files.push(new File([slide], name, { type: slide.type }));
      }
    } finally {
      setProgress(null);
    }
    await send(files);
  }

  const label = progress ?? (ready ? "Tap to share" : "Share");
  return { canShare, label, busy: progress !== null, share };
}

function filename(key: string) {
  return key.replace(/^drops\//, "");
}

function bareName(key: string) {
  return filename(key).replace(/^\d+-/, "");
}

function formatStamp(ms: number, compact = false) {
  const parts = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(compact
      ? { hour: "2-digit", hourCycle: "h23" }
      : { year: "numeric", hour: "numeric", timeZoneName: "short" }),
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(ms);
  const firstTime = parts.findIndex((p) => p.type === "hour");
  return parts
    .map((p, i) => (p.type === "literal" && i === firstTime - 1 ? " " : p.value))
    .join("");
}

function formatDuration(seconds: number) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function Stamp({ item, compact = false }: { item: MomentItem; compact?: boolean }) {
  const taken = takenAt(item);
  const ms = taken ?? (item.lastModified ? Date.parse(item.lastModified) : null);
  if (ms == null) return null;
  const Icon = taken ? CameraIcon : UploadSimpleIcon;
  return (
    <span className="inline-flex items-center gap-[0.3em]">
      <Icon aria-label={taken ? "Captured" : "Uploaded"} role="img" className="shrink-0" size="1.1em" />
      {formatStamp(ms, compact)}
    </span>
  );
}

function takenAt(item: MomentItem): number | null {
  const m = item.key.match(/^drops\/[a-f0-9]{64}-(\d+)\./);
  return m ? Number(m[1]) : item.taken ?? null;
}

function clampIndex(value: number, total: number) {
  return Math.min(Math.max(Math.round(value), 1), total);
}

function isConcertItem(item: MomentItem | undefined) {
  return !!item?.city && !!item.show && !item.offConcert;
}

function dateOf(item: MomentItem | undefined) {
  return item ? momentDate({ ...item, shot: takenAt(item) }) : undefined;
}

function groupOf(item: MomentItem | undefined) {
  if (!item?.city) return "";
  const kind = isConcertItem(item) ? "c" : `o:${item.place ?? ""}`;
  return `${item.city}|${dateOf(item) ?? ""}|${kind}`;
}

function labeledKeys(items: MomentItem[]) {
  const tagged = new Set<string>();
  const labeled = new Set<string>();
  for (const item of items) {
    if (VIDEO_EXT.test(item.key)) continue;
    const stop = groupOf(item);
    if (isConcertItem(item) && dateOf(item) && !tagged.has(stop)) labeled.add(item.key);
    tagged.add(stop);
  }
  return labeled;
}

const OTHER_CITY = "other";
const OFF_CONCERT = "none";

const concertKey = (c: Concert) => `${c.label}|${c.date}`;

const concertKeyOf = (item: MomentItem) =>
  isConcertItem(item) ? `${item.city}|${item.show}` : "";

function concertText(c: Concert) {
  return [formatVisit(c.date, "short"), c.label, c.venue].filter(Boolean).join(" · ");
}

function formatVisit(visit: string, month: "long" | "short" = "long") {
  return new Date(`${visit}T12:00:00`).toLocaleDateString(undefined, {
    month,
    day: "numeric",
  });
}

const HOVER_REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100";

const SELECTION_KEY = "admin-moments-selection";

function readStoredSelection(): string[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SELECTION_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredSelection(keys: string[]) {
  try {
    if (keys.length) window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify(keys));
    else window.sessionStorage.removeItem(SELECTION_KEY);
  } catch {}
}

const OPEN_KEY = "admin-moments-open";

function readOpen(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPEN_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeOpen(open: Record<string, boolean>) {
  try {
    if (Object.keys(open).length) window.localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    else window.localStorage.removeItem(OPEN_KEY);
  } catch {}
}

const PICK_LIMIT = 10;
const PICK_BURST_MS = 5000;

const HOLD_MS = 350;
const HOLD_SLOP = 8;

interface Section {
  id: string;
  city: string;
  date?: string;
  concert: boolean;
  place?: string;
  items: MomentItem[];
}

function capturedAt(item: MomentItem) {
  return takenAt(item) ?? (item.lastModified ? Date.parse(item.lastModified) : 0);
}

function buildSections(items: MomentItem[]): Section[] {
  const byId = new Map<string, Section>();
  for (const it of items) {
    const id = groupOf(it) || (VIDEO_EXT.test(it.key) ? "videos" : "");
    const section = byId.get(id) ?? {
      id,
      city: it.city ?? "",
      date: dateOf(it),
      concert: isConcertItem(it),
      place: it.place,
      items: [],
    };
    section.items.push(it);
    byId.set(id, section);
  }
  const sections = [...byId.values()];
  for (const s of sections) s.items.sort((a, b) => capturedAt(b) - capturedAt(a));
  const newest = (s: Section) => capturedAt(s.items[0]);
  const rank = (s: Section) => (s.city ? 0 : s.id === "" ? 1 : 2);
  return sections.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.city ? (b.date ?? "").localeCompare(a.date ?? "") : 0) ||
      newest(b) - newest(a),
  );
}

async function postCity(body: {
  key: string;
  city?: string;
  show?: string;
  place?: string;
}): Promise<Partial<MomentItem>> {
  const r = await fetch("/api/admin/moments/city", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Could not save city");
  return {
    city: d.city || undefined,
    visit: d.visit || undefined,
    show: d.show || undefined,
    offConcert: d.offConcert || undefined,
    place: d.place || undefined,
    leg: d.leg || undefined,
  };
}

const saveCity = (key: string, city: string, show?: string) => postCity({ key, city, show });
const savePlace = (key: string, place: string) => postCity({ key, place });

async function deleteFile(key: string) {
  const r = await fetch("/api/admin/moments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || "Delete failed");
  }
}

async function renameFile(key: string, name: string): Promise<Partial<MomentItem>> {
  const r = await fetch("/api/admin/moments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, name }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Rename failed");
  return { key: d.key, url: d.url, downloadUrl: d.downloadUrl };
}

const URL_FIELDS = ["url", "thumb", "large", "downloadUrl"] as const;
const URL_REFRESH_MS = 1800000;

function sameObject(a: string, b: string) {
  const x = new URL(a);
  const y = new URL(b);
  return x.origin + x.pathname === y.origin + y.pathname;
}

function mergeStableUrls(prev: MomentItem[], next: MomentItem[]) {
  const prevByKey = new Map(prev.map((it) => [it.key, it]));
  return next.map((it) => {
    const old = prevByKey.get(it.key);
    if (!old) return it;
    const merged = { ...it };
    for (const field of URL_FIELDS) {
      const before = old[field];
      const after = it[field];
      if (before && after && sameObject(before, after)) merged[field] = before;
    }
    return merged;
  });
}

export default function MomentsAdminPage() {
  const [items, setItems] = useState<MomentItem[]>([]);
  const [featuredKeys, setFeaturedKeys] = useState<string[]>([]);
  const [ogKey, setOgKeyState] = useState<string | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [walk, setWalk] = useState<string[]>([]);
  const walkRef = useRef<string[]>([]);
  const keysRef = useRef<string[]>([]);
  const savedKeys = useRef<string[]>([]);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const saveSeq = useRef(0);
  const signedAt = useRef(0);
  const selectionRestored = useRef(false);
  const openRestored = useRef(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async (initial: boolean) => {
    try {
      await saveChain.current;
      const seq = saveSeq.current;
      const r = await fetch("/api/admin/moments");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Failed (${r.status})`);
      await saveChain.current;
      const serverKeys: string[] = Array.isArray(data.featuredKeys) ? data.featuredKeys : [];
      if (saveSeq.current === seq) {
        keysRef.current = serverKeys;
        savedKeys.current = serverKeys;
        setFeaturedKeys(serverKeys);
      }
      const fresh: MomentItem[] = Array.isArray(data.items) ? data.items : [];
      const expired = Date.now() - signedAt.current > URL_REFRESH_MS;
      if (expired) signedAt.current = Date.now();
      setItems((prev) => (expired ? fresh : mergeStableUrls(prev, fresh)));
      setOgKeyState(typeof data.ogKey === "string" ? data.ogKey : null);
      setConcerts(Array.isArray(data.concerts) ? data.concerts : []);
      if (initial) {
        const live = new Set(fresh.map((it) => it.key));
        setSelected(readStoredSelection().filter((k) => live.has(k)));
        selectionRestored.current = true;
        setState({ kind: "ready" });
      }
    } catch (err) {
      if (initial) {
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load.",
        });
      }
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    if (selectionRestored.current) writeStoredSelection(selected);
  }, [selected]);

  useEffect(() => {
    setOpen(readOpen());
    openRestored.current = true;
  }, []);

  useEffect(() => {
    if (openRestored.current) writeOpen(open);
  }, [open]);

  function updateItem(key: string, patch: Partial<MomentItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    if (patch.key && patch.key !== key) {
      setFeaturedKeys((prev) => prev.map((k) => (k === key ? patch.key! : k)));
      setOgKeyState((prev) => (prev === key ? patch.key! : prev));
      setSelected((prev) => prev.map((k) => (k === key ? patch.key! : k)));
      setPreviewKey((prev) => (prev === key ? patch.key! : prev));
      setWalk((prev) => prev.map((k) => (k === key ? patch.key! : k)));
    }
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setFeaturedKeys((prev) => prev.filter((k) => k !== key));
    setOgKeyState((prev) => (prev === key ? null : prev));
    setSelected((prev) => prev.filter((k) => k !== key));
    setPreviewKey((prev) => {
      if (prev !== key) return prev;
      const at = walk.indexOf(key);
      return walk[at + 1] ?? walk[at - 1] ?? null;
    });
    setWalk((prev) => prev.filter((k) => k !== key));
  }

  const itemByKey = useMemo(
    () => new Map(items.map((it) => [it.key, it] as const)),
    [items],
  );
  const selectedItems = useMemo(
    () => selected.map((k) => itemByKey.get(k)).filter((it): it is MomentItem => Boolean(it)),
    [selected, itemByKey],
  );
  const labeled = useMemo(() => labeledKeys(selectedItems), [selectedItems]);
  const featuredItems = featuredKeys
    .map((k) => itemByKey.get(k))
    .filter((it): it is MomentItem => Boolean(it));
  const sections = useMemo(() => buildSections(items), [items]);
  const recentId = sections[0] ? sections[0].id || "unlabeled" : null;

  function toggleOpen(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !(prev[id] ?? id === recentId) }));
  }
  const venueByGroup = useMemo(
    () => new Map(concerts.filter((c) => c.venue).map((c) => [concertKey(c), c.venue])),
    [concerts],
  );
  const walkKeys = useMemo(() => sections.flatMap((s) => s.items.map((it) => it.key)), [sections]);
  useEffect(() => {
    walkRef.current = walkKeys;
  }, [walkKeys]);
  const stepPreview = useCallback(
    (delta: number) => setPreviewKey((prev) => (prev ? walk[walk.indexOf(prev) + delta] ?? prev : prev)),
    [walk],
  );
  const orderByKey = useMemo(
    () => new Map(selected.map((k, i) => [k, i + 1] as const)),
    [selected],
  );
  const slotByKey = useMemo(
    () => new Map(featuredKeys.map((k, i) => [k, i + 1] as const)),
    [featuredKeys],
  );
  const cityLabels = useMemo(
    () =>
      [...new Set(items.map((it) => it.city).filter((c): c is string => Boolean(c)))].sort(),
    [items],
  );
  const previewItem = previewKey ? itemByKey.get(previewKey) : undefined;
  const previewAt = previewKey ? walk.indexOf(previewKey) : -1;
  const previewPrev = previewAt > 0 ? itemByKey.get(walk[previewAt - 1]) : undefined;
  const previewNext = previewAt >= 0 ? itemByKey.get(walk[previewAt + 1]) : undefined;

  const [slot, setSlot] = useState<number | null>(null);
  const maxSlot = featuredKeys.length + 1;
  const shownSlot = clampIndex(slot ?? maxSlot, maxSlot);

  const toggleSelected = useCallback((key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);
  function toggleSection(keys: string[]) {
    setSelected((prev) =>
      keys.every((k) => prev.includes(k))
        ? prev.filter((k) => !keys.includes(k))
        : [...prev, ...keys.filter((k) => !prev.includes(k))],
    );
  }
  function pickSection(sectionItems: MomentItem[]) {
    const inSection = new Set(sectionItems.map((it) => it.key));
    const featured = featuredKeys.filter((k) => inSection.has(k));
    const ordered = featured.length
      ? featured.map((k) => itemByKey.get(k)!)
      : [...sectionItems].sort((a, b) => capturedAt(a) - capturedAt(b));
    const kept: MomentItem[] = [];
    for (const it of ordered) {
      if (selected.includes(it.key)) continue;
      const t = capturedAt(it);
      if (kept.some((k) => Math.abs(capturedAt(k) - t) <= PICK_BURST_MS)) continue;
      kept.push(it);
    }
    setSelected((prev) => [...prev, ...kept.slice(0, PICK_LIMIT).map((it) => it.key)]);
  }
  const openPreview = useCallback((key: string) => {
    setWalk(walkRef.current);
    setPreviewKey(key);
  }, []);
  const closePreview = useCallback(() => setPreviewKey(null), []);

  function saveKeys(nextKeys: string[]) {
    keysRef.current = nextKeys;
    setFeaturedKeys(nextKeys);
    const seq = ++saveSeq.current;
    saveChain.current = saveChain.current.then(async () => {
      try {
        const r = await fetch("/api/admin/moments/feature", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: nextKeys }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Could not save the slideshow.");
        savedKeys.current = nextKeys;
      } catch (e) {
        if (seq === saveSeq.current) {
          keysRef.current = savedKeys.current;
          setFeaturedKeys(savedKeys.current);
        }
        window.alert(e instanceof Error ? e.message : "Could not save the slideshow.");
      }
    });
  }

  function removeFromSlideshow(key: string) {
    saveKeys(keysRef.current.filter((k) => k !== key));
  }

  function addSelected() {
    if (!selected.length) return;
    const next = keysRef.current.filter((k) => !selected.includes(k));
    const at = clampIndex(shownSlot, next.length + 1) - 1;
    next.splice(at, 0, ...selected);
    saveKeys(next);
    setSlot(at + 1 + selected.length);
    setSelected([]);
  }

  async function applyToSelected(save: (key: string) => Promise<Partial<MomentItem>>) {
    for (const key of selected) {
      try {
        updateItem(key, await save(key));
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Could not save city");
        return false;
      }
    }
    return true;
  }

  const setCityForSelected = (city: string, show?: string) =>
    applyToSelected((key) => saveCity(key, city, show));
  const setPlaceForSelected = (place: string) => applyToSelected((key) => savePlace(key, place));

  async function deleteSelected() {
    if (!window.confirm(`Delete ${selected.length} file${selected.length === 1 ? "" : "s"} forever?`)) return;
    for (const key of selected) {
      try {
        await deleteFile(key);
        removeItem(key);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Delete failed");
        return;
      }
    }
  }

  async function setOg(key: string) {
    const next = ogKey === key ? null : key;
    const prev = ogKey;
    setOgKeyState(next);
    try {
      const r = await fetch("/api/admin/moments/og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: next }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setOgKeyState(prev);
      window.alert("Could not set the link preview.");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {state.kind === "loading" && (
        <div className="flex flex-col lg:flex-row gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex-1 aspect-square rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      {state.kind === "ready" && (
        <div className="space-y-6">
          <AdminUpload onDone={() => load(false)} />
          <datalist id="moment-cities">
            {cityLabels.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
          {featuredItems.length > 0 && (
            <SlideshowReorder
              items={featuredItems}
              onReorder={saveKeys}
              onRemove={removeFromSlideshow}
            />
          )}
          <section
            className="-mx-4 sm:mx-0"
            style={
              selected.length
                ? { paddingBottom: "calc(var(--selection-bar-h, 0px) + max(0px, var(--player-h, 0px)) + 1rem)" }
                : undefined
            }
          >
            {sections.length === 0 && (
              <p className="px-4 sm:px-0 text-sm text-neutral-400 dark:text-neutral-500">
                Nothing uploaded yet.
              </p>
            )}
            {sections.map((section) => {
              const sectionId = section.id || "unlabeled";
              const isCollapsed = !(open[sectionId] ?? sectionId === recentId);
              const pickedCount = section.items.filter((it) => orderByKey.has(it.key)).length;
              return (
              <div key={sectionId}>
                <h2 className="flex items-center gap-2 px-4 sm:px-0 pb-1.5 pt-4">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleOpen(sectionId)}
                    className="-my-3 flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <CaretRightIcon
                      size={12}
                      weight="bold"
                      className={`shrink-0 text-neutral-400 ${isCollapsed ? "" : "rotate-90"}`}
                    />
                    <span
                      className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
                        section.city
                          ? "text-neutral-700 dark:text-neutral-200"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {section.city || (section.id === "videos" ? "Unlabeled videos" : "Unlabeled photos")}
                    </span>
                    {section.date && (
                      <span className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {[
                          formatVisit(section.date, "short"),
                          section.concert
                            ? venueByGroup.get(`${section.city}|${section.date}`)
                            : section.place,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </button>
                  {section.items.length <= PICK_LIMIT ? (
                    <span aria-hidden className="ml-auto w-11 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => pickSection(section.items)}
                      className="-my-3.5 ml-auto w-11 shrink-0 whitespace-nowrap py-3.5 text-center text-xs text-neutral-500 transition-colors hover:text-[#d4a553] dark:text-neutral-400"
                    >
                      Pick
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.items.map((it) => it.key))}
                    className="-my-3.5 w-[4.5rem] shrink-0 whitespace-nowrap py-3.5 text-left text-xs text-neutral-500 transition-colors hover:text-[#d4a553] dark:text-neutral-400"
                  >
                    {section.items.every((it) => orderByKey.has(it.key)) ? "Deselect all" : "Select all"}
                  </button>
                  <span className={`w-8 shrink-0 whitespace-nowrap text-right text-xs tabular-nums ${pickedCount ? "text-[#b8893a] dark:text-[#d4a553]" : "text-neutral-400 dark:text-neutral-500"}`}>
                    {pickedCount || section.items.length}
                  </span>
                </h2>
                {!isCollapsed && (
                <div
                  className="grid gap-[2px]"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}
                >
                  {section.items.map((item) => (
                    <PickerCell
                      key={item.key}
                      item={item}
                      order={orderByKey.get(item.key) ?? 0}
                      slotPos={slotByKey.get(item.key) ?? 0}
                      selecting={selected.length > 0}
                      labeled={labeled.has(item.key)}
                      onToggle={toggleSelected}
                      onOpen={openPreview}
                    />
                  ))}
                </div>
                )}
              </div>
              );
            })}
          </section>
          {selected.length > 0 && (
            <SelectionBar
              count={selected.length}
              shareItems={selectedItems}
              labeled={labeled}
              onReorder={setSelected}
              onOpen={openPreview}
              slot={shownSlot}
              maxSlot={maxSlot}
              onSlotChange={setSlot}
              onAdd={addSelected}
              concerts={concerts}
              onSetCity={setCityForSelected}
              onSetPlace={setPlaceForSelected}
              onDelete={deleteSelected}
              onClear={() => setSelected([])}
            />
          )}
          {previewItem && (
            <PreviewOverlay
              onStep={stepPreview}
              item={previewItem}
              prev={previewPrev}
              next={previewNext}
              order={orderByKey.get(previewItem.key) ?? 0}
              isOg={ogKey === previewItem.key}
              onToggle={toggleSelected}
              onSetOg={setOg}
              concerts={concerts}
              onUpdate={updateItem}
              onRemove={removeItem}
              onClose={closePreview}
            />
          )}
        </div>
      )}
    </div>
  );
}

const PickerCell = memo(function PickerCell({
  item,
  order,
  slotPos,
  selecting,
  labeled,
  onToggle,
  onOpen,
}: {
  item: MomentItem;
  order: number;
  slotPos: number;
  selecting: boolean;
  labeled: boolean;
  onToggle: (key: string) => void;
  onOpen: (key: string) => void;
}) {
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const held = useRef(false);
  const isVideo = VIDEO_EXT.test(item.key);
  const cellSrc = item.thumb ?? (isVideo ? undefined : item.url);

  function cancel() {
    if (hold.current) {
      clearTimeout(hold.current.timer);
      hold.current = null;
    }
  }

  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current.timer);
    },
    [],
  );

  return (
    <div className="group relative aspect-square w-full select-none [container-type:inline-size] overflow-hidden bg-neutral-100 dark:bg-neutral-900 [-webkit-touch-callout:none] [-webkit-user-select:none]">
      <button
        type="button"
        aria-label={`Open ${filename(item.key)}`}
        onPointerDown={(e) => {
          held.current = false;
          cancel();
          if (e.pointerType === "mouse") return;
          hold.current = {
            x: e.clientX,
            y: e.clientY,
            timer: window.setTimeout(() => {
              hold.current = null;
              held.current = true;
              onToggle(item.key);
            }, HOLD_MS),
          };
        }}
        onPointerMove={(e) => {
          if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > HOLD_SLOP) {
            cancel();
          }
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          if (selecting) onToggle(item.key);
          else onOpen(item.key);
        }}
        className="absolute inset-0 block h-full w-full"
      >
        {isVideo && !cellSrc && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-800 dark:bg-neutral-800">
            <PlayIcon size={22} weight="fill" className="text-white/70" />
          </span>
        )}
        {cellSrc && (
          <img
            src={cellSrc}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover [-webkit-touch-callout:none]"
          />
        )}
        {isVideo && item.thumb && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <PlayIcon size={22} weight="fill" className="text-white/70 drop-shadow" />
          </span>
        )}
      </button>
      <span className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 pb-0.5 pt-4 text-[length:calc(10.4cqw_-_0.4px)] font-semibold leading-tight tabular-nums whitespace-nowrap text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)] ${HOVER_REVEAL}`}>
        <Stamp item={item} compact />
      </span>
      {order > 0 && (
        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-[#d4a553]" />
      )}
      {slotPos > 0 && order === 0 && (
        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/70" />
      )}
      {(slotPos > 0 || (isVideo && item.duration)) && (
        <span className="pointer-events-none absolute top-1 right-1 flex flex-col items-end gap-1">
          {slotPos > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-white px-1 text-[11px] font-bold tabular-nums text-[#0a0a0a] shadow-sm">
              #{slotPos}
            </span>
          )}
          {isVideo && item.duration ? (
            <span className="rounded bg-black/60 px-1 text-[10px] font-semibold tabular-nums text-white">
              {formatDuration(item.duration)}
            </span>
          ) : null}
        </span>
      )}
      <button
        type="button"
        aria-pressed={order > 0}
        aria-label={`Select ${filename(item.key)}`}
        onClick={() => onToggle(item.key)}
        className={`absolute top-0 left-0 flex h-11 w-11 items-start justify-start p-1 ${
          order > 0 || selecting
            ? ""
            : HOVER_REVEAL
        }`}
      >
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums ${
            order > 0
              ? "bg-[#d4a553] text-[#0a0a0a]"
              : "border-2 border-white/90 bg-black/25 shadow-sm"
          }`}
        >
          {order > 0 ? order : ""}
        </span>
      </button>
      {labeled && (
        <span
          title="Gets the city label"
          className="pointer-events-none absolute top-[9px] left-[28px] h-1.5 w-1.5 rounded-full bg-[#d4a553] ring-1 ring-black/40"
        />
      )}
    </div>
  );
});

function PlaceInput({
  value,
  disabled,
  className,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  className: string;
  onSave: (place: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      type="text"
      value={draft}
      disabled={disabled}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onSave(draft.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder="Place, optional"
      aria-label="Place"
      autoComplete="off"
      className={className}
    />
  );
}

function ConcertSelect({
  concerts,
  value,
  disabled,
  className,
  canOff,
  onPick,
  onOff,
  onOther,
}: {
  concerts: Concert[];
  value: string;
  disabled?: boolean;
  className: string;
  canOff: boolean;
  onPick: (concert: Concert) => void;
  onOff: () => void;
  onOther: () => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label="Concert"
      onChange={(e) => {
        if (e.target.value === OFF_CONCERT) return onOff();
        if (e.target.value === OTHER_CITY) return onOther();
        const picked = concerts.find((c) => concertKey(c) === e.target.value);
        if (picked) onPick(picked);
      }}
      className={`min-w-0 max-w-full ${className}`}
    >
      <option value="">Concert</option>
      {concerts.map((c) => (
        <option key={concertKey(c)} value={concertKey(c)}>
          {concertText(c)}
        </option>
      ))}
      <option value={OFF_CONCERT} disabled={!canOff}>
        Not at a concert
      </option>
      <option value={OTHER_CITY}>Other city…</option>
    </select>
  );
}

function SelectionBar({
  count,
  shareItems,
  labeled,
  onReorder,
  onOpen,
  concerts,
  slot,
  maxSlot,
  onSlotChange,
  onAdd,
  onSetCity,
  onSetPlace,
  onDelete,
  onClear,
}: {
  count: number;
  shareItems: MomentItem[];
  labeled: Set<string>;
  onReorder: (keys: string[]) => void;
  onOpen: (key: string) => void;
  concerts: Concert[];
  slot: number;
  maxSlot: number;
  onSlotChange: (slot: number) => void;
  onAdd: () => void;
  onSetCity: (city: string, show?: string) => Promise<boolean>;
  onSetPlace: (place: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onClear: () => void;
}) {
  const [slotDraft, setSlotDraft] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [working, setWorking] = useState(false);
  const share = useShare(shareItems);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--selection-bar-h", `${el.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--selection-bar-h");
    };
  }, []);
  const city = cityDraft.trim();
  const placeable = shareItems.every((it) => it.city && !isConcertItem(it));
  const sharedPlace = shareItems.every((it) => it.place === shareItems[0]?.place)
    ? (shareItems[0]?.place ?? "")
    : "";
  const action =
    "relative before:absolute before:-inset-1 before:content-[''] sm:before:content-none inline-flex shrink-0 items-center rounded-full border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#d4a553] hover:text-[#b8893a] active:scale-95 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:text-[#d4a553]";

  async function place(label: string, show?: string) {
    setWorking(true);
    const ok = await onSetCity(label, show);
    setWorking(false);
    return ok;
  }

  async function applyCity() {
    if (!city) return;
    if (await place(city)) {
      setCityDraft("");
      setCityOpen(false);
    }
  }

  async function remove() {
    setWorking(true);
    await onDelete();
    setWorking(false);
  }

  return (
    <div
      ref={barRef}
      style={{ bottom: "max(0px, var(--player-h, 0px))" }}
      className="fixed inset-x-0 z-40 border-t border-neutral-200 bg-white/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <PostTray items={shareItems} labeled={labeled} onReorder={onReorder} onOpen={onOpen} />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="relative before:absolute before:-inset-1 before:content-[''] sm:before:content-none -ml-2 flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <XIcon size={18} />
          </button>
          <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {count} selected
          </span>
        </div>
        {share.canShare && (
          <button type="button" disabled={share.busy} onClick={share.share} className={action}>
            {share.label}
          </button>
        )}
        <button
          type="button"
          disabled={working}
          onClick={remove}
          className={`${action} ml-auto !border-red-300 !text-red-600 sm:order-last sm:ml-0 dark:!border-red-400/50 dark:!text-red-300`}
        >
          Delete
        </button>
        {cityOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyCity();
            }}
            className="flex min-w-0 basis-full items-center gap-2 sm:ml-auto sm:basis-auto sm:flex-1 sm:max-w-xl"
          >
            <input
              type="text"
              list="moment-cities"
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCityOpen(false);
              }}
              placeholder="City, ST"
              aria-label="City for selected"
              autoComplete="off"
              autoFocus
              className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-transparent px-3.5 py-2 text-base text-neutral-800 min-h-11 sm:min-h-0 focus:border-[#d4a553] focus:outline-none dark:border-neutral-700 dark:text-neutral-100 sm:text-sm"
            />
            <button type="submit" disabled={!city || working} className={action}>
              {working ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setCityOpen(false)} className={action}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex min-w-0 basis-full items-center gap-2 sm:ml-auto sm:basis-auto">
            <div className="flex shrink-0 items-center rounded-full bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a] shadow-sm">
              <button
                type="button"
                onClick={onAdd}
                className="relative before:absolute before:-inset-1 before:content-[''] sm:before:content-none py-2 pl-4 pr-2 text-sm font-medium transition-transform active:scale-95"
              >
                Add to slideshow at
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxSlot}
                value={slotDraft ?? slot}
                aria-label="Slideshow position"
                onChange={(e) => {
                  setSlotDraft(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n)) onSlotChange(clampIndex(n, maxSlot));
                }}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => setSlotDraft(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="mr-1.5 w-12 rounded-full bg-white/60 py-1 text-center -my-1.5 border-y-[6px] border-transparent bg-clip-padding sm:my-0 sm:border-y-0 sm:bg-clip-border text-base font-semibold tabular-nums focus:bg-white focus:outline-none sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <ConcertSelect
              concerts={concerts}
              value=""
              disabled={working}
              canOff={shareItems.every((it) => it.city)}
              onPick={(c) => place(c.label, c.date)}
              onOff={() => place("", OFF_CONCERT)}
              onOther={() => setCityOpen(true)}
              className={`${action} !shrink flex-1 bg-transparent min-h-11 sm:min-h-0`}
            />
            {placeable && (
              <PlaceInput
                value={sharedPlace}
                disabled={working}
                onSave={onSetPlace}
                className={`${action} !shrink min-w-0 flex-1 bg-transparent !text-base font-normal min-h-11 sm:min-h-0 sm:!text-sm`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StageVideo({
  item,
  active,
  ratio,
  onInfo,
}: {
  item: MomentItem;
  active: boolean;
  ratio: number | null;
  onInfo: (key: string, info: { w: number; h: number; duration: number }) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.src = item.url;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [item.url]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    let live = true;
    const stopListening = () => {
      window.removeEventListener("pointerup", unmute, true);
      window.removeEventListener("keydown", unmute, true);
    };
    const unmute = () => {
      el.muted = false;
      stopListening();
    };
    el.muted = false;
    el.play().catch((err: DOMException) => {
      if (!live || err.name !== "NotAllowedError") return;
      el.muted = true;
      window.addEventListener("pointerup", unmute, true);
      window.addEventListener("keydown", unmute, true);
      el.play().catch(() => {});
    });
    return () => {
      live = false;
      stopListening();
      el.pause();
      el.currentTime = 0;
    };
  }, [active, item.url]);
  return (
    <video
      ref={ref}
      poster={item.thumb}
      controls
      playsInline
      preload="auto"
      onLoadedMetadata={(e) =>
        onInfo(item.key, {
          w: e.currentTarget.videoWidth,
          h: e.currentTarget.videoHeight,
          duration: e.currentTarget.duration,
        })
      }
      onClick={(e) => e.stopPropagation()}
      className={`${active ? "" : "hidden"} ${ratio ? "" : "h-full w-full object-contain"}`}
      style={ratio ? { aspectRatio: ratio, width: `min(100cqw, calc(100cqh * ${ratio}))` } : undefined}
    />
  );
}

function PreviewOverlay({
  item,
  prev,
  next,
  order,
  isOg,
  onToggle,
  onSetOg,
  concerts,
  onUpdate,
  onRemove,
  onClose,
  onStep,
}: {
  item: MomentItem;
  prev?: MomentItem;
  next?: MomentItem;
  order: number;
  isOg: boolean;
  onToggle: (key: string) => void;
  onSetOg: (key: string) => void;
  concerts: Concert[];
  onUpdate: (key: string, patch: Partial<MomentItem>) => void;
  onRemove: (key: string) => void;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [videoInfos, setVideoInfos] = useState<Record<string, { w: number; h: number; duration: number }>>({});
  const videoInfo = videoInfos[item.key];
  const recordInfo = useCallback(
    (key: string, info: { w: number; h: number; duration: number }) =>
      setVideoInfos((prevInfos) => ({ ...prevInfos, [key]: info })),
    [],
  );
  const isVideo = VIDEO_EXT.test(item.key);
  const stageVideos = (isVideo && !videoInfo ? [item] : [prev, item, next]).filter(
    (v): v is MomentItem => Boolean(v) && VIDEO_EXT.test(v!.key),
  );
  const ratioOf = (key: string) => {
    const i = videoInfos[key];
    return i && i.w ? i.w / i.h : null;
  };
  const dims = item.dims ?? (videoInfo && videoInfo.w ? [videoInfo.w, videoInfo.h] : null);
  const durationSecs =
    item.duration ?? (videoInfo && Number.isFinite(videoInfo.duration) ? videoInfo.duration : null);
  const duration = isVideo && durationSecs != null ? formatDuration(durationSecs) : "";
  const meta = [
    dims ? `${dims[0]}×${dims[1]}` : "",
    duration,
  ].filter(Boolean);
  const [cityFor, setCityFor] = useState<string | null>(null);
  const concertMatch = concerts.some((c) => concertKey(c) === concertKeyOf(item));
  const editingCity =
    cityFor === item.key || (!!item.city && !concertMatch && !item.offConcert);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.fullscreenElement) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        onStep(e.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, onStep]);

  useEffect(() => {
    for (const n of [prev, next]) {
      if (n && !VIDEO_EXT.test(n.key)) new Image().src = n.large ?? n.thumb ?? n.url;
    }
  }, [prev, next]);

  async function rename() {
    const name = window.prompt("Rename to:", bareName(item.key));
    if (name === null || !name.trim()) return;
    setBusy(true);
    try {
      onUpdate(item.key, await renameFile(item.key, name));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveItemCity(city: string, show?: string) {
    setBusy(true);
    try {
      onUpdate(item.key, await saveCity(item.key, city.trim(), show));
      setCityFor(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save city");
    } finally {
      setBusy(false);
    }
  }

  async function savePlaceForItem(place: string) {
    setBusy(true);
    try {
      onUpdate(item.key, await savePlace(item.key, place));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save place");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this file forever?")) return;
    setBusy(true);
    try {
      await deleteFile(item.key);
      onRemove(item.key);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const pill =
    "relative before:absolute before:-inset-1 before:content-[''] sm:before:content-none inline-flex items-center rounded-full border border-white/30 px-3 py-2 text-sm font-medium text-white/90 transition-all active:scale-95 disabled:opacity-50";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 !mt-0 flex flex-col bg-black/90"
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2" style={{ containerType: "size" }}>
        {prev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/70"
          >
            <CaretLeftIcon size={22} weight="bold" />
          </button>
        )}
        {next && (
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/70"
          >
            <CaretRightIcon size={22} weight="bold" />
          </button>
        )}
        {stageVideos.map((v) => (
          <StageVideo key={v.key} item={v} active={v.key === item.key} ratio={ratioOf(v.key)} onInfo={recordInfo} />
        ))}
        {!isVideo && (
          <img
            src={item.large ?? item.thumb ?? item.url}
            alt=""
            decoding="async"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="space-y-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:order-first sm:pb-3"
      >
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-white/60">
          <ConcertSelect
            concerts={concerts}
            value={
              cityFor === item.key
                ? OTHER_CITY
                : concertMatch
                  ? concertKeyOf(item)
                  : item.offConcert
                    ? OFF_CONCERT
                    : editingCity
                      ? OTHER_CITY
                      : ""
            }
            disabled={busy}
            canOff={!!item.city}
            onPick={(c) => saveItemCity(c.label, c.date)}
            onOff={() => saveItemCity("", OFF_CONCERT)}
            onOther={() => setCityFor(item.key)}
            className="rounded-full border border-white/30 bg-white/5 px-2.5 py-1 text-sm text-white focus:border-[#d4a553] focus:outline-none min-h-11 sm:min-h-0 [&_option]:text-neutral-900"
          />
          {item.city && !concertMatch && (
            <PlaceInput
              value={item.place ?? ""}
              disabled={busy}
              onSave={savePlaceForItem}
              className="min-w-0 rounded-full border border-white/30 bg-white/5 px-3 py-1 text-base text-white placeholder:text-white/40 focus:border-[#d4a553] focus:outline-none min-h-11 sm:min-h-0 sm:w-44 sm:text-sm"
            />
          )}
          {editingCity ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveItemCity(new FormData(e.currentTarget).get("city")?.toString() ?? "");
              }}
              className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto"
            >
              <input
                name="city"
                type="text"
                list="moment-cities"
                defaultValue={item.city ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCityFor(null);
                }}
                placeholder="City, ST"
                aria-label="City"
                autoComplete="off"
                autoFocus={cityFor === item.key}
                className="min-w-0 flex-1 rounded-full border border-white/30 bg-white/5 px-3 py-1.5 text-base text-white placeholder:text-white/40 focus:border-[#d4a553] focus:outline-none min-h-11 sm:min-h-0 sm:w-56 sm:flex-none sm:text-sm"
              />
              <button type="submit" disabled={busy} className={`${pill} !py-1.5`}>
                Save
              </button>
              {(concertMatch || !item.city || item.offConcert) && (
                <button type="button" onClick={() => setCityFor(null)} className={`${pill} !py-1.5`}>
                  Cancel
                </button>
              )}
            </form>
          ) : null}
          <Stamp item={item} />
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(item.key)}
            className={`relative before:absolute before:-inset-1 before:content-[''] sm:before:content-none inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
              order > 0
                ? "bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a]"
                : "border border-white/30 text-white"
            }`}
          >
            {order > 0 ? `Deselect (${order})` : "Select"}
          </button>
          {!isVideo && (
            <button type="button" onClick={() => onSetOg(item.key)} aria-pressed={isOg} className={pill}>
              {isOg ? "Link preview" : "Set as link preview"}
            </button>
          )}
          <a href={item.downloadUrl} className={pill}>
            Download
          </a>
          {item.hasOriginal && (
            <button type="button" onClick={rename} disabled={busy} className={pill}>
              Rename
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`${pill} !border-red-400/60 !text-red-300`}
          >
            Delete
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className={`${pill} ml-auto !px-2.5`}>
            <XIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

type DragStart = { kind: "tile"; key: string } | { kind: "group"; group: string };

function useReorderDrag({
  keys,
  onReorder,
  groupKeyOf,
  onTap,
}: {
  keys: string[];
  onReorder: (keys: string[]) => void;
  groupKeyOf: (key: string) => string;
  onTap?: (key: string) => void;
}) {
  const [drag, setDrag] = useState<(DragStart & { order: string[] }) | null>(null);
  const order = drag ? drag.order : keys;
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const blockScroll = useRef<((e: TouchEvent) => void) | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      if (press.current) clearTimeout(press.current.timer);
      if (blockScroll.current) document.removeEventListener("touchmove", blockScroll.current);
    },
    [],
  );

  function clearPress() {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }
  function releaseScroll() {
    if (blockScroll.current) {
      document.removeEventListener("touchmove", blockScroll.current);
      blockScroll.current = null;
    }
  }
  // Capture on the strip, not the pressed tile: reordering moves the tile in
  // the DOM, which silently releases its capture and strands the drag.
  function capture(pointerId: number) {
    try {
      stripRef.current?.setPointerCapture(pointerId);
    } catch {}
  }
  function lift(pointerId: number, start: DragStart) {
    const stop = (ev: TouchEvent) => ev.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    blockScroll.current = stop;
    capture(pointerId);
    setDrag({ ...start, order: keys });
  }
  // Mouse drags immediately; touch lifts after a hold so horizontal swipes still
  // scroll the strip.
  function startDrag(e: React.PointerEvent, start: DragStart) {
    pointer.current = { x: e.clientX, y: e.clientY };
    origin.current = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "mouse") {
      e.preventDefault();
      capture(e.pointerId);
      setDrag({ ...start, order: keys });
      return;
    }
    const pointerId = e.pointerId;
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        lift(pointerId, start);
      }, 350),
    };
  }
  function dragOver(e: React.PointerEvent) {
    if (press.current) {
      if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) {
        clearPress();
      }
      return;
    }
    if (!drag) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    hitTest(e.clientX, e.clientY);
  }
  function hitTest(x: number, y: number) {
    if (!drag) return;
    const under = document.elementFromPoint(x, y);
    if (drag.kind === "tile") {
      const overKey = under?.closest<HTMLElement>("[data-key]")?.dataset.key;
      if (!overKey || overKey === drag.key) return;
      const next = [...drag.order];
      next.splice(next.indexOf(drag.key), 1);
      next.splice(next.indexOf(overKey), 0, drag.key);
      if (next.join("|") !== drag.order.join("|")) setDrag({ ...drag, order: next });
      return;
    }
    const overGroup = under?.closest<HTMLElement>("[data-group]")?.dataset.group;
    if (overGroup === undefined || overGroup === drag.group) return;
    const groups: { group: string; keys: string[] }[] = [];
    for (const k of drag.order) {
      const g = groupKeyOf(k);
      const last = groups[groups.length - 1];
      if (last && last.group === g) last.keys.push(k);
      else groups.push({ group: g, keys: [k] });
    }
    const from = groups.findIndex((g) => g.group === drag.group);
    if (from < 0) return;
    const [grp] = groups.splice(from, 1);
    const to = groups.findIndex((g) => g.group === overGroup);
    if (to < 0) return;
    groups.splice(to, 0, grp);
    const next = groups.flatMap((g) => g.keys);
    if (next.join("|") !== drag.order.join("|")) setDrag({ ...drag, order: next });
  }
  // Edge auto-scroll: while dragging, glide the strip when the pointer nears
  // either edge, then re-run the hit test since no pointermove fires while
  // content slides under a stationary finger.
  useEffect(() => {
    if (!drag) return;
    const el = stripRef.current;
    if (!el) return;
    const EDGE = 56;
    const MAX = 14;
    const speed = (depth: number) => Math.ceil((Math.min(depth, EDGE) / EDGE) * MAX);
    let raf = 0;
    const tick = () => {
      const p = pointer.current;
      if (p) {
        const r = el.getBoundingClientRect();
        let dx = 0;
        if (p.x < r.left + EDGE) dx = -speed(r.left + EDGE - p.x);
        else if (p.x > r.right - EDGE) dx = speed(p.x - (r.right - EDGE));
        if (dx) {
          const before = el.scrollLeft;
          el.scrollLeft += dx;
          if (el.scrollLeft !== before) hitTest(p.x, p.y);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  function endDrag() {
    clearPress();
    releaseScroll();
    if (!drag) return;
    const moved = drag.order.join("|") !== keys.join("|");
    if (moved) onReorder(drag.order);
    else if (drag.kind === "tile" && onTap && pointer.current && origin.current) {
      if (Math.hypot(pointer.current.x - origin.current.x, pointer.current.y - origin.current.y) < 8) {
        onTap(drag.key);
      }
    }
    setDrag(null);
  }
  function moveTo(key: string, pos: number) {
    const from = keys.indexOf(key);
    const to = Math.min(keys.length - 1, Math.max(0, pos - 1));
    if (to === from) return;
    const moved = [...keys];
    moved.splice(from, 1);
    moved.splice(to, 0, key);
    onReorder(moved);
  }
  function step(key: string, delta: number) {
    moveTo(key, keys.indexOf(key) + 1 + delta);
  }

  return { drag, order, stripRef, startDrag, dragOver, endDrag, moveTo, step };
}

function SlideshowReorder({
  items,
  onReorder,
  onRemove,
}: {
  items: MomentItem[];
  onReorder: (keys: string[]) => void;
  onRemove: (key: string) => void;
}) {
  const keys = items.map((it) => it.key);
  const byKey = useMemo(
    () => new Map(items.map((it) => [it.key, it] as const)),
    [items],
  );
  const groupKeyOf = (k: string) => groupOf(byKey.get(k));
  const { drag, order, stripRef, startDrag, dragOver, endDrag, moveTo, step } = useReorderDrag({
    keys,
    onReorder,
    groupKeyOf,
  });

  const [ready, setReady] = useState(false);
  const imgSig = items
    .filter((it) => !VIDEO_EXT.test(it.key))
    .map((it) => it.thumb ?? it.url)
    .sort()
    .join("\n");
  useEffect(() => {
    setReady(false);
    if (!imgSig) {
      setReady(true);
      return;
    }
    const urls = imgSig.split("\n");
    let active = true;
    let loaded = 0;
    const done = () => {
      if (active && ++loaded >= urls.length) setReady(true);
    };
    for (const u of urls) {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = u;
    }
    const fallback = setTimeout(() => {
      if (active) setReady(true);
    }, 3000);
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, [imgSig]);

  return (
    <section className="space-y-3">
      <style>{`@keyframes momentThumbIn{from{opacity:0}to{opacity:1}}`}</style>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Slideshow order
        </h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          {items.length}
        </span>
      </div>
      <div
        ref={stripRef}
        onPointerMove={dragOver}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        className={`mr-[calc(50%-50vw)] flex select-none gap-3 overflow-x-auto pb-2 ${drag ? "cursor-grabbing" : ""}`}
      >
        {order.map((key, i) => {
          const item = byKey.get(key);
          if (!item) return null;
          const city = item.city;
          const detail = [item.visit ? formatVisit(item.visit) : "", item.leg]
            .filter(Boolean)
            .join(" ");
          const group = groupKeyOf(key);
          const groupDragging = drag?.kind === "group" && drag.group === group;
          const dragging = groupDragging || (drag?.kind === "tile" && drag.key === key);
          const groupStart = i === 0 || groupKeyOf(order[i - 1]) !== group;
          return (
            <div key={key} className="flex shrink-0 items-start gap-3">
              {groupStart && (
                <div
                  data-group={group}
                  onPointerDown={(e) => startDrag(e, { kind: "group", group })}
                  className={`flex items-center px-1 ${groupDragging ? "cursor-grabbing" : "cursor-grab"}`}
                >
                  <span
                    style={{ writingMode: "vertical-rl" }}
                    className={`block max-h-32 rotate-180 overflow-hidden text-ellipsis text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      city ? "text-neutral-400 dark:text-neutral-500" : "text-amber-500"
                    }`}
                  >
                    {city || "No city"}
                    {detail && (
                      <span className="block font-normal normal-case tracking-normal opacity-70">
                        {detail}
                      </span>
                    )}
                  </span>
                </div>
              )}
            <div
              data-key={key}
              data-group={group}
              onPointerDown={(e) => startDrag(e, { kind: "tile", key })}
              className={`relative shrink-0 w-28 cursor-grab select-none overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 transition-shadow ${
                dragging ? "cursor-grabbing opacity-60 shadow-lg ring-2 ring-[#d4a553]" : ""
              }`}
            >
              <div className="pointer-events-none aspect-square">
                <SlideThumb item={item} index={i} ready={ready} />
              </div>
              <PositionInput value={i + 1} max={order.length} onCommit={(pos) => moveTo(key, pos)} />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(item.key)}
                aria-label="Remove from slideshow"
                title="Remove from slideshow"
                className="before:absolute before:-inset-1 before:content-[''] sm:before:content-none absolute top-1 right-1 inline-flex h-9 w-9 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors"
              >
                <CloseIcon />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => step(key, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="flex flex-1 items-center justify-center bg-black/55 py-3 sm:py-1.5 text-white transition-colors hover:bg-[#d4a553] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:bg-black/55 disabled:hover:text-white"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => step(key, 1)}
                  disabled={i === order.length - 1}
                  aria-label="Move later"
                  className="flex flex-1 items-center justify-center border-l border-white/15 bg-black/55 py-3 sm:py-1.5 text-white transition-colors hover:bg-[#d4a553] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:bg-black/55 disabled:hover:text-white"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        Drag tiles or city labels to reorder (press and hold on mobile), nudge with the arrows, or
        type a position on the badge. This order is what /moments shows. A fund page starts the same
        order at its own leg's first stop.
      </p>
    </section>
  );
}

function PostTray({
  items,
  labeled,
  onReorder,
  onOpen,
}: {
  items: MomentItem[];
  labeled: Set<string>;
  onReorder: (keys: string[]) => void;
  onOpen: (key: string) => void;
}) {
  const keys = items.map((it) => it.key);
  const byKey = new Map(items.map((it) => [it.key, it] as const));
  const { drag, order, stripRef, startDrag, dragOver, endDrag, moveTo } = useReorderDrag({
    keys,
    onReorder,
    groupKeyOf: () => "",
    onTap: onOpen,
  });
  return (
    <div
      ref={stripRef}
      onPointerMove={dragOver}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      className={`mx-auto -mt-1 mb-1 flex max-w-7xl select-none gap-3 overflow-x-auto pb-1 pl-3 pt-3 ${drag ? "cursor-grabbing" : ""}`}
    >
      {order.map((key, i) => {
        const item = byKey.get(key);
        if (!item) return null;
        return (
          <div
            key={key}
            data-key={key}
            onPointerDown={(e) => startDrag(e, { kind: "tile", key })}
            onClick={(e) => {
              if (!(e.target instanceof HTMLInputElement)) onOpen(key);
            }}
            className={`relative h-14 w-14 shrink-0 cursor-grab overflow-visible rounded-lg ${
              drag?.kind === "tile" && drag.key === key ? "opacity-60 ring-2 ring-[#d4a553]" : ""
            }`}
          >
            <div className="pointer-events-none h-full w-full overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
              <SlideThumb item={item} index={0} ready />
            </div>
            {labeled.has(key) && (
              <span
                title="Gets the city label"
                className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[#d4a553] ring-1 ring-black/50"
              />
            )}
            <PositionInput
              value={i + 1}
              max={order.length}
              onCommit={(pos) => moveTo(key, pos)}
              position="-top-2 -left-2 sm:top-1 sm:left-1"
              size="h-11 w-11 border-[10px] border-transparent bg-clip-padding sm:h-5 sm:w-7 sm:border-0 sm:bg-clip-border"
            />
          </div>
        );
      })}
    </div>
  );
}

function SlideThumb({ item, index, ready }: { item: MomentItem; index: number; ready: boolean }) {
  const cls = "h-full w-full object-cover";
  const style = ready
    ? { animation: `momentThumbIn 700ms ease-out both`, animationDelay: `${index * STAGGER_MS}ms` }
    : { opacity: 0 };
  if (VIDEO_EXT.test(item.key) && !item.thumb) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-800" style={style}>
        <PlayIcon size={22} weight="fill" className="text-white/70" />
      </div>
    );
  }
  return (
    <img src={item.thumb ?? item.url} alt="" decoding="async" className={cls} style={style} />
  );
}

function PositionInput({
  value,
  max,
  onCommit,
  position = "top-0.5 left-0 sm:top-1 sm:left-1",
  size = "h-11 w-11 border-x-4 border-b-[10px] border-t-[2px] border-transparent bg-clip-padding sm:h-5 sm:w-7 sm:border-0 sm:bg-clip-border",
}: {
  value: number;
  max: number;
  onCommit: (pos: number) => void;
  position?: string;
  size?: string;
}) {
  return (
    <input
      key={value}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      defaultValue={value}
      aria-label="Slideshow position"
      title="Type a position and press Enter"
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "Escape") {
          e.currentTarget.value = String(value);
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const n = parseInt(e.currentTarget.value, 10);
        const pos = Number.isNaN(n) ? value : Math.min(max, Math.max(1, n));
        e.currentTarget.value = String(value);
        if (pos !== value) onCommit(pos);
      }}
      className={`absolute ${position} ${size} select-text rounded-full bg-[#d4a553] text-center text-xs sm:text-[10px] font-bold tabular-nums text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-white/80`}
    />
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const FILE_CONCURRENCY = 3;

function AdminUpload({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ files: string; pct: number } | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const queue = Array.from(files);
    const percents = queue.map(() => 0);
    const totalBytes = queue.reduce((sum, f) => sum + f.size, 0) || 1;
    let doneFiles = 0;
    const show = () =>
      setProgress({
        files: `${doneFiles}/${queue.length}`,
        pct: Math.round(
          percents.reduce((sum, p, i) => sum + p * queue[i].size, 0) / totalBytes,
        ),
      });
    let processChain: Promise<unknown> = Promise.resolve();
    const processInBackground = (key: string) => {
      processChain = processChain
        .then(() =>
          fetch("/api/admin/moments/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          }),
        )
        .catch(() => {});
    };

    let firstError = "";
    let next = 0;
    try {
      show();
      await Promise.all(
        Array.from({ length: Math.min(FILE_CONCURRENCY, queue.length) }, async () => {
          while (next < queue.length) {
            const i = next++;
            try {
              const result = await uploadFile(queue[i], { passcode: "" }, (pct) => {
                percents[i] = pct;
                show();
              });
              percents[i] = 100;
              doneFiles++;
              show();
              processInBackground(result.key);
            } catch (err) {
              if (!firstError) firstError = err instanceof Error ? err.message : "Upload failed";
            }
          }
        }),
      );
      if (firstError) setError(firstError);
      if (doneFiles > 0) {
        onDone();
        processChain.then(() => onDone());
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <label
      className={`flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors ${
        busy
          ? "cursor-wait opacity-60 border-neutral-300 dark:border-neutral-700"
          : "cursor-pointer border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553]"
      }`}
    >
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
      <UploadIcon />
      {busy
        ? progress
          ? `Uploading ${progress.pct}% (${progress.files})`
          : "Uploading..."
        : "Upload photos or videos"}
      {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}
