import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const LEDGER_CSV =
  process.env.FTGU_LEDGER_PATH || join(homedir(), "Downloads", "statements", "ftgu-ledger.csv");

export interface LedgerRow {
  n: number;
  date: string;
  source: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  person: string;
}

export interface LegView {
  id: string;
  label: string;
  range: string;
  note?: string;
  rows: LedgerRow[];
  income: number;
  expenses: number;
  net: number;
}

export interface LedgerView {
  legs: LegView[];
  income: number;
  expenses: number;
  net: number;
  rowCount: number;
}

const LEG_LABELS: Record<string, string> = {
  "south-florida": "South Florida",
  "british-columbia": "British Columbia",
  "third-culture": "Third Culture",
  "new-jersey": "New Jersey",
  dmv: "The DMV",
  norcal: "NorCal",
  gear: "Gear",
  overhead: "Overhead",
};

const LEG_NOTES: Record<string, string> = {
  "south-florida":
    "Lodging was free at a friend's during the shows. Mar 23–26 was the family trip and is excluded, including the Airbnb. The Avis rental spans both halves and is counted in full pending a split.",
  "british-columbia":
    "Lodging was free: stayed at an institute home next door to the Baha'i center. Wise CAD receipts counted at 0.725 USD per CAD, the rate the Chase card saw Apr 11–13; estimate until converted.",
  "new-jersey": "Personal and business travel mixed on this leg; meal lines include both.",
};

const ORDER = Object.keys(LEG_LABELS);

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function monthDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function loadLedger(): LedgerView {
  const text = readFileSync(LEDGER_CSV, "utf8").trim();
  const [head, ...lines] = text.split("\n");
  const cols = parseLine(head);
  const i = (name: string) => cols.indexOf(name);
  const iDate = i("date"), iSrc = i("source"), iDesc = i("description"), iAmt = i("amount");
  const iType = i("type"), iCat = i("category"), iLeg = i("leg"), iStatus = i("status"), iPerson = i("person");

  const buckets = new Map<string, LedgerRow[]>();
  let n = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const c = parseLine(line);
    const status = c[iStatus];
    if (status === "personal" || status === "business") continue;
    const category = c[iCat];
    const leg = c[iLeg] || (category === "gear" ? "gear" : "overhead");
    const row: LedgerRow = {
      n: ++n,
      date: c[iDate],
      source: c[iSrc],
      description: c[iDesc],
      amount: parseFloat(c[iAmt]) || 0,
      type: c[iType],
      category,
      person: c[iPerson] || "",
    };
    (buckets.get(leg) ?? buckets.set(leg, []).get(leg)!).push(row);
  }

  const ordered = [...ORDER, ...[...buckets.keys()].filter((k) => !ORDER.includes(k))];
  const legs: LegView[] = [];
  let income = 0, expenses = 0;
  for (const id of ordered) {
    const rows = buckets.get(id);
    if (!rows) continue;
    const inc = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const exp = rows.filter((r) => r.type !== "income").reduce((s, r) => s + r.amount, 0);
    const dates = rows.map((r) => r.date).sort();
    legs.push({
      id,
      label: LEG_LABELS[id] ?? id,
      range: dates.length ? `${monthDay(dates[0])} – ${monthDay(dates[dates.length - 1])}` : "",
      note: LEG_NOTES[id],
      rows,
      income: inc,
      expenses: exp,
      net: inc - exp,
    });
    income += inc;
    expenses += exp;
  }
  return { legs, income, expenses, net: income - expenses, rowCount: n };
}
