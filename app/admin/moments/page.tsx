"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { uploadFile } from "../../moments/upload";

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
  leg?: string;
  hasOriginal: boolean;
  dims?: [number, number];
  taken?: number;
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

function takenAt(item: MomentItem): number | null {
  const m = item.key.match(/^drops\/[a-f0-9]{64}-(\d+)\./);
  return m ? Number(m[1]) : item.taken ?? null;
}

function clampIndex(value: number, total: number) {
  return Math.min(Math.max(Math.round(value), 1), total);
}

function groupOf(item: { city?: string; visit?: string } | undefined) {
  return item?.city ? `${item.city}|${item.visit ?? ""}` : "";
}

function formatVisit(visit: string) {
  return new Date(`${visit}T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

const HOLD_MS = 350;
const HOLD_SLOP = 8;

interface Section {
  id: string;
  city: string;
  visit?: string;
  items: MomentItem[];
}

function capturedAt(item: MomentItem) {
  return takenAt(item) ?? (item.lastModified ? Date.parse(item.lastModified) : 0);
}

function buildSections(items: MomentItem[]): Section[] {
  const byId = new Map<string, Section>();
  for (const it of items) {
    const id = groupOf(it) || (VIDEO_EXT.test(it.key) ? "videos" : "");
    const section = byId.get(id) ?? { id, city: it.city ?? "", visit: it.visit, items: [] };
    section.items.push(it);
    byId.set(id, section);
  }
  const sections = [...byId.values()];
  for (const s of sections) s.items.sort((a, b) => capturedAt(b) - capturedAt(a));
  const newest = (s: Section) => capturedAt(s.items[0]);
  const rank = (s: Section) => (s.city ? 0 : s.id === "" ? 1 : 2);
  return sections.sort((a, b) => rank(a) - rank(b) || newest(b) - newest(a));
}

async function saveCity(key: string, city: string): Promise<Partial<MomentItem>> {
  const r = await fetch("/api/admin/moments/city", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, city }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Could not save city");
  return { city: d.city || undefined, visit: d.visit || undefined, leg: d.leg || undefined };
}

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

export default function MomentsAdminPage() {
  const [items, setItems] = useState<MomentItem[]>([]);
  const [featuredKeys, setFeaturedKeys] = useState<string[]>([]);
  const [ogKey, setOgKeyState] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<string[]>([]);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [walk, setWalk] = useState<string[]>([]);
  const walkRef = useRef<string[]>([]);
  const keysRef = useRef<string[]>([]);
  const savedKeys = useRef<string[]>([]);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const saveSeq = useRef(0);

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
      setItems(Array.isArray(data.items) ? data.items : []);
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
  const featuredItems = featuredKeys
    .map((k) => itemByKey.get(k))
    .filter((it): it is MomentItem => Boolean(it));
  const sections = useMemo(() => buildSections(items), [items]);
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

  async function setCityForSelected(city: string) {
    for (const key of selected) {
      try {
        updateItem(key, await saveCity(key, city));
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Could not save city");
        return false;
      }
    }
    return true;
  }

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
          <section className={`-mx-4 sm:mx-0 ${selected.length ? "pb-36" : ""}`}>
            {sections.length === 0 && (
              <p className="px-4 sm:px-0 text-sm text-neutral-400 dark:text-neutral-500">
                Nothing uploaded yet.
              </p>
            )}
            {sections.map((section) => (
              <div key={section.id || "unlabeled"}>
                <h2 className="flex items-baseline gap-2 px-4 sm:px-0 pb-1.5 pt-4">
                  <span
                    className={`text-sm font-semibold ${
                      section.city
                        ? "text-neutral-700 dark:text-neutral-200"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {section.city || (section.id === "videos" ? "Unlabeled videos" : "Unlabeled photos")}
                  </span>
                  {section.visit && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatVisit(section.visit)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.items.map((it) => it.key))}
                    className="-my-3 ml-auto py-3 text-xs text-neutral-500 transition-colors hover:text-[#d4a553] dark:text-neutral-400"
                  >
                    {section.items.every((it) => orderByKey.has(it.key)) ? "Deselect all" : "Select all"}
                  </button>
                  <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                    {section.items.length}
                  </span>
                </h2>
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
                      onToggle={toggleSelected}
                      onOpen={openPreview}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
          {selected.length > 0 && (
            <SelectionBar
              count={selected.length}
              slot={shownSlot}
              maxSlot={maxSlot}
              onSlotChange={setSlot}
              onAdd={addSelected}
              onSetCity={setCityForSelected}
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
  onToggle,
  onOpen,
}: {
  item: MomentItem;
  order: number;
  slotPos: number;
  selecting: boolean;
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
    <div className="group relative aspect-square w-full select-none overflow-hidden bg-neutral-100 dark:bg-neutral-900 [-webkit-touch-callout:none] [-webkit-user-select:none]">
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
      {order > 0 && (
        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-[#d4a553]" />
      )}
      {slotPos > 0 && order === 0 && (
        <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/70" />
      )}
      {slotPos > 0 && (
        <span className="pointer-events-none absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-white px-1 text-[11px] font-bold tabular-nums text-[#0a0a0a] shadow-sm">
          #{slotPos}
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
            : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
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
    </div>
  );
});

function SelectionBar({
  count,
  slot,
  maxSlot,
  onSlotChange,
  onAdd,
  onSetCity,
  onDelete,
  onClear,
}: {
  count: number;
  slot: number;
  maxSlot: number;
  onSlotChange: (slot: number) => void;
  onAdd: () => void;
  onSetCity: (city: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onClear: () => void;
}) {
  const [slotDraft, setSlotDraft] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [working, setWorking] = useState(false);
  const city = cityDraft.trim();
  const action =
    "inline-flex shrink-0 items-center rounded-full border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#d4a553] hover:text-[#b8893a] active:scale-95 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:text-[#d4a553]";

  async function applyCity() {
    if (!city) return;
    setWorking(true);
    const ok = await onSetCity(city);
    setWorking(false);
    if (ok) {
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
      style={{ bottom: "max(0px, var(--player-h, 0px))" }}
      className="fixed inset-x-0 z-40 border-t border-neutral-200 bg-white/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <XIcon size={18} />
          </button>
          <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {count} selected
          </span>
        </div>
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
              className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-transparent px-3.5 py-2 text-base text-neutral-800 focus:border-[#d4a553] focus:outline-none dark:border-neutral-700 dark:text-neutral-100 sm:text-sm"
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
                className="py-2 pl-4 pr-2 text-sm font-medium transition-transform active:scale-95"
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
                className="mr-1.5 w-12 rounded-full bg-white/60 py-1 text-center text-base font-semibold tabular-nums focus:bg-white focus:outline-none sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <button type="button" onClick={() => setCityOpen(true)} className={action}>
              Set city
            </button>
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
  const taken = takenAt(item);
  const dims = item.dims ?? (videoInfo && videoInfo.w ? [videoInfo.w, videoInfo.h] : null);
  const duration =
    isVideo && videoInfo && Number.isFinite(videoInfo.duration)
      ? `${Math.floor(videoInfo.duration / 60)}:${String(Math.floor(videoInfo.duration % 60)).padStart(2, "0")}`
      : "";
  const meta = [
    taken ? `Taken ${formatDate(new Date(taken).toISOString())}` : `Uploaded ${formatDate(item.lastModified)}`,
    dims ? `${dims[0]}×${dims[1]}` : "",
    duration,
  ].filter(Boolean);
  const [cityFor, setCityFor] = useState<string | null>(null);
  const editingCity = cityFor === item.key;

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

  async function saveItemCity(city: string) {
    setBusy(true);
    try {
      onUpdate(item.key, await saveCity(item.key, city.trim()));
      setCityFor(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save city");
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
    "inline-flex items-center rounded-full border border-white/30 px-3 py-2 text-sm font-medium text-white/90 transition-all active:scale-95 disabled:opacity-50";

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
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="space-y-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:order-first sm:pb-3"
      >
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-white/60">
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
                autoFocus
                className="min-w-0 flex-1 rounded-full border border-white/30 bg-white/5 px-3 py-1.5 text-base text-white placeholder:text-white/40 focus:border-[#d4a553] focus:outline-none sm:w-56 sm:flex-none sm:text-sm"
              />
              <button type="submit" disabled={busy} className={`${pill} !py-1.5`}>
                Save
              </button>
              <button type="button" onClick={() => setCityFor(null)} className={`${pill} !py-1.5`}>
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCityFor(item.key)}
              className={`rounded-full px-2.5 py-1 text-sm font-medium transition-colors ${
                item.city
                  ? "-ml-2.5 text-white/90 hover:bg-white/10"
                  : "border border-dashed border-amber-300/70 text-amber-300 hover:bg-amber-300/10"
              }`}
            >
              {item.city || "Add city"}
            </button>
          )}
          {!editingCity && item.visit && <span>{formatVisit(item.visit)}</span>}
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(item.key)}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
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
  type DragStart = { kind: "tile"; key: string } | { kind: "group"; group: string };
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
        Drag tiles or city labels to reorder (press and hold on mobile), nudge with the arrows, or
        type a position on the badge. This order is what /moments shows. A fund page starts the same
        order at its own leg's first stop.
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
