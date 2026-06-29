export interface LedgerItem {
  id: string;
  legId: string; // a Leg slug, or TOUR_OVERHEAD_ID
  date: string;
  type: "revenue" | "expense";
  category: LedgerCategory;
  description: string;
  amount: number;
}

export type LedgerCategory =
  | "honorarium"
  | "reimbursement"
  | "merch"
  | "cash"
  | "venmo"
  | "zelle"
  | "gear"
  | "travel"
  | "food"
  | "lodging"
  | "supplies";

export const REVENUE_CATEGORIES: LedgerCategory[] = [
  "honorarium",
  "merch",
  "cash",
  "venmo",
  "zelle",
];

export const EXPENSE_CATEGORIES: LedgerCategory[] = [
  "reimbursement",
  "gear",
  "travel",
  "food",
  "lodging",
  "supplies",
];

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  honorarium: "Honorarium",
  reimbursement: "Reimbursement",
  merch: "Merch",
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  gear: "Gear",
  travel: "Travel",
  food: "Food",
  lodging: "Lodging",
  supplies: "Supplies",
};

export const TOUR_OVERHEAD_ID = "tour";
