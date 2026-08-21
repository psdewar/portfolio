import Link from "next/link";
import { loadLedger, type LedgerRow } from "../../lib/ftgu-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const netText = (v: number) => (v >= 0 ? money(v) : `−${money(-v)}`);
const netColor = (v: number) =>
  v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

const BANKS: Record<string, { name: string; bg: string; fg: string; ring?: boolean; ch: string }> = {
  chase: { name: "Chase", bg: "#117ACA", fg: "#fff", ch: "C" },
  wells: { name: "Wells Fargo", bg: "#D71E28", fg: "#FFCD41", ch: "WF" },
  novo: { name: "Novo", bg: "#fff", fg: "#1b1b1b", ring: true, ch: "n" },
  venmo: { name: "Venmo", bg: "#3D95CE", fg: "#fff", ch: "V" },
  stripe: { name: "Stripe", bg: "#635BFF", fg: "#fff", ch: "S" },
  wise: { name: "Wise", bg: "#9FE870", fg: "#163300", ch: "W" },
};

const COLS = "grid grid-cols-[37%_21%_21%_21%] items-baseline";

function Badge({ source, size = "h-6 w-6 text-[0.7rem] rounded-md" }: { source: string; size?: string }) {
  const b = BANKS[source];
  if (!b) return null;
  return (
    <span
      title={b.name}
      className={`inline-flex shrink-0 items-center justify-center font-bold ${size}`}
      style={{ background: b.bg, color: b.fg, boxShadow: b.ring ? "inset 0 0 0 1px #1b1b1b" : undefined }}
    >
      {b.ch}
    </span>
  );
}

function DetailRow({ r }: { r: LedgerRow }) {
  const income = r.type === "income";
  return (
    <div className="flex items-baseline gap-2 py-1.5 text-base">
      <span className="w-8 shrink-0 tabular-nums text-neutral-400 dark:text-neutral-500">
        {String(r.n).padStart(2, "0")}
      </span>
      <span className="w-16 shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
        {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
      <span className="w-6 shrink-0 self-center">
        <Badge source={r.source} size="h-5 w-5 text-[0.6rem] rounded" />
      </span>
      <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
        {r.description}
        {r.person && <span className="text-neutral-400 dark:text-neutral-500"> · {r.person}</span>}
      </span>
      <span
        className={`w-28 shrink-0 text-right tabular-nums ${
          income ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {income ? `+${money(r.amount)}` : money(r.amount)}
      </span>
      <span className="hidden w-32 shrink-0 text-right text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 sm:block">
        {r.category}
      </span>
    </div>
  );
}

export default function LedgerPage() {
  let data;
  try {
    data = loadLedger();
  } catch {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
        <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-400 sm:px-8">
          Ledger data not available on this host.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
        

        <div className="flex w-full items-end justify-between gap-x-4">
          <span className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Income</span>
            <span className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{money(data.income)}</span>
          </span>
          <span className="pb-1 text-3xl text-neutral-400">−</span>
          <span className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">Expenses</span>
            <span className="text-3xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{money(data.expenses)}</span>
          </span>
          <span className="pb-1 text-3xl text-neutral-400">=</span>
          <span className="flex flex-col items-end text-right">
            <span className="text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              {data.net >= 0 ? "Net income" : "Net loss"}
            </span>
            <span className={`text-3xl font-bold tabular-nums ${netColor(data.net)}`}>{netText(data.net)}</span>
          </span>
        </div>

        

        <div className={`${COLS} mt-8 pb-2 text-sm uppercase tracking-wider text-neutral-500 dark:text-neutral-400`}>
          <span className="font-semibold">Leg</span>
          <span className="text-right font-semibold">Income</span>
          <span className="text-right font-semibold">Expenses</span>
          <span className="text-right font-semibold">Net</span>
        </div>

        {data.legs.map((leg) => (
          <details key={leg.id} className="group border-t border-neutral-200 dark:border-neutral-800">
            <summary className={`${COLS} cursor-pointer list-none py-2.5 text-lg tabular-nums [&::-webkit-details-marker]:hidden`}>
              <span className="flex min-w-0 items-baseline gap-2 text-neutral-800 dark:text-neutral-200">
                <span className="inline-block w-3 shrink-0 text-xs text-neutral-400 transition-transform group-open:rotate-90">▸</span>
                <span className="truncate">{leg.label}</span>
                <span className="hidden text-sm text-neutral-400 dark:text-neutral-500 sm:inline">{leg.range}</span>
              </span>
              <span className="text-right text-emerald-600 dark:text-emerald-400">{leg.income ? money(leg.income) : "—"}</span>
              <span className="text-right text-rose-600/80 dark:text-rose-400/80">{money(leg.expenses)}</span>
              <span className={`text-right font-medium ${netColor(leg.net)}`}>{netText(leg.net)}</span>
            </summary>
            <div className="pb-3">
              {leg.note && (
                <p className="mb-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{leg.note}</p>
              )}
              {leg.rows.map((r) => (
                <DetailRow key={r.n} r={r} />
              ))}
            </div>
          </details>
        ))}

        <div className={`${COLS} border-t-2 border-neutral-300 py-2.5 text-lg font-semibold tabular-nums dark:border-neutral-700`}>
          <span className="pl-5 text-neutral-900 dark:text-neutral-100">Total</span>
          <span className="text-right text-emerald-600 dark:text-emerald-400">{money(data.income)}</span>
          <span className="text-right text-rose-600 dark:text-rose-400">{money(data.expenses)}</span>
          <span className={`text-right ${netColor(data.net)}`}>{netText(data.net)}</span>
        </div>

        
      </div>
    </div>
  );
}
