"use client";

import { type Leg, type FundFacet, type FundLine, primeLines } from "../fund/legs";
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
  "w-full px-2 lg:px-3 py-1.5 text-sm lg:text-base rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";
const lineInput = input.replace("w-full", "min-w-0");
const touch = "min-h-11";

export default function LegRow({
  leg,
  shows,
  setLegs,
  assignShow,
  onMessage,
  open,
  onToggle,
  showShows = true,
  actions,
}: {
  leg: Leg;
  shows: Show[];
  setLegs: React.Dispatch<React.SetStateAction<Leg[]>>;
  assignShow: (slug: string, leg: string | null) => void;
  onMessage: (type: "success" | "error", text: string) => void;
  open: boolean;
  onToggle: () => void;
  showShows?: boolean;
  actions?: React.ReactNode;
}) {
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
    patchLeg(slug, (l) => ({
      ...l,
      fund: {
        ...emptyFund(),
        ...l.fund,
        lines: [...(l.fund?.lines ?? []), { key: "", label: "", note: "", amount: 0 }],
      },
    }));

  const lineKeyOf = (line: FundLine) => line.key || keyFromLabel(line.label);

  const removeLine = (slug: string, idx: number) =>
    patchLeg(slug, (l) => {
      const lines = l.fund?.lines ?? [];
      const removedKey = lines[idx] ? lineKeyOf(lines[idx]) : "";
      const covered = (l.fund?.coveredInKind ?? []).filter((k) => k !== removedKey);
      return {
        ...l,
        fund: {
          ...emptyFund(),
          ...l.fund,
          lines: lines.filter((_, i) => i !== idx),
          coveredInKind: covered.length ? covered : undefined,
        },
      };
    });

  const toggleCovered = (slug: string, key: string) =>
    patchLeg(slug, (l) => {
      const covered = l.fund?.coveredInKind ?? [];
      const next = covered.includes(key) ? covered.filter((k) => k !== key) : [...covered, key];
      return {
        ...l,
        fund: { ...emptyFund(), ...l.fund, coveredInKind: next.length ? next : undefined },
      };
    });

  const saveLeg = async (leg: Leg) => {
    let fund: FundFacet | undefined;
    if (leg.fund) {
      const lines = (leg.fund.lines ?? []).map((ln) => ({
        ...ln,
        key: ln.key || keyFromLabel(ln.label),
        amount: Number(ln.amount) || 0,
      }));
      const lineKeys = new Set(lines.map((ln) => ln.key));
      const covered = (leg.fund.coveredInKind ?? []).filter((k) => lineKeys.has(k));
      fund = {
        ...leg.fund,
        nights: Number(leg.fund.nights) || 0,
        lines,
        coveredInKind: covered.length ? covered : undefined,
      };
    }
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

  const legShows = shows
    .filter((s) => s.leg === leg.slug)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const fund = leg.fund;
  const lines = fund?.lines ?? [];
  const coveredKeys = new Set(fund?.coveredInKind ?? []);
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const addable = shows
    .filter((s) => s.leg !== leg.slug && s.status !== "cancelled")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const dateSpan =
    legShows.length === 0
      ? "no shows yet"
      : legShows.length === 1
        ? formatMonthDay(legShows[0].date)
        : `${formatMonthDay(legShows[0].date)} to ${formatMonthDay(legShows[legShows.length - 1].date)}`;

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onToggle}
          className={`${touch} flex flex-1 min-w-0 flex-wrap content-center items-baseline gap-x-2 text-left`}
        >
          <span className="capitalize text-lg font-medium text-neutral-900 dark:text-white">
            {leg.slug.replace(/-/g, " ")}
          </span>
          <span className="text-sm text-neutral-500">
            {dateSpan}
            <span className="ml-3">
              {legShows.length} {legShows.length === 1 ? "show" : "shows"}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {actions}
          {fund && (
            <a
              href={`/fund/${leg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Fund page
            </a>
          )}
          <button
            onClick={onToggle}
            aria-expanded={open}
            className={`text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors tabular-nums ${
              open ? "text-neutral-900 dark:text-white" : ""
            }`}
          >
            {fund ? `Budget $${total.toLocaleString()}` : "Add a budget"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {showShows && (
            <div>
              <div className="text-sm text-neutral-500 mb-2">Shows on this leg</div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {legShows.map((s) => (
                  <span
                    key={s.slug}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                  >
                    {formatMonthDay(s.date)} {s.city}
                    <button
                      onClick={() => assignShow(s.slug, null)}
                      className="-my-1.5 -mr-1.5 ml-0.5 min-h-11 min-w-8 inline-flex items-center justify-center text-lg text-neutral-400 hover:text-red-500 transition-colors leading-none"
                      aria-label={`Remove ${s.city}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <select
                  value=""
                  onChange={(e) => e.target.value && assignShow(e.target.value, leg.slug)}
                  className={`${touch} px-2 text-sm lg:text-base rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300`}
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
          )}

          <div>
            <div className="text-sm text-neutral-500 mb-2">Budget</div>
            <div className="space-y-3">
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

                  <label className="flex items-center gap-2 text-sm lg:text-base text-neutral-600 dark:text-neutral-400">
                    <span className="shrink-0">Buy flights by</span>
                    <input
                      className={input}
                      type="date"
                      value={fund.flightBy ?? ""}
                      onChange={(e) => setFund(leg.slug, { flightBy: e.target.value })}
                    />
                  </label>

                  <div className="space-y-1.5">
                    <div className="text-sm text-neutral-500">Budget lines</div>
                    {lines.length > 0 && (
                      <div className="flex gap-2 px-0.5 text-sm text-neutral-500">
                        <span className="flex-[2]">Label</span>
                        <span className="flex-[3]">Note</span>
                        <span className="w-24 lg:w-28">Amount</span>
                        <span className="w-9 text-center" title="Covered in kind">
                          ✓
                        </span>
                        <span className="w-9" />
                      </div>
                    )}
                    {lines.map((line, idx) => {
                      const lineKey = lineKeyOf(line);
                      const isCovered = coveredKeys.has(lineKey);
                      return (
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
                            className={`${lineInput} w-24 lg:w-28 shrink-0`}
                            type="number"
                            min="0"
                            placeholder="$"
                            value={line.amount || ""}
                            onChange={(e) => setLine(leg.slug, idx, { amount: Number(e.target.value) })}
                          />
                          <button
                            onClick={() => toggleCovered(leg.slug, lineKey)}
                            aria-pressed={isCovered}
                            aria-label={`${line.label || "Line"} covered in kind`}
                            title="Covered in kind"
                            className={`${touch} w-9 shrink-0 inline-flex items-center justify-center transition-colors ${
                              isCovered
                                ? "text-[#d4a553]"
                                : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-500"
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeLine(leg.slug, idx)}
                            className={`${touch} w-9 shrink-0 inline-flex items-center justify-center text-lg text-neutral-400 hover:text-red-500 transition-colors`}
                            aria-label="Remove line"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addLine(leg.slug)}
                      className={`${touch} inline-flex items-center text-sm lg:text-base text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors`}
                    >
                      + Add budget line
                    </button>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => deleteLeg(leg.slug)}
                  className={`${touch} inline-flex items-center text-sm lg:text-base text-neutral-400 hover:text-red-500 transition-colors`}
                >
                  Delete leg
                </button>
                {fund ? (
                  <button
                    onClick={() => saveLeg(leg)}
                    className={`${touch} inline-flex items-center justify-center px-5 text-sm lg:text-base font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity`}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => setFund(leg.slug, { lines: primeLines() })}
                    className={`${touch} inline-flex items-center justify-center px-4 text-sm lg:text-base font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#d4a553] hover:text-[#d4a553] transition-colors`}
                  >
                    Add a budget
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
