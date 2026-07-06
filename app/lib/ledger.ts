export interface LedgerItem {
  id: string;
  legId: string; // a Leg slug, or TOUR_OVERHEAD_ID
  date: string;
  type: "revenue" | "expense";
  category: LedgerCategory;
  method: LedgerMethod;
  description: string;
  amount: number;
}

export type LedgerCategory =
  | "donation"
  | "merch"
  | "honorarium"
  | "reimbursement"
  | "gear"
  | "travel"
  | "food"
  | "lodging"
  | "supplies";

export const REVENUE_CATEGORIES: LedgerCategory[] = ["donation", "merch", "honorarium"];

export const EXPENSE_CATEGORIES: LedgerCategory[] = [
  "reimbursement",
  "gear",
  "travel",
  "food",
  "lodging",
  "supplies",
];

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  donation: "Donation",
  merch: "Merch",
  honorarium: "Honorarium",
  reimbursement: "Reimbursement",
  gear: "Gear",
  travel: "Travel",
  food: "Food",
  lodging: "Lodging",
  supplies: "Supplies",
};

export type LedgerMethod = "cash" | "venmo" | "zelle" | "stripe" | "novo" | "chase" | "check";

export const METHODS: LedgerMethod[] = ["cash", "venmo", "zelle", "stripe", "novo", "chase", "check"];

export const METHOD_LABELS: Record<LedgerMethod, string> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  stripe: "Stripe",
  novo: "Novo",
  chase: "Chase",
  check: "Check",
};

export const TOUR_OVERHEAD_ID = "tour";
