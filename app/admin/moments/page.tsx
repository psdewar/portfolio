"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [state, setState] = useState<State>({ kind: "loading" });
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);

  const load = useCallback(async (initial: boolean) => {
    try {
      const r = await fetch("/api/admin/moments");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Failed (${r.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
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
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
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
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
            <Lane
              label="Photos"
              items={photos}
              index={photoIndex}
              onKeep={() => setPhotoIndex((i) => i + 1)}
              onRemove={removeItem}
              onUpdate={updateItem}
            />
            <Lane
              label="Videos"
              items={videos}
              index={videoIndex}
              onKeep={() => setVideoIndex((i) => i + 1)}
              onRemove={removeItem}
              onUpdate={updateItem}
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
  onKeep,
  onRemove,
  onUpdate,
}: {
  label: string;
  items: MomentItem[];
  index: number;
  onKeep: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<MomentItem>) => void;
}) {
  const total = items.length;
  const effectiveIndex = total ? index % total : 0;
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
          onKeep={onKeep}
          onRemove={onRemove}
          onUpdate={onUpdate}
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
  onKeep,
  onRemove,
  onUpdate,
}: {
  item: MomentItem;
  onKeep: () => void;
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<MomentItem>) => void;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const quality = isVideo && dims ? videoQuality(dims.w, dims.h) : null;

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
    const next = !item.featured;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/moments/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, featured: next }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        window.alert(d.error || "Failed");
        setBusy(false);
        return;
      }
      onUpdate(item.key, { featured: next });
    } catch {
      window.alert("Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border-2 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-95 disabled:opacity-50"
        >
          <TrashIcon />
          Delete forever
        </button>
        <button
          type="button"
          onClick={onKeep}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#0a0a0a] bg-gradient-to-r from-[#d4a553] to-[#e0b860] shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          <CheckIcon />
          Keep
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleFeatured}
          disabled={busy}
          aria-pressed={item.featured}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 ${
            item.featured
              ? "bg-gradient-to-r from-[#d4a553] to-[#e0b860] text-[#0a0a0a] shadow-sm hover:shadow"
              : "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] hover:text-[#d4a553]"
          }`}
        >
          <StarIcon filled={item.featured} />
          {item.featured ? "In slideshow" : "Add to slideshow"}
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
          {[formatDate(item.lastModified), ...meta].filter(Boolean).join(" · ")}
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

        {item.featured && (
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
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
      for (const file of Array.from(files)) {
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
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
