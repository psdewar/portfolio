"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type Leg } from "../../fund/legs";
import {
  type LedgerItem,
  type LedgerCategory,
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  TOUR_OVERHEAD_ID,
} from "../../lib/ledger";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function LedgerPage() {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [legId, setLegId] = useState(TOUR_OVERHEAD_ID);
  const [date, setDate] = useState(today);
  const [type, setType] = useState<"revenue" | "expense">("revenue");
  const [category, setCategory] = useState<LedgerCategory>("cash");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ledger").then((r) => {
        if (!r.ok) throw new Error("ledger");
        return r.json();
      }),
      fetch("/api/legs").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([ledgerData, legsData]) => {
        setItems(Array.isArray(ledgerData) ? ledgerData : []);
        setLegs(Array.isArray(legsData) ? legsData : []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }, []);

  const isOverhead = legId === TOUR_OVERHEAD_ID;
  const effectiveType = isOverhead ? "expense" : type;
  const categories = effectiveType === "revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0]);
  }, [effectiveType, categories, category]);

  const resetForm = () => {
    setLegId(TOUR_OVERHEAD_ID);
    setDate(today());
    setType("revenue");
    setCategory("cash");
    setDescription("");
    setAmount("");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setSaving(true);
    setMessage(null);

    const payload: Omit<LedgerItem, "id"> & { id?: string } = {
      legId,
      date,
      type: effectiveType,
      category,
      description: description.trim(),
      amount: numAmount,
    };

    const isEdit = editingId !== null;
    if (isEdit) payload.id = editingId;

    try {
      const res = await fetch("/api/ledger", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      const saved = await res.json();
      if (isEdit) {
        setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i)));
      } else if (saved.id) {
        setItems((prev) => [...prev, { ...payload, id: saved.id } as LedgerItem]);
      } else {
        const refreshed = await fetch("/api/ledger").then((r) => r.json()).catch(() => []);
        setItems(Array.isArray(refreshed) ? refreshed : []);
      }

      setMessage({ type: "success", text: isEdit ? "Entry updated" : "Entry added" });
      resetForm();
    } catch {
      setMessage({ type: "error", text: "Failed to save entry" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: LedgerItem) => {
    setEditingId(item.id);
    setLegId(item.legId);
    setDate(item.date);
    setType(item.type);
    setCategory(item.category);
    setDescription(item.description);
    setAmount(String(item.amount));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/ledger", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  };

  const legLabel = (lid: string) => {
    if (lid === TOUR_OVERHEAD_ID) return "Tour Overhead";
    const leg = legs.find((l) => l.slug === lid);
    return leg?.fund?.destination || lid;
  };

  const grouped = items.reduce<Record<string, LedgerItem[]>>((acc, item) => {
    (acc[item.legId] ??= []).push(item);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === TOUR_OVERHEAD_ID) return 1;
    if (b === TOUR_OVERHEAD_ID) return -1;
    return a.localeCompare(b);
  });

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
            Ledger
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

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 mb-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-light tracking-[0.15em] text-neutral-400 dark:text-neutral-500 uppercase">
                  {editingId ? "Edit Entry" : "New Entry"}
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

              <select
                value={legId}
                onChange={(e) => setLegId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
              >
                <option value={TOUR_OVERHEAD_ID}>Tour Overhead</option>
                {legs.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.fund?.destination || l.slug}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                />
                {isOverhead ? (
                  <div className="flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-400 dark:text-neutral-500">
                    Expense
                  </div>
                ) : (
                  <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setType("revenue")}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        type === "revenue"
                          ? "bg-green-600 text-white"
                          : "bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      Revenue
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        type === "expense"
                          ? "bg-red-600 text-white"
                          : "bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      Expense
                    </button>
                  </div>
                )}
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LedgerCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
              />

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !amount}
                  className="px-6 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>

            {sortedGroups.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No entries yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedGroups.map(([lid, groupItems]) => {
                  const sorted = [...groupItems].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                  );
                  const groupRev = sorted
                    .filter((i) => i.type === "revenue")
                    .reduce((s, i) => s + i.amount, 0);
                  const groupExp = sorted
                    .filter((i) => i.type === "expense")
                    .reduce((s, i) => s + i.amount, 0);

                  return (
                    <div key={lid}>
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="text-xs font-light tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
                          {legLabel(lid)}
                        </h3>
                        <span className={`text-sm font-medium ${groupRev - groupExp >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          ${(groupRev - groupExp).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 divide-y divide-neutral-100 dark:divide-neutral-700/50">
                        {sorted.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-3 group"
                          >
                            <span
                              className={`shrink-0 text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded ${
                                item.type === "revenue"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {CATEGORY_LABELS[item.category]}
                            </span>
                            <span className="flex-1 min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
                              {item.description || CATEGORY_LABELS[item.category]}
                            </span>
                            <span
                              className={`shrink-0 text-sm font-medium tabular-nums ${
                                item.type === "revenue"
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-700 dark:text-red-400"
                              }`}
                            >
                              {item.type === "expense" ? "-" : ""}${item.amount.toFixed(2)}
                            </span>
                            <div className="shrink-0 flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors px-1"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs text-neutral-400 hover:text-red-500 transition-colors px-1"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
