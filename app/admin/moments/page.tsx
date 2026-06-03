"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface MomentItem {
  key: string;
  size: number;
  lastModified: string | null;
  url: string;
  downloadUrl: string;
  featured: boolean;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;

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
  const [featuredKeys, setFeaturedKeys] = useState<string[]>([]);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const load = useCallback(async (initial: boolean) => {
    try {
      const r = await fetch("/api/admin/moments");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Failed (${r.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setFeaturedKeys(Array.isArray(data.featuredKeys) ? data.featuredKeys : []);
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
    }
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
    setFeaturedKeys((prev) => prev.filter((k) => k !== key));
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
    const r = await fetch("/api/admin/moments/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, featured: next }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || "Failed");
    }
    setFeaturedKeys((prev) =>
      next
        ? prev.includes(key)
          ? prev
          : [...prev, key]
        : prev.filter((k) => k !== key),
    );
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
          {featuredItems.length > 0 && (
            <SlideshowReorder
              items={featuredItems}
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
  onPrev,
  onNext,
  onRemove,
  onUpdate,
  onToggleFeatured,
}: {
  item: MomentItem;
  featured: boolean;
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

      <div className="flex items-center gap-2">
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
              src={item.url}
              alt={bareName(item.key)}
              decoding="async"
              onLoad={(e) =>
                setDims({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
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
  const [drag, setDrag] = useState<{ key: string; order: string[] } | null>(null);
  const order = drag ? drag.order : keys;

  function startDrag(e: React.PointerEvent, key: string) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ key, order: keys });
  }
  function dragOver(e: React.PointerEvent) {
    if (!drag) return;
    const overKey = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-key]")?.dataset.key;
    if (!overKey || overKey === drag.key) return;
    const next = [...drag.order];
    next.splice(next.indexOf(drag.key), 1);
    next.splice(next.indexOf(overKey), 0, drag.key);
    if (next.join("|") !== drag.order.join("|")) setDrag({ key: drag.key, order: next });
  }
  function endDrag() {
    if (!drag) return;
    if (drag.order.join("|") !== keys.join("|")) onReorder(drag.order);
    setDrag(null);
  }
  function step(key: string, delta: number) {
    const from = keys.indexOf(key);
    const to = from + delta;
    if (to < 0 || to >= keys.length) return;
    const next = [...keys];
    next.splice(from, 1);
    next.splice(to, 0, key);
    onReorder(next);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Slideshow order
        </h2>
        <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
          {items.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {order.map((key, i) => {
          const item = byKey.get(key);
          if (!item) return null;
          const dragging = drag?.key === key;
          return (
            <div
              key={key}
              data-key={key}
              onPointerDown={(e) => startDrag(e, key)}
              onPointerMove={dragOver}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ touchAction: "pan-y" }}
              className={`relative shrink-0 w-28 cursor-grab select-none overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 transition-shadow ${
                dragging ? "cursor-grabbing opacity-60 shadow-lg ring-2 ring-[#d4a553]" : ""
              }`}
            >
              <div className="pointer-events-none aspect-square">
                {VIDEO_EXT.test(item.key) ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span className="absolute top-1 left-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#d4a553] px-1 text-[10px] font-bold text-[#0a0a0a]">
                {i + 1}
              </span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(item.key)}
                aria-label="Remove from slideshow"
                title="Remove from slideshow"
                className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors"
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
                  className="flex flex-1 items-center justify-center bg-black/55 py-1.5 text-white transition-colors hover:bg-[#d4a553] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:bg-black/55 disabled:hover:text-white"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => step(key, 1)}
                  disabled={i === order.length - 1}
                  aria-label="Move later"
                  className="flex flex-1 items-center justify-center border-l border-white/15 bg-black/55 py-1.5 text-white transition-colors hover:bg-[#d4a553] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:bg-black/55 disabled:hover:text-white"
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        Drag a tile to reorder the slideshow, or nudge with the arrows. ✕ removes it.
      </p>
    </section>
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

function AdminUpload({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const queue = Array.from(files);
      const uploadOne = async (file: File) => {
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
      };

      const FILE_CONCURRENCY = 3;
      let nextIndex = 0;
      let firstError = "";
      await Promise.all(
        Array.from({ length: Math.min(FILE_CONCURRENCY, queue.length) }, async () => {
          while (nextIndex < queue.length) {
            const file = queue[nextIndex++];
            try {
              await uploadOne(file);
            } catch (err) {
              if (!firstError) firstError = err instanceof Error ? err.message : "Upload failed";
            }
          }
        }),
      );
      if (firstError) setError(firstError);
      else onDone();
    } finally {
      setBusy(false);
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
      {busy ? "Uploading..." : "Upload photos or videos"}
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
