"use client";

import { useState } from "react";
import { venmoPayUrl } from "../components/PaymentModal";
import { cardTotalLabel } from "../lib/fees";
import { CompactExpenses, displayLabel, fundVenmoNote, money, sumLines, type TripExpensesData } from "../fund/TripExpenses";
import CheckinPayRails from "./CheckinPayRails";
import "./FundBody.css";

export default function FundBody({
  expenses,
  onCard,
  onTap,
  onExternal,
  cash,
  cardLoading,
  cardError,
}: {
  expenses: TripExpensesData | null;
  onCard: (amount: number | null) => void | Promise<void>;
  onTap: (target: string) => void;
  onExternal: () => void;
  cash?: boolean;
  cardLoading?: boolean;
  cardError?: string;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const picked = expenses ? expenses.lines.filter((l) => checked.includes(l.key)) : [];
  const sum = sumLines(picked);
  const note = fundVenmoNote(
    expenses?.shortName ?? "",
    picked.map((l) => displayLabel(l.label)),
  );
  const amount = checked.length ? sum : null;
  return (
    <>
      {expenses && (
        <CompactExpenses
          lines={expenses.lines}
          covered={expenses.covered}
          checked={checked}
          cash={cash}
          onToggle={(key) => {
            setChecked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
            onTap(`expense:${key}`);
          }}
        />
      )}
      <CheckinPayRails
        venmoUrl={venmoPayUrl(amount ?? "", note)}
        zelleAmount={amount === null ? undefined : money(amount)}
        venmoHint={amount === null ? undefined : `Send ${money(amount)}`}
        cardTotal={amount === null ? undefined : cardTotalLabel(amount * 100)}
        cardLoading={cardLoading}
        onCard={() => onCard(amount)}
        onTap={onTap}
        onExternal={onExternal}
      />
      {cardError && <p className="gut mt-2 text-sm text-red-500">{cardError}</p>}
    </>
  );
}
