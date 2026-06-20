"use client";

import { useState } from "react";
import { type Leg, type FundFacet, type FundLine } from "../fund/legs";
import { type Show } from "../lib/shows";
import { formatMonthDay } from "../lib/dates";

const emptyFund = (): FundFacet => ({ destination: "", shortName: "", nights: 0, lines: [] });

function keyFromLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "line"
  );
}

const input =
  "w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";
const lineInput = input.replace("w-full", "min-w-0");

export default function LegsManager({
  legs,
  shows,
  setLegs,
  assignShow,
  onMessage,
}: {
  legs: Leg[];
  shows: Show[];
  setLegs: React.Dispatch<React.SetStateAction<Leg[]>>;
  assignShow: (slug: string, leg: string | null) => void;
  onMessage: (type: "success" | "error", text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");

  const patchLeg = (slug: string, fn: (leg: Leg) => Leg) =>
    setLegs((prev) => prev.map((l) => (l.slug === slug ? fn(l) : l)));

  const setFund = (slug: string, patch: Partial<FundFacet>) =>
    patchLeg(slug, (l) => ({ ...l, fund: { ...emptyFund(), ...l.fund, ...patch } }));

  const setLine = (slug: string, idx: number, patch: Partial<FundLine>) =>
    patchLeg(slug, (l) => {
      const lines = [...(l.fund?.lines ?? [])];
      lines[idx] = { ...lines[idx], ...patch };
      return { ...l, fund: { ...emptyFund(), ...l.fund, lines } };
    });

  const addLine = (slug: string) =>
    setFund(slug, {
      lines: [
        ...(legs.find((l) => l.slug === slug)?.fund?.lines ?? []),
        { key: "", label: "", note: "", amount: 0 },
      ],
    });

  const removeLine = (slug: string, idx: number) =>
    setFund(slug, {
      lines: (legs.find((l) => l.slug === slug)?.fund?.lines ?? []).filter((_, i) => i !== idx),
    });

  const saveLeg = async (leg: Leg) => {
    const fund = leg.fund
      ? {
          ...leg.fund,
          nights: Number(leg.fund.nights) || 0,
          lines: (leg.fund.lines ?? []).map((ln) => ({
            ...ln,
            key: ln.key || keyFromLabel(ln.label),
            amount: Number(ln.amount) || 0,
          })),
        }
      : undefined;
    const res = await fetch("/api/legs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...leg, fund }),
    });
    onMessage(res.ok ? "success" : "error", res.ok ? "Leg saved" : "Save failed");
  };

  const deleteLeg = async (slug: string) => {
    const res = await fetch("/api/legs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      shows.filter((s) => s.leg === slug).forEach((s) => assignShow(s.slug, null));
      setLegs((prev) => prev.filter((l) => l.slug !== slug));
      onMessage("success", "Leg deleted");
    } else onMessage("error", "Delete failed");
  };

  const createLeg = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!slug || legs.some((l) => l.slug === slug)) {
      onMessage("error", "Need a unique slug");
      return;
    }
    setLegs((prev) => [...prev, { slug }]);
    setNewSlug("");
    const res = await fetch("/api/legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    onMessage(res.ok ? "success" : "error", res.ok ? "Leg created" : "Create failed");
  };

  return (
    <div className="mb-12 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-medium tracking-[0.15em] uppercase text-neutral-900 dark:text-white">
          Legs <span className="text-neutral-400">({legs.length})</span>
        </span>
        <span className="text-neutral-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-6">
          {legs.map((leg) => {
            const fund = leg.fund;
            const total = (fund?.lines ?? []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
            const legShows = shows
              .filter((s) => s.leg === leg.slug)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const addable = shows
              .filter((s) => s.leg !== leg.slug && s.status !== "cancelled")
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return (
              <div
                key={leg.slug}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {leg.slug}
                    <span className="ml-2 text-xs font-normal text-neutral-400">
                      {legShows.length} {legShows.length === 1 ? "show" : "shows"}
                      {fund ? ` · $${total}` : ""}
                    </span>
                  </h3>
                  {fund && (
                    <a
                      href={`/fund/${leg.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-neutral-400 hover:text-[#d4a553] transition-colors"
                    >
                      /fund/{leg.slug} ↗
                    </a>
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Shows</div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {legShows.map((s) => (
                      <span
                        key={s.slug}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                      >
                        {formatMonthDay(s.date)} {s.city}
                        <button
                          onClick={() => assignShow(s.slug, null)}
                          className="text-neutral-400 hover:text-red-500 transition-colors leading-none"
                          aria-label={`Remove ${s.city}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <select
                      value=""
                      onChange={(e) => e.target.value && assignShow(e.target.value, leg.slug)}
                      className="px-2 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                    >
                      <option value="">+ add show</option>
                      {addable.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {formatMonthDay(s.date)} · {s.city}, {s.region}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {fund && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2">
                      <input
                        className={input}
                        placeholder="Destination (e.g. the Bay & Sactown)"
                        value={fund.destination ?? ""}
                        onChange={(e) => setFund(leg.slug, { destination: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="Short name"
                        value={fund.shortName ?? ""}
                        onChange={(e) => setFund(leg.slug, { shortName: e.target.value })}
                      />
                      <input
                        className={`${input} sm:w-20`}
                        type="number"
                        min="0"
                        placeholder="Nights"
                        value={fund.nights || ""}
                        onChange={(e) => setFund(leg.slug, { nights: Number(e.target.value) })}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="shrink-0">Buy flights by</span>
                      <input
                        className={input}
                        type="date"
                        value={fund.flightBy ?? ""}
                        onChange={(e) => setFund(leg.slug, { flightBy: e.target.value })}
                      />
                    </label>

                    <div className="space-y-1.5">
                      <div className="text-xs uppercase tracking-wider text-neutral-400">
                        Budget lines
                      </div>
                      {(fund.lines ?? []).length > 0 && (
                        <div className="flex gap-2 px-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
                          <span className="flex-[2]">Label</span>
                          <span className="flex-[3]">Note</span>
                          <span className="w-24">Amount</span>
                          <span className="w-4" />
                        </div>
                      )}
                      {(fund.lines ?? []).map((line, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            className={`${lineInput} flex-[2]`}
                            placeholder="Label"
                            value={line.label}
                            onChange={(e) => setLine(leg.slug, idx, { label: e.target.value })}
                          />
                          <input
                            className={`${lineInput} flex-[3]`}
                            placeholder="Note"
                            value={line.note}
                            onChange={(e) => setLine(leg.slug, idx, { note: e.target.value })}
                          />
                          <input
                            className={`${lineInput} w-24 shrink-0`}
                            type="number"
                            min="0"
                            placeholder="$"
                            value={line.amount || ""}
                            onChange={(e) => setLine(leg.slug, idx, { amount: Number(e.target.value) })}
                          />
                          <button
                            onClick={() => removeLine(leg.slug, idx)}
                            className="shrink-0 text-neutral-400 hover:text-red-500 transition-colors px-1"
                            aria-label="Remove line"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addLine(leg.slug)}
                        className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                      >
                        + Add budget line
                      </button>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => deleteLeg(leg.slug)}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Delete leg
                  </button>
                  {fund ? (
                    <button
                      onClick={() => saveLeg(leg)}
                      className="px-5 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setFund(leg.slug, {})}
                      className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#d4a553] hover:text-[#d4a553] transition-colors"
                    >
                      + Add funding
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2">
            <input
              className={input}
              placeholder="New leg slug (e.g. socal)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createLeg()}
            />
            <button
              onClick={createLeg}
              className="shrink-0 px-5 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 transition-colors"
            >
              New leg
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
