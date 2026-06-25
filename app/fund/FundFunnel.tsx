"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import SponsorForm from "../components/SponsorForm";
import PaymentOptions from "../components/PaymentOptions";
import MomentsGallery from "../moments/MomentsGallery";
import { preloadGoogleMaps } from "../lib/maps";
import { formatEventDateShort } from "../lib/dates";
import { type FundLeg, type FundLine, type FundBooked } from "./legs";
import SponsorHeader from "app/sponsor/SponsorHeader";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const PHONE = process.env.NEXT_PUBLIC_PHONE ?? "";

const STEPS = [
  "I write original songs, record, rehearse, and sequence them into an hour-long presentation.",
  "I work with people in your community to book concert dates.",
];

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function HonorariumControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="match-ctrl">
      <div className="match-input-row">
        <div className="match-field">
          <span className="match-prefix">$</span>
          <input
            className="match-input"
            type="number"
            min="1"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

const QUICK_PICKS = [25];

function LineMatchControl({
  line,
  value,
  onChange,
}: {
  line: FundLine;
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = QUICK_PICKS.filter((p) => p < line.amount);
  return (
    <div className="match-ctrl">
      <div className="match-input-row">
        <div className="match-field">
          <span className="match-prefix">$</span>
          <input
            className="match-input"
            type="number"
            min="1"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <button className="match-btn match-full" onClick={() => onChange(String(line.amount))}>
          Full
        </button>
        {presets.map((p) => (
          <button
            key={p}
            className="match-btn match-chip"
            onClick={() => onChange(String((parseFloat(value) || 0) + p))}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ContributeOverlay({
  items,
  trip,
  tripLabel,
  venmoUrl,
  onClose,
}: {
  items: { key: string; amountCents: number }[];
  trip: string;
  tripLabel: string;
  venmoUrl: string;
  onClose: () => void;
}) {
  const [complete, setComplete] = useState(false);
  const [method, setMethod] = useState<"card" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/contribution-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, trip }),
    });
    const { clientSecret } = await res.json();
    return clientSecret;
  }, [items, trip]);

  return (
    <div className="contribute-overlay" onClick={onClose}>
      <div
        className="contribute-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Contribute"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contribute-header">
          {!complete && !method && <span className="contribute-title">Select one:</span>}
          <button className="contribute-close" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>
        {complete ? (
          <div className="contribute-thanks">
            <div className="contribute-thanks-title">Thank you.</div>
            <p className="contribute-thanks-body">
              You&apos;re part of the {tripLabel} trip now. I&apos;ll bring you along.
            </p>
            <button className="contribute-thanks-btn" onClick={onClose}>
              Back to the page
            </button>
          </div>
        ) : method === "card" ? (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret, onComplete: () => setComplete(true) }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <div className="contribute-choice">
            <PaymentOptions venmoUrl={venmoUrl} onCard={() => setMethod("card")} />
          </div>
        )}
      </div>
    </div>
  );
}

