import type { FundLeg, FundLine } from "./legs-shared";

export function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export type TripExpensesData = {
  lines: FundLine[];
  covered: string[];
  flightBy?: string;
  shortName: string;
};

export function tripExpensesOf(leg: FundLeg | undefined): TripExpensesData | null {
  const lines = (leg?.lines ?? []).filter((l) => l.amount > 0);
  if (!leg || lines.length === 0) return null;
  return { lines, covered: leg.coveredInKind ?? [], flightBy: leg.flightBy, shortName: leg.shortName };
}

export function fundVenmoNote(shortName: string, labels: string[]): string {
  return `From The Ground Up ${shortName}${labels.length ? ": " + labels.join(", ") : ""}`;
}

export function sumLines(lines: FundLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

export function flightByLabel(flightBy?: string): string {
  return flightBy
    ? new Date(`${flightBy}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";
}

export function lineNote(line: FundLine, flightBy: string): string {
  return line.key === "flight" && flightBy ? `${line.note} · booked by ${flightBy}` : line.note;
}

export function LinePrice({ amount, gifted }: { amount: number; gifted: boolean }) {
  return <span className={gifted ? "p-price p-price--gifted" : "p-price"}>{gifted ? "Covered" : money(amount)}</span>;
}

export function ExpenseHead({
  label,
  note,
  amount,
  gifted,
}: {
  label: string;
  note?: string;
  amount: number;
  gifted: boolean;
}) {
  return (
    <div className="p-head">
      <div className="p-text">
        <span className="p-label">{label}</span>{" "}
        {note && note.trim().toLowerCase() !== label.trim().toLowerCase() ? <span className="p-note">{note}</span> : null}
      </div>
      <LinePrice amount={amount} gifted={gifted} />
    </div>
  );
}

export function ExpenseTotal({ total }: { total: number }) {
  return (
    <div className="total-box">
      <div className="total-label">Total</div>
      <div className="total-amount">~{money(total)}</div>
    </div>
  );
}

const COMPACT_MAX = 4;

export function compactLines(lines: FundLine[], covered: string[] = []): FundLine[] {
  const open = lines.filter((l) => !covered.includes(l.key));
  const keep = new Set([...open].sort((a, b) => b.amount - a.amount).slice(0, COMPACT_MAX).map((l) => l.key));
  return open.filter((l) => keep.has(l.key));
}

const LABELS: Record<string, string> = { GPT: "Gas, parking, tolls" };

export function displayLabel(label: string): string {
  return LABELS[label] ?? label;
}

const SENTENCE: Record<string, string> = { GPT: "driving costs" };

export function sentenceTerm(label: string): string {
  return SENTENCE[label] ?? label.toLowerCase();
}

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

export function CompactExpenses({
  lines,
  covered,
  checked,
  onToggle,
  cash,
}: {
  lines: FundLine[];
  covered: string[];
  checked: string[];
  onToggle: (key: string) => void;
  cash?: boolean;
}) {
  const coveredLines = lines.filter((l) => covered.includes(l.key));
  const shown = compactLines(lines, covered);
  return (
    <div className="xp">
      {shown.map((line) => (
        <label key={line.key} className="xp-row">
          <input
            type="checkbox"
            className="xp-box"
            checked={checked.includes(line.key)}
            onChange={() => onToggle(line.key)}
          />
          <span className="xp-label">{displayLabel(line.label)}</span>
          <span className="xp-amt">{money(line.amount)}</span>
        </label>
      ))}
      {coveredLines.map((line) => (
        <div key={line.key} className="xp-row xp-covered">
          <input type="checkbox" className="xp-box" checked disabled readOnly tabIndex={-1} aria-hidden="true" />
          <span className="xp-label">{displayLabel(line.label)}</span>
          <span className="xp-amt">Covered</span>
        </div>
      ))}
      <div className="xp-row xp-sum" aria-live="polite">
        <svg className="xp-gift" viewBox="3 3 18 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
          <path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10.5 8.5 7.5 8 7.5 5.8 7.5 4.5 8.5 3.8 9.6 4c1.4.3 2.4 2.2 2.4 4.5zM12 8.5c1.5 0 4.5-.5 4.5-2.7 0-1.3-1-2-2.1-1.8C13 4.3 12 6.2 12 8.5z" />
        </svg>
        <span className="xp-label">
          {checked.length
            ? <>You&apos;re covering my {listFormat.format(shown.filter((l) => checked.includes(l.key)).map((l) => sentenceTerm(l.label)))}.</>
            : cash
              ? "Give any amount below (I also accept cash)."
              : "Give any amount below."}
        </span>
      </div>
    </div>
  );
}
