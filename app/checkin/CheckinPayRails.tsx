import PaymentOptions, { PAYMENT_OPTIONS_STYLE } from "../components/PaymentOptions";

export default function CheckinPayRails({
  venmoUrl,
  zelle = true,
  zelleAmount,
  onCard,
  cardNoFees = false,
  onExternal,
}: {
  venmoUrl: string;
  zelle?: boolean;
  zelleAmount?: string;
  onCard: () => void;
  cardNoFees?: boolean;
  onExternal: () => void;
}) {
  return (
    <div className="gut">
      <style>{PAYMENT_OPTIONS_STYLE}</style>
      <PaymentOptions
        venmoUrl={venmoUrl}
        zelle={zelle}
        zelleAmount={zelleAmount}
        onCard={onCard}
        cardNoFees={cardNoFees}
        onSelect={(method) => {
          if (method !== "card") onExternal();
        }}
      />
    </div>
  );
}