export function FundFunnel({ leg, intro }: { leg: FundLeg; intro?: ReactNode }) {
  const coveredKeys = new Set(leg.coveredInKind ?? []);
  const LINES = (leg.lines ?? []).filter((l) => l.amount > 0);
  const booked = leg.booked ?? [];
  const hasBooked = booked.length > 0;
  const flightBy = leg.flightBy
    ? new Date(`${leg.flightBy}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "";
  const tripTotal = LINES.reduce((sum, line) => sum + line.amount, 0);
  const otherWays = [
    {
      key: "host",
      label: hasBooked ? "Host another concert for this trip" : "Host a concert in your living room",
      note: hasBooked ? "your living room or a bigger venue" : "or a bigger venue",
      smsBody: `Hi Peyt, I'd love to host a concert for your trip!`,
    },
  ];

  const [lineVals, setLineVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(LINES.map((l) => [l.key, ""])),
  );
  const [honorarium, setHonorariumVal] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

  const mastheadRef = useRef<HTMLDivElement>(null);
  const kickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const wrap = mastheadRef.current;
    if (!wrap) return;
    const target = wrap.clientWidth;
    if (target <= 0) return;
    for (const el of [kickerRef.current, titleRef.current]) {
      if (!el) continue;
      el.style.fontSize = "100px";
      const w = el.scrollWidth;
      if (w <= 0) continue;
      el.style.fontSize = `${(100 * target) / w}px`;
      if (el.scrollWidth > target) {
        el.style.fontSize = `${(parseFloat(el.style.fontSize) * target) / el.scrollWidth}px`;
      }
    }
  }, []);

  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (mastheadRef.current) ro.observe(mastheadRef.current);
    if (document.fonts) document.fonts.ready.then(fit);
    return () => ro.disconnect();
  }, [fit]);

  useEffect(() => {
    if (!hostOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHostOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hostOpen]);

  const lineTotal = LINES.reduce((sum, line) => {
    const n = parseFloat(lineVals[line.key] ?? "");
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const honorariumAmt = parseFloat(honorarium) || 0;
  const total = lineTotal + honorariumAmt;

  const items: { key: string; amountCents: number }[] = [];
  const venmoParts: string[] = [];
  for (const line of LINES) {
    const n = parseFloat(lineVals[line.key] ?? "");
    if (!isNaN(n) && n > 0) {
      items.push({ key: line.key, amountCents: Math.round(n * 100) });
      venmoParts.push(`${line.label} $${n}`);
    }
  }
  if (honorariumAmt > 0) {
    items.push({ key: "honorarium", amountCents: Math.round(honorariumAmt * 100) });
    venmoParts.push(`Honorarium $${honorariumAmt}`);
  }
  const venmoNote = `From The Ground Up ${leg.shortName}${venmoParts.length ? ": " + venmoParts.join(", ") : ""}`;
  const venmoUrl = `https://venmo.com/psdewar?txn=pay&audience=private&amount=${total}&note=${encodeURIComponent(venmoNote)}`;

  const slugged = booked.filter((b): b is FundBooked & { slug: string } => Boolean(b.slug));
  const posterSlugs = slugged.filter((b) => !b.private).map((b) => b.slug);
  const sharePoster = async (slug: string) => {
    setPosterLoading(true);
    try {
      const res = await fetch(`/api/poster/${slug}?format=ig&jpg=true`);
      const blob = await res.blob();
      const file = new File([blob], `poster-${slug}.jpg`, { type: "image/jpeg" });
      // Mobile: native share sheet (text it, post it) with the image attached.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch {
          // share sheet dismissed — do nothing
        }
        return;
      }
      // Desktop / unsupported: download the image directly.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-${slug}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPosterLoading(false);
    }
  };

  return (
    <>
      <style>{`
:root {
  --bg: #0d0e11;
  --surface: #15171c;
  --surface-2: #1b1e25;
  --rule: rgba(232,229,221,0.07);
  --rule-strong: rgba(232,229,221,0.18);
  --paper: #ece9e0;
  --ink: #b8b5ab;
  --ink-dim: #898780;
  --ghost: #575762;
  --scarlet: #d84a2e;
  --teal: #4fb3a4;
  --gold: #d4a553;
  --gold-text: #d4a553;
  --green: #4ade80;
  --grain-blend: overlay;
  --grain-opacity: 0.035;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f5f2ea;
    --surface: #ece8dc;
    --surface-2: #e4dfd0;
    --rule: rgba(26,25,21,0.08);
    --rule-strong: rgba(26,25,21,0.20);
    --paper: #1a1915;
    --ink: #4b4940;
    --ink-dim: #75736a;
    --ghost: #a9a79a;
    --scarlet: #bc3a20;
    --teal: #2f8073;
    --gold: #d4a553;
    --gold-text: #a8842f;
    --green: #16a34a;
    --grain-blend: multiply;
    --grain-opacity: 0.025;
  }
}

.bf-root * { box-sizing: border-box; }
.bf-root {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  font-variant-numeric: tabular-nums lining-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  position: relative;
  min-height: 100vh;
}
.bf-root::before {
  content: '';
  position: fixed; inset: 0;
  pointer-events: none; z-index: 1000;
  opacity: var(--grain-opacity);
  mix-blend-mode: var(--grain-blend);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
.bf-root ::selection { background: rgba(216,74,46,0.32); color: var(--paper); }
.bf-root ::-webkit-scrollbar { width: 10px; height: 10px; }
.bf-root ::-webkit-scrollbar-track { background: transparent; }
.bf-root ::-webkit-scrollbar-thumb { background: var(--rule-strong); border: 2px solid var(--bg); border-radius: 10px; }

.bf-root a { color: inherit; }
.wrap { max-width: 780px; margin: 0 auto; padding: 48px 16px 120px; position: relative; }
@media (min-width: 640px) { .wrap { padding: 60px 40px 140px; } }

.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.16em; text-transform: uppercase;
}

.eyebrow {
  font-size: 12px; letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--ghost); font-weight: 500;
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
}
.eyebrow::after { content: ''; height: 1px; flex: 1 1 auto; background: var(--rule-strong); }
.eyebrow-tag { text-transform: none; letter-spacing: 0.01em; font-family: 'Fraunces', serif; font-style: italic; font-size: 14px; color: var(--gold-text); }
.masthead { width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.masthead-kicker { display: flex; align-items: center; justify-content: center; gap: 0.3em; white-space: nowrap; font-family: var(--font-parkinsans), "Parkinsans", sans-serif; font-weight: 700; font-size: clamp(20px, 4.8vw, 42px); text-transform: uppercase; letter-spacing: 0.025em; color: var(--gold); line-height: 1.05; margin: 0; }
.masthead-title { font-family: 'Fraunces', serif; font-style: italic; font-size: clamp(18px, 3.2vw, 26px); font-weight: 500; color: var(--paper); letter-spacing: 0; line-height: 1.2; margin: 0; text-align: center; white-space: nowrap; }
.mt-text { flex: 0 1 auto; text-align: center; }
.masthead-sub { font-size: 16px; line-height: 1.5; margin-top: 10px; text-align: center; text-transform: uppercase; }
.ms-tour { font-family: var(--font-parkinsans), sans-serif; font-weight: 700; letter-spacing: 0.06em; }
.ms-tag { display: block; font-family: var(--font-space-mono), monospace; font-weight: 500; letter-spacing: 0.06em; font-size: 0.85em; }
.masthead-flag { height: 0.72em; width: auto; flex: 0 0 auto; }
.hook {
  font-size: 16px; color: var(--ink-dim); margin: 0 0 28px;
}
.hook b { color: var(--teal); font-weight: 600; }
.bf-h1 {
  font-size: clamp(38px, 8vw, 66px); line-height: 0.98;
  letter-spacing: -0.025em; color: var(--paper); margin: 0; font-weight: 600;
}
.bf-h1 em { font-style: normal; color: var(--gold); }
.bf-h1 .nights { font-size: 0.6em; font-weight: 500; color: var(--ink-dim); white-space: nowrap; }
.bf-h1 .nights .dot { margin: 0 0.35em; }
.dateline { margin-top: 20px; display: flex; flex-direction: column; gap: 14px; }
.loc { display: flex; flex-direction: column; gap: 2px; }
.loc-venue { color: var(--paper); font-weight: 700; font-size: clamp(20px, 4.6vw, 26px); line-height: 1.1; }
.loc-venue em { font-style: italic; font-weight: 400; opacity: 0.75; font-size: 0.66em; }
.loc-when { color: var(--ink-dim); font-size: 15px; }

html { scroll-behavior: smooth; }
.section-head {
  font-size: clamp(30px, 6vw, 46px); letter-spacing: -0.01em; text-transform: none;
  color: var(--paper); margin: 52px 0 16px; font-weight: 500;
  display: flex; align-items: baseline; gap: 12px;
  scroll-margin-top: 24px;
}
.section-head .sh-note { letter-spacing: 0.01em; text-transform: none; font-weight: 400; color: var(--ink-dim); font-size: 16px; }

.stake { list-style: none; margin: 0; padding: 0; }
.stake li { padding: 14px 0; border-bottom: 1px solid var(--rule); display: flex; gap: 16px; align-items: baseline; }
.stake .s-label { color: var(--paper); font-weight: 600; flex: 0 0 34%; }
.stake .s-note { color: var(--ink-dim); font-size: 16px; }
.steps { margin: 0 0 16px; padding: 0; list-style: none; counter-reset: step; }
.steps li { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; font-size: 19px; font-weight: 400; color: var(--paper); border-bottom: 1px solid var(--rule); counter-increment: step; }
.steps li:last-child { border-bottom: none; }
.steps li::before { content: counter(step); flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%; background: var(--surface); color: var(--paper); font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
@media (max-width: 520px) {
  .stake li { flex-direction: column; gap: 3px; }
  .stake .s-label { flex-basis: auto; }
}


.pieces { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.piece {
  border: 1px solid var(--rule); border-radius: 12px; background: var(--surface);
  overflow: hidden; display: flex; flex-direction: column;
}
.piece-row { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; }
.p-head { display: flex; align-items: baseline; gap: 12px; }
.p-text { flex: 1 1 auto; min-width: 0; line-height: 1.4; }
.p-price { flex: 0 0 auto; color: var(--paper); font-weight: 700; font-size: 24px; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.p-label { color: var(--paper); font-weight: 600; font-size: 18px; }
.p-note { color: var(--ink-dim); font-size: 16px; }
.inkind-link { display: block; font-size: 16px; color: var(--ink-dim); margin-top: 6px; text-decoration: none; }
.inkind-cta { color: var(--paper); text-decoration: underline; }
.inkind-link:hover { text-decoration: underline; }
.p-covered { display: flex; align-items: center; gap: 10px; color: var(--ink-dim); font-size: 16px; }
.line-done { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #16a34a; color: #fff; }
.lodging-or { display: block; padding: 12px 18px; border-top: 1px solid var(--rule); font-size: 16px; color: var(--ink-dim); text-decoration: none; }
.total-box { margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; }
.total-label { color: var(--paper); font-weight: 600; font-size: 18px; }
.total-amount { color: var(--paper); font-weight: 700; font-size: 24px; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }

.match-ctrl { flex: 0 0 auto; }
.match-input-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.match-prefix { color: var(--ink-dim); font-size: 24px; font-weight: 600; }
.match-field {
  display: inline-flex; align-items: center; gap: 4px; height: 44px; padding: 0 12px;
  background: var(--surface-2); border: 1px solid var(--rule-strong); border-radius: 8px;
}
.match-field:focus-within { border-color: var(--paper); }
.match-input {
  width: 60px; background: transparent; border: none;
  color: var(--paper); font: inherit; font-size: 24px; font-weight: 700;
  text-align: right; padding: 0; outline: none;
  -moz-appearance: textfield;
}
.match-input::-webkit-outer-spin-button,
.match-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.match-input:invalid { box-shadow: none; }
.match-btn {
  cursor: pointer; background: var(--surface-2); border: 1px solid var(--rule-strong);
  border-radius: 8px; color: var(--ink); font: inherit; font-size: 16px; font-weight: 600;
  flex: 0 0 auto; height: 44px; padding: 7px 11px; white-space: nowrap; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.match-btn:hover { color: var(--paper); border-color: var(--rule-strong); }
.match-full { margin-left: auto; background: transparent; border-color: transparent; color: var(--ink-dim); }
.match-full:hover { color: var(--paper); border-color: transparent; }
.match-chip { flex: 0 0 auto; padding: 7px 8px; }
.match-chip::before { content: '+$'; color: var(--ink-dim); }
.match-btn-text { background: var(--scarlet); color: #fff; border-color: transparent; }
.match-btn-text:hover { opacity: 0.88; color: #fff; }
.other-ways { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.other-item {
  border: 1px solid var(--rule); border-radius: 12px; background: var(--surface);
  padding: 16px 18px; display: flex; gap: 16px; align-items: center; min-width: 0;
}
.other-body { flex: 1 1 auto; min-width: 0; }
.other-label { color: var(--paper); font-weight: 600; font-size: 18px; }
.other-note { color: var(--ink-dim); font-size: 16px; margin-top: 3px; }
.other-action {
  flex: 0 0 auto; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-2); color: var(--ink); font: inherit; font-weight: 600; font-size: 16px;
  border: 1px solid var(--rule-strong); border-radius: 9px; min-height: 48px; padding: 10px 16px; white-space: nowrap;
  max-width: 100%; min-width: 0; transition: color 0.15s ease;
}
.other-action:hover { color: var(--paper); }
@media (min-width: 561px) { select.other-action { width: 17rem; } }
.other-soon { flex: 0 0 auto; color: var(--ghost); font-size: 13px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
@media (max-width: 560px) {
  .other-item { flex-wrap: wrap; }
  .other-action, .other-soon { flex-basis: 100%; width: 100%; text-align: center; }
}

.faq { display: grid; gap: 10px; }
.faq details { border: 1px solid var(--rule); border-radius: 12px; background: var(--surface); padding: 0 18px; }
.faq summary { cursor: pointer; list-style: none; padding: 16px 0; color: var(--paper); font-weight: 600; font-size: 17px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: '+'; flex: 0 0 auto; color: var(--ink-dim); font-weight: 400; font-size: 22px; line-height: 1; }
.faq details[open] summary::after { content: '\\2212'; }
.faq-a { padding: 0 0 16px; color: var(--ink-dim); font-size: 16px; line-height: 1.6; }

.cta {
  margin-top: 56px; padding: 32px; border-radius: 16px;
  background: var(--surface); border: 1px solid var(--rule-strong); text-align: center;
}
.cta h2 { margin: 0 0 8px; font-size: clamp(22px, 4vw, 30px); color: var(--paper); font-weight: 500; letter-spacing: -0.01em; }
.cta p { margin: 0 0 22px; color: var(--ink-dim); font-size: 16px; }
.cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn {
  text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 10px; padding: 13px 24px;
  transition: opacity 0.2s ease, transform 0.1s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--scarlet); color: #fff; }
.btn-secondary { background: transparent; color: var(--paper); border: 1px solid var(--rule-strong); }
.btn:hover { opacity: 0.9; }

.intro-toggle {
  cursor: pointer; background: var(--surface-2); border: 1px solid var(--rule-strong);
  border-radius: 9px; color: var(--ink); font: inherit; font-size: 16px; font-weight: 600;
  min-height: 44px; padding: 10px 18px; transition: color 0.15s ease;
}
.intro-toggle:hover { color: var(--paper); }
.intro-reveal { margin-top: 24px; }

.bf-footer { margin-top: 44px; font-size: 16px; color: var(--ink-dim); line-height: 1.65; }
.bf-footer b { color: var(--ink-dim); font-weight: 600; }

.contribute-fab {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom, 24px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--gold);
  color: #0d0e11;
  border: none;
  border-radius: 999px;
  padding: 18px 48px;
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.contribute-fab:hover { opacity: 0.9; }
.contribute-fab:active { transform: translateX(-50%) translateY(1px); }
.fab-split { font-size: 14px; font-weight: 600; opacity: 0.85; letter-spacing: 0; }

.contribute-overlay {
  position: fixed; inset: 0; z-index: 950;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: flex-start; justify-content: center;
  overflow-y: auto; padding: 24px 16px;
}
.contribute-modal {
  position: relative;
  width: 100%; max-width: 480px;
  background: #fff; border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  margin: auto;
  overflow: hidden;
}
.contribute-header { display: flex; align-items: center; padding: 10px 10px 0 28px; }
.contribute-title { font-family: 'Outfit', system-ui, -apple-system, sans-serif; font-size: 24px; font-weight: 400; color: #1a1915; letter-spacing: -0.01em; }
.contribute-close {
  margin-left: auto;
  background: rgba(0,0,0,0.06);
  border: none; border-radius: 50%;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px; color: #555;
  transition: color 0.15s ease;
}
.contribute-close:hover { color: #000; }

.contribute-thanks {
  padding: 20px 32px 48px; text-align: center;
}
.contribute-thanks-title {
  font-size: 36px; font-weight: 700; color: #1a1915; letter-spacing: -0.02em; margin-bottom: 12px;
}
.contribute-thanks-body {
  color: #4b4940; font-size: 16px; margin: 0 0 28px;
}
.contribute-thanks-btn {
  background: var(--scarlet); color: #fff; border: none; border-radius: 10px;
  padding: 13px 24px; font: inherit; font-size: 16px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s ease;
}
.contribute-thanks-btn:hover { opacity: 0.9; }

.contribute-choice { padding: 6px 28px 30px; }

@media print {
  .bf-root { background: #fff; color: #000; }
  .bf-root::before { display: none; }
  .match-ctrl, .other-action, .cta-row, .progress .bar, .contribute-fab, .contribute-overlay { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .bf-root *, .bf-root *::before, .bf-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap"
      />

      <div className="bf-root">
        <div className="wrap">
          <div className="masthead" ref={mastheadRef}>
            <div className="masthead-title" ref={titleRef}>
              Help fund my concert tour
            </div>
            <div className="masthead-kicker" ref={kickerRef}>
              <img
                className="masthead-flag"
                src="/flag-ca.svg"
                alt="Canada"
                style={{ aspectRatio: "2 / 1" }}
                onLoad={fit}
              />
              From The Ground Up
              <img
                className="masthead-flag"
                src="/flag-us.svg"
                alt="US"
                style={{ aspectRatio: "1235 / 650" }}
                onLoad={fit}
              />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <MomentsGallery />
          </div>

          {intro && (
            <section>
              <div className="section-head">Who you&apos;re funding</div>
              <button
                className="intro-toggle"
                onClick={() => setIntroOpen((v) => !v)}
                aria-expanded={introOpen}
              >
                {introOpen ? "Show less" : "See more"}
              </button>
              {introOpen && <div className="intro-reveal space-y-8">{intro}</div>}
            </section>
          )}

          <div className="section-head">How this works</div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            <li>I purchase flights{flightBy ? ` by ${flightBy}` : ""} to arrive in</li>
          </ol>
          <h1 className="bf-h1">
            <em>{leg.destination}</em>
            <span className="nights">
              <span className="dot">&middot;</span>
              {leg.nights} night{leg.nights === 1 ? "" : "s"}
            </span>
          </h1>
          {booked.length > 0 && (
            <div className="dateline">
              {booked.map((b, i) => (
                <div className="loc" key={i}>
                  <span className="loc-venue">
                    {b.venue}
                    {b.private && <em> (private)</em>}
                  </span>
                  {b.date && (
                    <span className="loc-when">
                      {b.doorTime ? `${b.doorTime.toLowerCase()} on ` : ""}
                      {formatEventDateShort(b.date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="section-head" id="cover">Cover my trip</div>
          <p className="p-note" style={{ marginTop: -16, marginBottom: 24 }}>
            Contribute any amount
          </p>
          <ul className="pieces">
            {LINES.map((line) => (
              <li key={line.key} className="piece">
                <div className="piece-row">
                  <div className="p-head">
                    <div className="p-text">
                      <span className="p-label">{line.label}</span>{" "}
                      {line.note ? <span className="p-note">{line.note}</span> : null}
                    </div>
                    <span className="p-price">{money(line.amount)}</span>
                  </div>
                  {coveredKeys.has(line.key) ? (
                    <div className="p-covered">
                      <span className="line-done" aria-label="Covered">
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      Covered
                    </div>
                  ) : (
                    <LineMatchControl
                      line={line}
                      value={lineVals[line.key]}
                      onChange={(v) => setLineVals((prev) => ({ ...prev, [line.key]: v }))}
                    />
                  )}
                </div>
                {line.key === "lodging" && (
                  <a
                    className="lodging-or"
                    href={`sms:${PHONE}?&body=${encodeURIComponent(
                      `Hi Peyt, I've got a place you could stay for your trip!`,
                    )}`}
                  >
                    or <span className="inkind-cta">offer your home or Center to stay</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="total-box">
            <div className="total-label">Total</div>
            <div className="total-amount">~{money(tripTotal)}</div>
          </div>
          <p className="bf-footer" style={{ marginTop: 8 }}>
            These figures are estimates based on previous tour stops, subject to change due to need
            and circumstances. At every stop, I bring merch and a donation box to earn it all back.
          </p>

          <div className="section-head">Honorarium</div>
          <p className="p-note" style={{ marginTop: -16, marginBottom: 24 }}>
            A gift that recognizes the artistic performance itself, separate from the trip.
          </p>
          <HonorariumControl value={honorarium} onChange={setHonorariumVal} />

          <div className="section-head" id="help">Other ways to help</div>
          <ul className="other-ways">
            {otherWays.map((item) => (
              <li key={item.key} className="other-item">
                <div className="other-body">
                  <div className="other-label">{item.label}</div>
                  {item.note ? <div className="other-note">{item.note}</div> : null}
                </div>
                {item.key === "host" ? (
                  <a
                    className="other-action"
                    href="/sponsor/host"
                    onMouseEnter={preloadGoogleMaps}
                    onFocus={preloadGoogleMaps}
                    onTouchStart={preloadGoogleMaps}
                    onClick={(e) => {
                      e.preventDefault();
                      setHostOpen(true);
                    }}
                  >
                    Become a concert host
                  </a>
                ) : (
                  <a
                    className="other-action"
                    href={`sms:${PHONE}?&body=${encodeURIComponent(item.smsBody)}`}
                  >
                    Text me
                  </a>
                )}
              </li>
            ))}
          </ul>

          {posterSlugs.length > 0 && (
            <ul className="other-ways" style={{ marginTop: 10 }}>
              <li className="other-item">
                <div className="other-body">
                  <div className="other-label">Spread the word</div>
                  <div className="other-note">
                    personal text &gt; group chat
                    {slugged.length === 1 && (
                      <>
                        {" · "}
                        <a href={`/api/poster/${posterSlugs[0]}?format=print`} className="inkind-cta">
                          print version
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {slugged.length === 1 ? (
                  <button
                    className="other-action"
                    onClick={() => sharePoster(posterSlugs[0])}
                    disabled={posterLoading}
                    style={{ opacity: posterLoading ? 0.6 : 1 }}
                  >
                    {posterLoading ? "Preparing…" : "Download my concert poster"}
                  </button>
                ) : (
                  <select
                    className="other-action"
                    value=""
                    disabled={posterLoading}
                    onChange={(e) => e.target.value && sharePoster(e.target.value)}
                    style={{ opacity: posterLoading ? 0.6 : 1 }}
                  >
                    <option value="">
                      {posterLoading ? "Preparing…" : "Download my concert poster"}
                    </option>
                    {slugged.map((b) => (
                      <option key={b.slug} value={b.slug} disabled={b.private}>
                        {b.private ? `${b.venue} (private, no poster)` : b.venue}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            </ul>
          )}

          <div className="section-head">Good to know</div>
          <div className="faq">
            <details>
              <summary>Can I give cash in person?</summary>
              <div className="faq-a">Yes, find me at one of my concerts in {leg.destination}.</div>
            </details>
          </div>
        </div>
      </div>

      {total > 0 && (
        <button className="contribute-fab" onClick={() => setCheckoutOpen(true)}>
          Contribute {money(total)}
          {honorariumAmt > 0 && lineTotal > 0 && (
            <span className="fab-split">
              {money(lineTotal)} trip + {money(honorariumAmt)} honorarium
            </span>
          )}
        </button>
      )}

      {checkoutOpen && (
        <ContributeOverlay
          items={items}
          trip={leg.slug}
          tripLabel={leg.shortName}
          venmoUrl={venmoUrl}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {hostOpen && (
        <div
          className="fixed inset-0 z-[950] flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setHostOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
            role="dialog"
            aria-modal="true"
            aria-label="Become a concert host"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-between items-center">
              <h1 className="text-2xl sm:text-[40px] lg:text-5xl font-medium leading-tight tracking-tight">
                Become a Concert Host
              </h1>
              <button
                onClick={() => setHostOpen(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-neutral-500 transition-colors hover:text-neutral-900 dark:bg-white/10 dark:hover:text-white"
              >
                &#x2715;
              </button>
            </div>
            <SponsorForm mode="host" hideBack />
          </div>
        </div>
      )}
    </>
  );
}
