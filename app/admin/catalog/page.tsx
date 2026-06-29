"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type CatalogItem, type CatalogKind, CATALOG_KIND_LABELS } from "../../lib/catalog";
import { type LedgerItem, CATEGORY_LABELS } from "../../lib/ledger";
import { formatMonthDay } from "../../lib/dates";

const TABS: CatalogKind[] = ["setlist", "quote", "gear"];

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [gearEntries, setGearEntries] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<CatalogKind>("setlist");

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [itemActive, setItemActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((r) => {
        if (!r.ok) throw new Error("catalog");
        return r.json();
      }),
      fetch("/api/ledger")
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([catalogData, ledgerData]) => {
        setItems(Array.isArray(catalogData) ? catalogData : []);
        const gear = Array.isArray(ledgerData)
          ? (ledgerData as LedgerItem[]).filter((i) => i.category === "gear")
          : [];
        setGearEntries(gear);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load catalog" }))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setName("");
    setNotes("");
    setItemActive(true);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMessage(null);

    const payload: Omit<CatalogItem, "id"> & { id?: string } = {
      kind: activeTab,
      name: name.trim(),
      notes: notes.trim(),
      active: itemActive,
    };

    const isEdit = editingId !== null;
    if (isEdit) payload.id = editingId;

    try {
      const res = await fetch("/api/catalog", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      const saved = await res.json();
      if (isEdit) {
        setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i)));
      } else if (saved.id) {
        setItems((prev) => [...prev, { ...payload, id: saved.id } as CatalogItem]);
      } else {
        const refreshed = await fetch("/api/catalog")
          .then((r) => r.json())
          .catch(() => []);
        setItems(Array.isArray(refreshed) ? refreshed : []);
      }

      setMessage({ type: "success", text: isEdit ? "Updated" : "Added" });
      resetForm();
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: CatalogItem) => {
    const next = !item.active;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: next } : i)));

    try {
      const res = await fetch("/api/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !next } : i)));
      setMessage({ type: "error", text: "Failed to update" });
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setName(item.name);
    setNotes(item.notes);
    setItemActive(item.active);
  };

  const filtered = items.filter((i) => i.kind === activeTab);
  const active = filtered.filter((i) => i.active);
  const inactive = filtered.filter((i) => !i.active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="text-xs font-medium tracking-widest uppercase text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
          >
            ← Admin
          </Link>
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 shrink-0" />
          <h1 className="text-sm font-semibold tracking-[0.2em] uppercase text-neutral-900 dark:text-white">
            Catalog
          </h1>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm mb-6 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                resetForm();
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {CATALOG_KIND_LABELS[tab]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
              />
            ))}
          </div>
        ) : activeTab === "gear" ? (
          gearEntries.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No gear entries yet. Add gear expenses in the Ledger.
              </p>
              <Link
                href="/admin/ledger"
                className="inline-block mt-3 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                Go to Ledger →
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {gearEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {entry.description || CATEGORY_LABELS[entry.category]}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {formatMonthDay(entry.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-red-700 dark:text-red-400">
                    ${entry.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 mb-8 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-light tracking-[0.15em] text-neutral-400 dark:text-neutral-500 uppercase">
                  {editingId
                    ? `Edit ${CATALOG_KIND_LABELS[activeTab]}`
                    : `Add ${CATALOG_KIND_LABELS[activeTab]}`}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={activeTab === "setlist" ? "Song title" : "Quote"}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 resize-none"
              />

              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="w-full py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
            </form>

            {active.length === 0 && inactive.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No {CATALOG_KIND_LABELS[activeTab].toLowerCase()} yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {active.length > 0 && (
                  <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 divide-y divide-neutral-100 dark:divide-neutral-700/50">
                    {active.map((item) => (
                      <CatalogRow
                        key={item.id}
                        item={item}
                        onToggle={() => toggleActive(item)}
                        onEdit={() => handleEdit(item)}
                      />
                    ))}
                  </div>
                )}

                {inactive.length > 0 && (
                  <div>
                    <h3 className="text-xs font-light tracking-[0.15em] text-neutral-400 dark:text-neutral-500 uppercase mb-3">
                      Inactive
                    </h3>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 divide-y divide-neutral-100 dark:divide-neutral-700/50 opacity-60">
                      {inactive.map((item) => (
                        <CatalogRow
                          key={item.id}
                          item={item}
                          onToggle={() => toggleActive(item)}
                          onEdit={() => handleEdit(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CatalogRow({
  item,
  onToggle,
  onEdit,
}: {
  item: CatalogItem;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 group">
      <button
        onClick={onToggle}
        className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
          item.active
            ? "border-green-500 bg-green-500 text-white"
            : "border-neutral-300 dark:border-neutral-600"
        }`}
      >
        {item.active && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900 dark:text-white">{item.name}</p>
        {item.notes && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{item.notes}</p>
        )}
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors opacity-40 group-hover:opacity-100 px-1"
      >
        Edit
      </button>
    </div>
  );
}
