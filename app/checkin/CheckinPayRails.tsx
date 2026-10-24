import PaymentOptions, { PAYMENT_OPTIONS_STYLE } from "../components/PaymentOptions";

export default function CheckinPayRails({
  venmoUrl,
  zelle = true,
  zelleAmount,
  venmoHint,
  cardTotal,
  cardLoading,
  onCard,
  cardNoFees = false,
  onExternal,
  onTap,
}: {
  venmoUrl: string;
  zelle?: boolean;
  zelleAmount?: string;
  venmoHint?: string;
  cardTotal?: string;
  cardLoading?: boolean;
  onCard: () => void;
  cardNoFees?: boolean;
  onExternal: () => void;
  onTap?: (target: "venmo" | "zelle" | "card") => void;
}) {
  return (
    <div className="gut">
      <style>{PAYMENT_OPTIONS_STYLE}</style>
      <PaymentOptions
        venmoUrl={venmoUrl}
        zelle={zelle}
        zelleAmount={zelleAmount}
        venmoHint={venmoHint}
        cardTotal={cardTotal}
        onCard={onCard}
        cardLoading={cardLoading}
        cardNoFees={cardNoFees}
        onSelect={(method) => {
          onTap?.(method);
          if (method !== "card") onExternal();
        }}
      />
    </div>
  );
}
