"use client";

import { useState } from "react";

const ZELLE_EMAIL = process.env.NEXT_PUBLIC_ZELLE_EMAIL ?? "";
const INTERAC_EMAIL = process.env.NEXT_PUBLIC_INTERAC_EMAIL ?? "";

export const PAYMENT_OPTIONS_STYLE = `
  .cc-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 54px; border-radius: var(--btn-r); font: inherit; font-size: 17px; font-weight: 600; cursor: pointer; text-decoration: none; border: none; margin-bottom: 12px; transition: opacity 0.15s ease; }
  .cc-btn:hover { opacity: 0.92; }
  .cc-btn:disabled { cursor: wait; opacity: 0.85; }
  .cc-spinner { width: 16px; height: 16px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: cc-spin 0.8s linear infinite; }
  @keyframes cc-spin { to { transform: rotate(360deg); } }
  .cc-venmo { background: #008CFF; color: #fff; }
  .cc-venmo-logo { height: 22px; width: auto; filter: brightness(0) invert(1); }
  .payment-options { container-type: inline-size; }
  .cc-card { background: #1a1915; color: #fff; font-size: 20px; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.16); }
  .cc-venmo, .cc-zelle, .cc-interac, .cc-card { position: relative; }
  .cc-tag { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
  .cc-zelle { background: #fff; border: 2px solid #6D1ED4; }
  .cc-zelle .cc-tag { background: rgba(109,30,212,0.12); color: #6D1ED4; }
  .cc-copy { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); white-space: nowrap; color: #6D1ED4; }
  .cc-copy, .cc-card { font-variant-numeric: tabular-nums; }
  .cc-copy, .cc-copied, .cc-rail-hint { font-size: var(--cc-fs, 17px); font-weight: 500; line-height: 1.25; }
  .cc-venmo .cc-copy { color: #fff; }
  .cc-copied { color: #6D1ED4; }
  .cc-rail-hint { margin: -2px 0 12px; text-align: center; color: #6D1ED4; }
  .cc-rail-logo { height: 46px; width: auto; }
  .cc-interac { background: #FFBE00; }
  .cc-interac .cc-tag { background: rgba(0,0,0,0.12); color: #333; }
  .cc-interac .cc-copy, .cc-interac .cc-copied { color: #333; }
  .cc-interac-hint { color: #8a6d00; }
  @container (max-width: 380px) { .cc-card:has(.cc-tag) { padding-left: 88px; padding-right: 12px; } }
  @container (max-width: 320px) { .cc-copy { right: 12px; font-size: 14px; } }
`;

export default function PaymentOptions({
  venmoUrl,
  onCard,
  cardTotal,
  cardLoading = false,
  cardNoFees = false,
  onSelect,
  zelle = true,
  zelleAmount,
  zelleNote,
  venmoHint,
  interac = false,
  interacFirst = false,
  blocked = false,
  onBlocked,
}: {
  venmoUrl: string;
  onCard?: () => void;
  cardTotal?: string;
  cardLoading?: boolean;
  cardNoFees?: boolean;
  onSelect?: (method: "venmo" | "zelle" | "card") => void;
  zelle?: boolean;
  zelleAmount?: string;
  zelleNote?: string;
  venmoHint?: string;
  interac?: boolean;
  interacFirst?: boolean;
  blocked?: boolean;
  onBlocked?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
  };

  const showInterac = interac && !!INTERAC_EMAIL;

  const interacRail = showInterac && (
    <button
      className="cc-btn cc-interac"
      onClick={() => copy(INTERAC_EMAIL, "interac")}
    >
      {copied === "interac" ? (
        <span className="cc-copied">You copied my email</span>
      ) : (
        <>
          <span className="cc-tag">no fees</span>
          <img
            className="cc-rail-logo"
            src="/interac_logo.svg"
            alt="Interac e-Transfer"
          />
          <span className="cc-copy">Copy my email</span>
        </>
      )}
    </button>
  );

  return (
    <div className="payment-options">
      {interacFirst && interacRail}
      <a
        className="cc-btn cc-venmo"
        href={venmoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={blocked || undefined}
        onClick={(e) => {
          if (blocked) {
            e.preventDefault();
            onBlocked?.();
            return;
          }
          onSelect?.("venmo");
        }}
      >
        <span className="cc-tag">no fees</span>
        <img className="cc-venmo-logo" src="/Venmo_Logo_Blue.png" alt="Venmo" />
        {venmoHint && <span className="cc-copy cc-venmo-copy">{venmoHint}</span>}
      </a>
      {zelle && ZELLE_EMAIL && (
        <button
          className="cc-btn cc-zelle"
          aria-disabled={blocked || undefined}
          onClick={() => {
            if (blocked) {
              onBlocked?.();
              return;
            }
            copy(ZELLE_EMAIL, "zelle");
            onSelect?.("zelle");
          }}
        >
          {copied === "zelle" ? (
            <span className="cc-copied">You copied my email</span>
          ) : (
            <>
              <span className="cc-tag">no fees</span>
              <img className="cc-rail-logo" src="/zelle_logo.svg" alt="Zelle" />
              <span className="cc-copy">Copy my email</span>
            </>
          )}
        </button>
      )}
      {copied === "zelle" && (
        <p className="cc-rail-hint" aria-live="polite">
          Open your banking app and paste it in Zelle to send{zelleAmount ? ` ${zelleAmount}` : ""}.
          {zelleNote ? ` Add the note: ${zelleNote}.` : ""}
        </p>
      )}
      {copied === "interac" && (
        <p className="cc-rail-hint cc-interac-hint" aria-live="polite">
          Open your banking app and paste it into an Interac e-Transfer to send.
        </p>
      )}
      {!interacFirst && interacRail}
      {onCard && (
        <button
          className="cc-btn cc-card"
          disabled={cardLoading}
          aria-disabled={blocked || undefined}
          onClick={() => {
            if (blocked) {
              onBlocked?.();
              return;
            }
            onSelect?.("card");
            onCard();
          }}
        >
          {cardNoFees && !cardLoading && <span className="cc-tag">no fees</span>}
          {cardLoading ? (
            <>
              <span className="cc-spinner" />
              Opening checkout
            </>
          ) : cardTotal ? (
            `Pay ${cardTotal} with your card`
          ) : (
            "Pay with your card"
          )}
        </button>
      )}
      <style>{PAYMENT_OPTIONS_STYLE}</style>
    </div>
  );
}
