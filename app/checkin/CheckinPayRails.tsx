import PaymentOptions, { PAYMENT_OPTIONS_STYLE } from "../components/PaymentOptions";

export default function CheckinPayRails({
  venmoUrl,
  zelle = true,
  zelleAmount,
  blocked = false,
  onBlocked,
  onCard,
  cardNoFees = false,
  onExternal,
}: {
  venmoUrl: string;
  zelle?: boolean;
  zelleAmount?: string;
  blocked?: boolean;
  onBlocked?: () => void;
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
        blocked={blocked}
        onBlocked={onBlocked}
        onCard={onCard}
        cardNoFees={cardNoFees}
        onSelect={(method) => {
          if (method !== "card") onExternal();
        }}
      />
    </div>
  );
}
