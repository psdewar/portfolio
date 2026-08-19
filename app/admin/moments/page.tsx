"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MomentItem {
  key: string;
  size: number;
  lastModified: string | null;
  url: string;
  thumb?: string;
  downloadUrl: string;
  featured: boolean;
  city?: string;
}

interface PendingItem {
  key: string;
  lastModified: string | null;
  url: string;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const STAGGER_MS = 70;

function filename(key: string) {
  return key.replace(/^drops\//, "");
}

function bareName(key: string) {
  return filename(key).replace(/^\d+-/, "");
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function takenAt(key: string): number | null {
  const m = key.match(/^drops\/[a-f0-9]{64}-(\d+)\./);
  return m ? Number(m[1]) : null;
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(s: number) {
  if (!Number.isFinite(s)) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function videoQuality(w: number, h: number) {
  const p = Math.min(w, h);
  if (p >= 2160) return { label: "4K", tier: 4 };
  if (p >= 1440) return { label: "1440p", tier: 3 };
  if (p >= 1080) return { label: "1080p", tier: 2 };
  if (p >= 720) return { label: "720p", tier: 1 };
  return { label: "SD", tier: 0 };
}

export default function MomentsAdminPage() {
  const [items, setItems] = useState<MomentItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [featuredKeys, setFeaturedKeys] = useState<string[]>([]);
  const [legCities, setLegCities] = useState<string[]>([]);
  const [ogKey, setOgKeyState] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const load = useCallback(async (initial: boolean) => {
    try {
      const r = await fetch("/api/admin/moments");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Failed (${r.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setPending(Array.isArray(data.pending) ? data.pending : []);
      setFeaturedKeys(Array.isArray(data.featuredKeys) ? data.featuredKeys : []);
      setLegCities(Array.isArray(data.legCities) ? data.legCities : []);
      setOgKeyState(typeof data.ogKey === "string" ? data.ogKey : null);
      if (initial) setState({ kind: "ready" });
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

  function updateItem(key: string, patch: Partial<MomentItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    if (patch.key && patch.key !== key) {
      setFeaturedKeys((prev) => prev.map((k) => (k === key ? patch.key! : k)));
      setOgKeyState((prev) => (prev === key ? patch.key! : prev));
    }
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setFeaturedKeys((prev) => prev.filter((k) => k !== key));
    setOgKeyState((prev) => (prev === key ? null : prev));
  }

  const featuredSet = useMemo(() => new Set(featuredKeys), [featuredKeys]);
  const itemByKey = useMemo(
    () => new Map(items.map((it) => [it.key, it] as const)),
    [items],
  );
  const featuredItems = featuredKeys
    .map((k) => itemByKey.get(k))
    .filter((it): it is MomentItem => Boolean(it));

  async function toggleFeatured(key: string, next: boolean) {
    if (next) {
      if (featuredKeys.includes(key)) return;
      const city = itemByKey.get(key)?.city;
      const state = city?.split(", ").pop();
      const cities = featuredKeys.map((k) => itemByKey.get(k)?.city);
      let at = city ? cities.lastIndexOf(city) : -1;
      if (at < 0 && state) {
        for (let j = cities.length - 1; j >= 0; j--) {
          if (cities[j]?.split(", ").pop() === state) {
            at = j;
            break;
          }
        }
      }
      const keys = [...featuredKeys];
      keys.splice(at >= 0 ? at + 1 : keys.length, 0, key);
      const r = await fetch("/api/admin/moments/feature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setFeaturedKeys(keys);
      return;
    }
    const r = await fetch("/api/admin/moments/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, featured: false }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || "Failed");
    }
    setFeaturedKeys((prev) => prev.filter((k) => k !== key));
  }

  async function persistOrder(nextKeys: string[]) {
    const prevKeys = featuredKeys;
    setFeaturedKeys(nextKeys);
    try {
      const r = await fetch("/api/admin/moments/feature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: nextKeys }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setFeaturedKeys(prevKeys);
      window.alert("Could not save the new order.");
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

  const photos = items.filter((it) => !VIDEO_EXT.test(it.key));
  const videos = items.filter((it) => VIDEO_EXT.test(it.key));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
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
          {pending.length > 0 && (
            <PendingStrip
              items={pending}
              onDelete={async (key) => {
                const r = await fetch("/api/admin/moments", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key }),
                });
                if (!r.ok) {
                  window.alert("Delete failed");
                  return;
                }
                setPending((prev) => prev.filter((p) => p.key !== key));
              }}
            />
          )}
          {featuredItems.length > 0 && (
            <SlideshowReorder
              items={featuredItems}
              legCities={legCities}
              onReorder={persistOrder}
              onRemove={(key) =>
                toggleFeatured(key, false).catch(() =>
                  window.alert("Could not remove from slideshow."),
                )
              }
            />
          )}
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            <Lane
              label="Photos"
              items={photos}
              index={photoIndex}
              featuredSet={featuredSet}
              ogKey={ogKey}
              onSetOg={setOg}
              onPrev={() => setPhotoIndex((i) => i - 1)}
              onNext={() => setPhotoIndex((i) => i + 1)}
              onRemove={removeItem}
              onUpdate={updateItem}
              onToggleFeatured={toggleFeatured}
            />
            <Lane
              label="Videos"
              items={videos}
              index={videoIndex}
              featuredSet={featuredSet}
              ogKey={ogKey}
              onSetOg={setOg}
              onPrev={() => setVideoIndex((i) => i - 1)}
              onNext={() => setVideoIndex((i) => i + 1)}
              onRemove={removeItem}
              onUpdate={updateItem}
              onToggleFeatured={toggleFeatured}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Lane({
  label,
  items,
  index,
  featuredSet,
  ogKey,
  onSetOg,
  onPrev,
  onNext,
  onRemove,
  onUpdate,
  onToggleFeatured,
}: {
  label: string;
  items: MomentItem[];
  index: number;
  featuredSet: Set<string>;
  ogKey: string | null;
  onSetOg: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<MomentItem>) => void;
  onToggleFeatured: (key: string, next: boolean) => Promise<void>;
}) {
  const total = items.length;
  const effectiveIndex = total ? ((index % total) + total) % total : 0;
  const item = items[effectiveIndex];

  return (
    <section className="flex-1 min-w-0 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          {item ? `${effectiveIndex + 1} / ${total}` : "0"}
        </span>
      </div>

      {item ? (
        <ReviewCard
          key={item.key}
          item={item}
          featured={featuredSet.has(item.key)}
          isOg={ogKey === item.key}
          onSetOg={onSetOg}
          onPrev={onPrev}
          onNext={onNext}
          onRemove={onRemove}
          onUpdate={onUpdate}
          onToggleFeatured={onToggleFeatured}
        />
      ) : (
        <div className="aspect-square flex items-center justify-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-sm text-neutral-400 dark:text-neutral-500">
          No {label.toLowerCase()} left.
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  item,
  featured,
  isOg,
  onSetOg,
  onPrev,
  onNext,
  onRemove,
  onUpdate,
  onToggleFeatured,
}: {
  item: MomentItem;
  featured: boolean;
  isOg: boolean;
  onSetOg: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<MomentItem>) => void;
  onToggleFeatured: (key: string, next: boolean) => Promise<void>;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  const quality = isVideo && dims ? videoQuality(dims.w, dims.h) : null;
  const taken = takenAt(item.key);

  const meta: string[] = [];
  if (dims) meta.push(`${dims.w}×${dims.h}`);
  if (isVideo && duration) meta.push(formatDuration(duration));
  if (!isVideo && dims) meta.push(`${((dims.w * dims.h) / 1e6).toFixed(1)}MP`);
  if (item.size) meta.push(formatBytes(item.size));
  if (isVideo && duration && item.size) {
    meta.push(`${((item.size * 8) / duration / 1e6).toFixed(1)} Mbps`);
  }

  async function remove() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/moments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        window.alert(d.error || "Delete failed");
        setBusy(false);
        return;
      }
      onRemove(item.key);
    } catch {
      window.alert("Delete failed");
      setBusy(false);
    }
  }

  async function editCity() {
    const city = window.prompt('City shown on the slider (e.g. "Fulton, MD"):', item.city || "");
    if (city === null) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/moments/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, city }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        window.alert(d.error || "Could not save city");
        return;
      }
      onUpdate(item.key, { city: d.city || undefined });
    } catch {
      window.alert("Could not save city");
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const name = window.prompt("Rename to:", bareName(item.key));
    if (name === null || !name.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/moments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        window.alert(d.error || "Rename failed");
        return;
      }
      onUpdate(item.key, { key: d.key, url: d.url, downloadUrl: d.downloadUrl });
    } catch {
      window.alert("Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured() {
    setBusy(true);
    try {
      await onToggleFeatured(item.key, !featured);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553] transition-all active:scale-95"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border-2 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-95 disabled:opacity-50"
        >
          <TrashIcon />
          Delete forever
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553] transition-all active:scale-95"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleFeatured}
          disabled={busy}
          aria-pressed={featured}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
            featured
              ? "bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a] shadow-sm hover:shadow"
              : "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553]"
          }`}
        >
          <StarIcon filled={featured} />
          {featured ? "In slideshow" : "Add to slideshow"}
        </button>
        {!isVideo && (
          <button
            type="button"
            onClick={() => onSetOg(item.key)}
            disabled={busy}
            aria-pressed={isOg}
            title="Use this photo as the link preview for /moments and /fund"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
              isOg
                ? "bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a] shadow-sm hover:shadow"
                : "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553]"
            }`}
          >
            {isOg ? "Link preview" : "Set as link preview"}
          </button>
        )}
        <button
          type="button"
          onClick={editCity}
          disabled={busy}
          title="City flashed on the public slider"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
            item.city
              ? "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553]"
              : "border border-dashed border-amber-500/70 text-amber-600 dark:text-amber-400 hover:border-amber-500"
          }`}
        >
          {item.city || "Set city"}
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton href={item.downloadUrl} label="Download">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={rename} disabled={busy} label="Rename">
            <PencilIcon />
          </IconButton>
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {filename(item.key)}
        </p>
        <p className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
          {[
            taken ? `Taken ${formatDate(new Date(taken).toISOString())}` : "",
            `Uploaded ${formatDate(item.lastModified)}`,
            ...meta,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="aspect-square flex items-center justify-center">
          {isVideo ? (
            <video
              key={item.key}
              src={item.url}
              controls
              preload="metadata"
              playsInline
              onLoadedMetadata={(e) => {
                setDims({
                  w: e.currentTarget.videoWidth,
                  h: e.currentTarget.videoHeight,
                });
                setDuration(e.currentTarget.duration);
              }}
              className="max-h-full max-w-full"
            />
          ) : (
            <img
              key={item.key}
              src={fallbackSrc ?? item.url}
              alt={bareName(item.key)}
              decoding="async"
              onLoad={(e) =>
                setDims({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              onError={() => {
                if (item.thumb && !fallbackSrc) setFallbackSrc(item.thumb);
              }}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {featured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[#d4a553] text-[#0a0a0a]">
            Slideshow
          </span>
        )}
        {quality && (
          <span
            className={`absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              quality.tier === 4
                ? "bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a] shadow-[0_0_14px_rgba(212,165,83,0.55)]"
                : "bg-black/55 text-white"
            }`}
          >
            {quality.tier === 4 && <SparkIcon />}
            {quality.label}
          </span>
        )}
      </div>
    </div>
  );
}

function PendingStrip({
  items,
  onDelete,
}: {
  items: PendingItem[];
  onDelete: (key: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Previews awaiting full quality
        </h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          {items.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((it) => (
          <div
            key={it.key}
            className="relative shrink-0 w-28 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900"
          >
            <div className="aspect-square">
              <img src={it.url} alt="" decoding="async" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => onDelete(it.key)}
              aria-label="Delete preview"
              title="Delete preview"
              className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors"
            >
              <CloseIcon />
            </button>
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-center text-[10px] tabular-nums text-white">
              {formatDate(it.lastModified)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        The full-quality file is still uploading or never finished. Previews stand in until it
        lands.
      </p>
    </section>
  );
}

function SlideshowReorder({
  items,
  legCities,
  onReorder,
  onRemove,
}: {
  items: MomentItem[];
  legCities: string[];
  onReorder: (keys: string[]) => void;
  onRemove: (key: string) => void;
}) {
  const keys = items.map((it) => it.key);
  const byKey = useMemo(
    () => new Map(items.map((it) => [it.key, it] as const)),
    [items],
  );
  const cityOf = (k: string) => byKey.get(k)?.city;
  const legSet = useMemo(() => new Set(legCities), [legCities]);
  type DragStart = { kind: "tile"; key: string } | { kind: "city"; city: string };
  const [drag, setDrag] = useState<(DragStart & { order: string[] }) | null>(null);
  const order = drag ? drag.order : keys;

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

  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const blockScroll = useRef<((e: TouchEvent) => void) | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

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
    const overCity = under?.closest<HTMLElement>("[data-city]")?.dataset.city;
    if (overCity === undefined || overCity === drag.city) return;
    const groups: { city: string; keys: string[] }[] = [];
    for (const k of drag.order) {
      const c = byKey.get(k)?.city ?? "";
      const last = groups[groups.length - 1];
      if (last && last.city === c) last.keys.push(k);
      else groups.push({ city: c, keys: [k] });
    }
    const from = groups.findIndex((g) => g.city === drag.city);
    if (from < 0) return;
    const [grp] = groups.splice(from, 1);
    const to = groups.findIndex((g) => g.city === overCity);
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
    if (drag.order.join("|") !== keys.join("|")) onReorder(drag.order);
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
          const cityKey = city ?? "";
          const cityDragging = drag?.kind === "city" && drag.city === cityKey;
          const dragging = cityDragging || (drag?.kind === "tile" && drag.key === key);
          const groupStart = i === 0 || cityOf(order[i - 1]) !== city;
          const isLeg = !!city && legSet.has(city);
          return (
            <div key={key} className="flex shrink-0 gap-3">
              {groupStart && (
                <div
                  data-city={cityKey}
                  onPointerDown={(e) => startDrag(e, { kind: "city", city: cityKey })}
                  className={`flex items-center px-1 ${cityDragging ? "cursor-grabbing" : "cursor-grab"}`}
                >
                  <span
                    style={{ writingMode: "vertical-rl" }}
                    className={`rotate-180 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      isLeg
                        ? "text-[#d4a553]"
                        : city
                          ? "text-neutral-400 dark:text-neutral-500"
                          : "text-amber-500"
                    }`}
                  >
                    {city || "No city"}
                  </span>
                </div>
              )}
            <div
              data-key={key}
              data-city={cityKey}
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
                className="absolute top-1 right-1 inline-flex h-9 w-9 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors"
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
        Drag tiles or city labels to reorder, hold first on mobile, nudge with the arrows, or type
        a new number on the badge. ✕ removes it. This order is what /moments shows; gold marks the
        active fund leg&apos;s cities, which lead only on the fund page.
      </p>
    </section>
  );
}

function SlideThumb({ item, index, ready }: { item: MomentItem; index: number; ready: boolean }) {
  const cls = "h-full w-full object-cover";
  const style = ready
    ? { animation: `momentThumbIn 700ms ease-out both`, animationDelay: `${index * STAGGER_MS}ms` }
    : { opacity: 0 };
  if (VIDEO_EXT.test(item.key) && !item.thumb) {
    return (
      <video src={item.url} muted playsInline preload="metadata" className={cls} style={style} />
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
}: {
  value: number;
  max: number;
  onCommit: (pos: number) => void;
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
      className="absolute top-1 left-1 h-8 w-9 sm:h-5 sm:w-7 select-text rounded-full bg-[#d4a553] text-center text-xs sm:text-[10px] font-bold tabular-nums text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-white/80"
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

function IconButton({
  href,
  onClick,
  disabled,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all active:scale-90 disabled:opacity-40 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white";
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cls}
    >
      {children}
    </button>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.6l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.7l1.4-6.3L2.9 9.1l6.4-.6z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m1 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
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

const PART_SIZE = 16 * 1024 * 1024;
const MULTIPART_MIN = 32 * 1024 * 1024;
const PART_CONCURRENCY = 5;
const FILE_CONCURRENCY = 3;

function AdminUpload({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ files: string; pct: number } | null>(null);

  async function api(body: Record<string, unknown>) {
    const r = await fetch("/api/admin/moments/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Upload failed");
    return d;
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const queue = Array.from(files);
    const totalBytes = queue.reduce((s, f) => s + f.size, 0) || 1;
    let doneBytes = 0;
    let doneFiles = 0;
    const tick = (add: number) => {
      doneBytes += add;
      setProgress({
        files: `${doneFiles}/${queue.length}`,
        pct: Math.min(100, Math.round((doneBytes / totalBytes) * 100)),
      });
    };
    // Serialized: concurrent process calls would race the read-modify-write on
    // the thumbs/dims JSON in R2 and drop entries.
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

    const uploadSmall = async (file: File) => {
      const signRes = await fetch("/api/admin/moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(signData.error || "Could not get upload URL");
      const put = await fetch(signData.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      tick(file.size);
      processInBackground(signData.key);
    };

    // Large files: parallel 16MB parts, resumable. Uploaded parts survive an
    // interrupted session; re-picking the same file skips them.
    const uploadLarge = async (file: File) => {
      const memo = `mpu:${file.name}:${file.size}`;
      let session: { key: string; uploadId: string } | null = null;
      try {
        session = JSON.parse(localStorage.getItem(memo) || "null");
      } catch {}
      let have = new Set<number>();
      if (session) {
        try {
          have = new Set<number>((await api({ action: "parts", ...session })).parts);
        } catch {
          session = null;
        }
      }
      if (!session) {
        session = (await api({
          action: "create",
          filename: file.name,
          contentType: file.type,
        })) as { key: string; uploadId: string };
        localStorage.setItem(memo, JSON.stringify(session));
        have = new Set();
      }
      const totalParts = Math.ceil(file.size / PART_SIZE);
      if (have.size) tick(Math.min(have.size * PART_SIZE, file.size));
      const remaining = Array.from({ length: totalParts }, (_, i) => i + 1).filter(
        (n) => !have.has(n),
      );
      let idx = 0;
      await Promise.all(
        Array.from({ length: Math.min(PART_CONCURRENCY, remaining.length) }, async () => {
          while (idx < remaining.length) {
            const n = remaining[idx++];
            const { url } = await api({ action: "sign", ...session, partNumber: n });
            const start = (n - 1) * PART_SIZE;
            const blob = file.slice(start, Math.min(start + PART_SIZE, file.size));
            const put = await fetch(url, { method: "PUT", body: blob });
            if (!put.ok) throw new Error(`Part ${n} failed (${put.status})`);
            tick(blob.size);
          }
        }),
      );
      await api({ action: "complete", ...session });
      localStorage.removeItem(memo);
      processInBackground(session.key);
    };

    let firstError = "";
    const fail = (err: unknown) => {
      if (!firstError) firstError = err instanceof Error ? err.message : "Upload failed";
    };
    try {
      tick(0);
      const smalls = queue.filter((f) => f.size < MULTIPART_MIN);
      const larges = queue.filter((f) => f.size >= MULTIPART_MIN);
      let si = 0;
      await Promise.all(
        Array.from({ length: Math.min(FILE_CONCURRENCY, smalls.length) }, async () => {
          while (si < smalls.length) {
            const file = smalls[si++];
            try {
              await uploadSmall(file);
              doneFiles++;
              tick(0);
            } catch (err) {
              fail(err);
            }
          }
        }),
      );
      for (const file of larges) {
        try {
          await uploadLarge(file);
          doneFiles++;
          tick(0);
        } catch (err) {
          fail(err);
        }
      }
      if (firstError) setError(firstError);
      else processChain.then(() => onDone());
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
