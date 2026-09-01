"use client";

import { Social } from "../components/Social";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import posthog from "posthog-js";
import SponsorForm from "../components/SponsorForm";
import PaymentOptions from "../components/PaymentOptions";
import CheckoutEmbed from "../components/CheckoutEmbed";
import { venmoPayUrl } from "../components/PaymentModal";
import MomentsGallery from "../moments/MomentsGallery";
import SectionNav from "./SectionNav";
import { preloadGoogleMaps } from "../lib/maps";
import { formatEventDateShort } from "../lib/dates";
import { type FundLeg, type FundLine, type FundBooked } from "./legs";
import { ArrowRightIcon, PlayIcon } from "@phosphor-icons/react";
import { useVideo } from "../contexts/VideoContext";
import { getVideoMetadata, LEG_INTRO_VIDEOS } from "../lib/videos.config";

const PHONE = process.env.NEXT_PUBLIC_PHONE ?? "";

function isShowPast(dateStr: string): boolean {
  return new Date(`${dateStr}T23:59:59`) < new Date();
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function BookedRow({ booking, done }: { booking: FundBooked; done: boolean }) {
  const linkable = !done && Boolean(booking.slug) && !booking.private;
  const [name, ...rest] = booking.venue.split(", ");
  const place = rest.join(", ");
  const content = (
    <>
      {done && (
        <span className="loc-check is-done" role="img" aria-label="Completed">
          <CheckIcon />
        </span>
      )}
      <div className="loc-info">
        <span className="loc-venue">
          {name}
          {linkable && (
            <span className="rsvp-chip">
              RSVP
              <ArrowRightIcon size={13} weight="bold" />
            </span>
          )}
        </span>
        {(place || booking.date) && (
          <span className="loc-when">
            {place}
            {place && booking.date ? " · " : ""}
            {booking.date && booking.doorTime ? `${booking.doorTime.toLowerCase()} ` : ""}
            {booking.date ? formatEventDateShort(booking.date) : ""}
          </span>
        )}
      </div>
    </>
  );
  return linkable ? (
    <a className="loc loc-link" href={`/rsvp/${booking.slug}`}>
      {content}
    </a>
  ) : (
    <div className="loc">{content}</div>
  );
}

function LinePrice({ amount, gifted }: { amount: number; gifted: boolean }) {
  return (
    <span
      className={gifted ? "p-price p-price--gifted" : "p-price"}
      aria-label={gifted ? `${money(amount)}, covered` : undefined}
    >
      {money(amount)}
    </span>
  );
}

const QUICK_PICKS = [25, 50];

function LineMatchControl({
  value,
  onChange,
  full,
  presets,
}: {
  value: string;
  onChange: (v: string) => void;
  full?: number;
  presets: number[];
}) {
  const pressed = full !== undefined && value === String(full);
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
        {full !== undefined && (
          <button
            className="match-btn match-full"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? "" : String(full))}
          >
            Full
          </button>
        )}
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
  venmoUrl,
  amountCents,
  onClose,
}: {
  items: { key: string; amountCents: number }[];
  trip: string;
  venmoUrl: string;
  amountCents: number;
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

  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(() => {
      window.location.href = "/support#find-me";
    }, 1500);
    return () => clearTimeout(t);
  }, [complete]);

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
          {!complete && (
            <span className="contribute-title">
              {method === "card"
                ? "Fund my From The Ground Up tour"
                : `Send ${money(amountCents / 100)} with`}
            </span>
          )}
          <button className="contribute-close" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>
        {complete ? (
          <div className="contribute-thanks">
            <div className="contribute-thanks-title">Thank you, find me on socials</div>
            <div className="contribute-thanks-spinner" aria-label="Loading" />
          </div>
        ) : method === "card" ? (
          <CheckoutEmbed
            fetchClientSecret={fetchClientSecret}
            onComplete={() => {
              posthog.capture("fund_contribution_completed", {
                trip,
                method: "card",
                amount_cents: amountCents,
              });
              setComplete(true);
            }}
          />
        ) : (
          <div className="contribute-choice">
            <PaymentOptions
              venmoUrl={venmoUrl}
              onCard={() => setMethod("card")}
              onSelect={(method) =>
                posthog.capture("fund_payment_method", { trip, method, amount_cents: amountCents })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LegIntroVideo({ videoId }: { videoId: string }) {
  const { openVideo } = useVideo();
  const meta = getVideoMetadata(videoId);
  if (!meta?.thumbnail) return null;
  const label = [meta.title, meta.byline].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className="camp-intro"
      onClick={() => openVideo(videoId, meta.src)}
      aria-label={label ? `Play ${label}` : "Play the intro video"}
    >
      <img src={meta.thumbnail} alt={meta.title ?? "Intro video"} className="camp-intro-poster" />
      <span className="camp-intro-scrim" />
      <span className="camp-intro-play">
        <PlayIcon size={28} weight="fill" />
      </span>
      <span className="camp-intro-label">
        <span className="camp-intro-kicker">Watch</span>
        {meta.title && <span className="camp-intro-song">{meta.title}</span>}
        {meta.byline && <span className="camp-intro-by">{meta.byline}</span>}
      </span>
    </button>
  );
}

export function FundFunnel({
  leg,
  intro,
  og = false,
  nextTrip,
  recentTrip,
  concertsSoFar = 0,
}: {
  leg: FundLeg;
  intro?: ReactNode;
  og?: boolean;
  nextTrip?: { slug: string; destination: string };
  recentTrip?: { destination: string; stops: FundBooked[] };
  concertsSoFar?: number;
}) {
  const introVideoId = og ? undefined : LEG_INTRO_VIDEOS[leg.slug];
  const coveredKeys = new Set(leg.coveredInKind ?? []);
  const LINES = (leg.lines ?? []).filter((l) => l.amount > 0);
  const isPastStop = (b: FundBooked) => Boolean(b.date && isShowPast(b.date));
  const allBooked = leg.booked ?? [];
  const upcoming = allBooked.filter((b) => !isPastStop(b));
  const past = allBooked.filter(isPastStop);
  const hasBooked = allBooked.length > 0;
  const displayPast = past.length > 0 ? past : (recentTrip?.stops ?? []);
  const showsVisible = upcoming.length > 0 || displayPast.length > 0;
  const lastPastDate = displayPast.filter((b) => b.date).map((b) => b.date!).sort().pop();
  const pastMonth = lastPastDate
    ? new Date(`${lastPastDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";
  const completedText =
    past.length > 0
      ? `I brought my tour here in ${pastMonth}`
      : recentTrip
        ? `I brought my tour to ${recentTrip.destination} in ${pastMonth}`
        : "";
  const completedHint = "Expand for past locations and dates";

  const flightBy = leg.flightBy
    ? new Date(`${leg.flightBy}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "";
  const tripTotal = LINES.reduce((sum, line) => sum + line.amount, 0);


  const navItems = [
    ...(showsVisible ? [{ id: "schedule", label: "Schedule" }] : []),
    { id: "cover", label: "Cover my trip" },
    ...(intro ? [{ id: "who", label: "Who you're funding" }] : []),
    { id: "help", label: "You can also" },
  ];

  const otherWays = [
    {
      key: "host",
      label: hasBooked ? "Host another concert" : "Host a concert in your living room",
      note: hasBooked ? "in your living room or local venue" : "or local venue",
    },
  ];

  const [lineVals, setLineVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(LINES.map((l) => [l.key, ""])),
  );
  const [honorarium, setHonorariumVal] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const openIntro = () => {
    if (!introOpen) posthog.capture("fund_intro_opened", { trip: leg.slug });
    setIntroOpen(true);
  };
  const [hostOpen, setHostOpen] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

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
  const venmoUrl = venmoPayUrl(total, venmoNote);
  const amountCents = items.reduce((sum, it) => sum + it.amountCents, 0);

  const slugged = upcoming.filter(
    (b): b is FundBooked & { slug: string } => Boolean(b.slug),
  );
  const posterSlugs = slugged.filter((b) => !b.private).map((b) => b.slug);
  const sharePoster = async (slug: string) => {
    setPosterLoading(true);
    try {
      const res = await fetch(`/api/poster/${slug}?format=ig&jpg=true`);
      const blob = await res.blob();
      const file = new File([blob], `poster-${slug}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch {}
        return;
      }
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
  --btn-border: rgba(232,229,221,0.42);
  --navy: #262b3f;
  --fs-xs: 13px;
  --fs-sm: 15px;
  --fs-base: 16px;
  --fs-md: 18px;
  --fs-lg: 21px;
  --fs-xl: 24px;
  --fs-2xl: 28px;
  --fs-head: clamp(30px, 6vw, 46px);
  --fs-hero: clamp(40px, 10vw, 72px);
  --act-bg: rgba(167,177,214,0.08);
  --act-border: rgba(167,177,214,0.45);
  --act-text: #a7b1d6;
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
    --act-bg: rgba(38,43,63,0.05);
    --act-border: rgba(38,43,63,0.4);
    --act-text: #262b3f;
    --bg: #fafafa;
    --surface: #f0f0f1;
    --surface-2: #e8e8ea;
    --rule: rgba(20,20,24,0.08);
    --rule-strong: rgba(20,20,24,0.20);
    --btn-border: rgba(20,20,24,0.45);
    --paper: #17181a;
    --ink: #45464b;
    --ink-dim: #707278;
    --ghost: #a5a7ad;
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
  font-family: var(--font-outfit), system-ui, -apple-system, sans-serif;
  font-size: var(--fs-base);
  line-height: 1.55;
  font-variant-numeric: tabular-nums lining-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  position: relative;
  min-height: 100vh;
}
.bf-root::before {
  content: '';
  position: fixed; top: env(safe-area-inset-top, 0px); left: 0; right: 0; bottom: 0;
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
.status-shield { display: none; position: fixed; top: 0; left: 0; right: 0; height: calc(env(safe-area-inset-top, 0px) + 6px); background: var(--navy); z-index: 1500; pointer-events: none; }
@media (hover: none) and (pointer: coarse) { .status-shield { display: block; } }
body { padding-top: env(safe-area-inset-top, 0px); }
.wrap { max-width: 780px; margin: 0 auto; padding: 0 16px 72px; position: relative; }
@media (min-width: 640px) { .wrap { padding: 0 40px 80px; } }


.masthead { width: 100%; margin-top: 28px; }
.bf-brand { font-family: var(--font-bebas), sans-serif; font-size: 24px; letter-spacing: -0.025em; line-height: 1; text-decoration: none; }
@media (min-width: 640px) { .bf-brand { font-size: 30px; } }
.tail { display: flex; flex-direction: column; min-height: calc(100vh - 18px); }
.bf-root > .wrap { padding-bottom: 0; }
.bf-root--og #cover, .bf-root--og #who, .bf-root--og .tail, .bf-root--og .done-toggle-row { display: none; }
.bf-root--og .done--band summary { padding: 24px 16px; }
.bf-root--og .masthead { margin-top: 12px; }
.bf-root--og .prev-band { margin-top: 20px; }
.bf-root--og > .wrap { height: calc(100vh - 48px); overflow: hidden; display: flex; flex-direction: column; }
.bf-root--og .gallery-slot { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.bf-root--og .gallery-slot section { flex: 1; display: flex; min-height: 0; }
.bf-root--og .gallery-slot img { flex: 1 1 0; height: auto; min-height: 0; object-fit: cover; object-position: 50% 100%; }
.tail .wrap { width: 100%; padding-top: 0; }
.site-foot { margin-top: auto; border-top: 1px solid var(--surface-2); padding-bottom: 120px; }
.site-foot-inner { max-width: 780px; margin: 0 auto; padding: 20px 16px 0; }
@media (min-width: 640px) { .site-foot-inner { padding: 20px 40px 0; } }
.site-foot-row { display: flex; flex-direction: column; gap: 8px; }
@media (min-width: 640px) { .site-foot-row { flex-direction: row; align-items: center; justify-content: space-between; gap: 24px; } }
.site-foot .bf-brand { color: var(--paper); align-self: flex-start; }
@media (min-width: 640px) { .site-foot .bf-brand { align-self: center; } }
.site-foot-social { margin-left: -12px; }
@media (min-width: 640px) { .site-foot-social { margin-left: 0; margin-right: -12px; } }
.site-foot-social a { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin: 0; padding: 0; color: var(--ink-dim); }
.site-foot-social a:hover { color: var(--paper); }
.site-foot-social svg { width: 28px; height: 28px; }
.bf-h1 {
  font-size: var(--fs-hero); line-height: 0.98; text-align: left;
  letter-spacing: -0.025em; color: var(--paper); margin: 10px 0 0; font-weight: 600;
}
.bf-h1 em { font-style: normal; color: var(--gold); }

.dateline { margin-top: 8px; display: flex; flex-direction: column; gap: 14px; }
.loc { display: flex; align-items: center; gap: 10px; }
.loc-check {
  flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; color: #fff;
}
.loc-check.is-done { background: #16a34a; }
.loc-info { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.loc-venue { color: var(--paper); font-weight: 700; font-size: clamp(20px, 4.6vw, 24px); line-height: 1.1; display: flex; align-items: center; gap: 10px; }
.loc-venue em { font-style: italic; font-weight: 400; opacity: 0.75; font-size: 0.66em; }
.loc-when { color: var(--ink-dim); font-size: var(--fs-sm); }
.rsvp-chip {
  flex: 0 0 auto; margin-left: auto; display: inline-flex; align-items: center; gap: 4px;
  background: var(--gold); color: #17181a; border-radius: 6px; padding: 2px 8px; line-height: 20px;
  font-size: var(--fs-xs); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  text-decoration: none;
}
.loc-link { text-decoration: none; color: inherit; margin: -6px -12px; padding: 6px 12px; transition: background 0.15s ease; }
.loc-link:hover, .loc-link:active { background: var(--act-bg); }
.loc-link:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 6px; }

html { scroll-behavior: smooth; }
.bf-section { scroll-margin-top: 66px; margin-top: 48px; }
.section-head { display: none; }
.section-sub { margin: 0 0 20px; }
@media (max-width: 639px) {
  .piece { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
}

.done { margin-top: 16px; border-radius: 12px; background: var(--act-bg); overflow: hidden; }
.done summary {
  cursor: pointer; list-style: none; display: flex; align-items: center; gap: 12px; padding: 16px 18px;
}
.done summary::-webkit-details-marker { display: none; }
.done summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.done-summary-text { color: var(--paper); font-weight: 600; font-size: var(--fs-md); }
.row-hint { display: block; color: var(--ink-dim); font-weight: 400; font-size: var(--fs-sm); margin-top: 2px; }
.expander { flex: 0 0 auto; margin-left: auto; color: var(--act-text); display: inline-flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
details[open] .expander { transform: rotate(180deg); }
.row-hint-open, details[open] .row-hint-closed { display: none; }
details[open] .row-hint-open { display: block; }
.done-dateline { margin-top: 0; padding: 14px 18px 18px; border-top: 1px solid var(--rule); }
.done-count { color: var(--ink-dim); font-size: var(--fs-sm); display: flex; align-items: baseline; gap: 8px; }
.done-count strong { color: var(--gold); font-size: var(--fs-xl); font-weight: 700; line-height: 1; }


.pieces { list-style: none; margin: 0; padding: 0; }
.piece {
  border-bottom: 1px solid var(--rule); display: flex; flex-direction: column;
}
.piece-row { display: flex; flex-direction: column; gap: 12px; padding: 18px 0; }
.p-head { display: flex; align-items: baseline; gap: 12px; }
.p-text { flex: 1 1 auto; min-width: 0; line-height: 1.4; }
.p-price { flex: 0 0 auto; color: var(--paper); font-weight: 700; font-size: var(--fs-xl); line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.p-label { color: var(--paper); font-weight: 600; font-size: var(--fs-md); }
.p-note { color: var(--ink-dim); font-size: var(--fs-base); }
.inkind-cta { color: var(--paper); text-decoration: underline; }
.p-price--gifted { color: var(--ink-dim); text-decoration: line-through; text-decoration-color: var(--gold); text-decoration-thickness: 2px; }
.lodging-or { display: block; padding: 0 0 16px; font-size: var(--fs-base); color: var(--ink-dim); text-decoration: none; }
.bf-root a.next-trip { margin-top: 48px; display: inline-flex; align-items: baseline; gap: 14px; font-size: var(--fs-head); font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; color: var(--gold); text-decoration: none; }
.next-trip:hover .next-trip-title, .next-trip:focus-visible .next-trip-title { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; }
.next-trip-arrow { display: inline-flex; align-self: center; transition: transform 0.2s ease; }
.next-trip:hover .next-trip-arrow { transform: translateX(6px); }
@media (prefers-reduced-motion: reduce) { .next-trip-arrow, .next-trip:hover .next-trip-arrow { transition: none; transform: none; } }
.total-box { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 0 0; }
.total-label { color: var(--paper); font-weight: 600; font-size: var(--fs-md); }
.total-amount { color: var(--paper); font-weight: 700; font-size: var(--fs-xl); line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }

.prev-band { margin: 28px calc(50% - 50vw) 0; width: 100vw; background: var(--navy); }
.done--band { margin-top: 0; border-radius: 0; background: transparent; overflow: visible; }
.done--band summary { display: block; padding: 30px 16px 30px; }
@media (min-width: 640px) { .done--band summary { padding: 36px 40px 36px; } }
.done--band[open] summary { padding-bottom: 14px; }
.done--band .prev-trip, .done--band .prev-label, .done--band .prev-note { display: block; }
.done-toggle-row { display: flex; align-items: center; margin-top: 18px; }
.done--band .row-hint { color: rgba(236, 233, 224, 0.72); margin-top: 0; }
@media (hover: hover) { .done--band summary:hover .row-hint { color: #fff; } }
.done--band .expander { color: var(--gold); }
.done--band .done-dateline { margin: 0; padding: 16px 16px 30px; border-top: 1px solid rgba(255, 255, 255, 0.14); }
@media (min-width: 640px) { .done--band .done-dateline { margin: 0 40px; padding: 16px 0 36px; } }
.done--band .loc-venue { color: #ece9e0; }
.done--band .loc-when, .done--band .done-count { color: rgba(236, 233, 224, 0.72); }
.prev-band-inner { max-width: 780px; margin: 0 auto; }
.prev-trip + .prev-trip { margin-top: 26px; }
.prev-label { color: var(--gold); font-size: var(--fs-xs); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.prev-note { margin-top: 10px; font-family: var(--font-fraunces), Georgia, serif; font-size: var(--fs-lg); line-height: 1.5; color: #ece9e0; }

.match-ctrl { flex: 0 0 auto; }
.match-input-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.match-prefix { color: var(--ink-dim); font-size: var(--fs-xl); font-weight: 600; }
.match-field {
  display: inline-flex; align-items: center; gap: 4px; height: 44px; padding: 0 10px;
  background: var(--surface-2); border: 1px solid var(--rule-strong); border-radius: 8px;
}
.match-field:focus-within { border-color: var(--paper); }
.match-input {
  width: 60px; background: transparent; border: none;
  color: var(--paper); font: inherit; font-size: var(--fs-xl); font-weight: 700;
  text-align: right; padding: 0; outline: none;
  -moz-appearance: textfield;
}
.match-input::-webkit-outer-spin-button,
.match-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.match-input:invalid { box-shadow: none; }
.match-btn {
  cursor: pointer; background: var(--act-bg); border: 1.5px solid var(--act-border);
  border-radius: 8px; color: var(--act-text); font: inherit; font-size: var(--fs-base); font-weight: 600;
  flex: 0 0 auto; height: 44px; padding: 7px 12px; white-space: nowrap; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}
.match-btn:hover { background: var(--navy); border-color: var(--navy); color: var(--gold); }
.match-btn:active { transform: scale(0.97); }
.match-btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.match-full, .match-field + .match-chip { margin-left: auto; }
.match-full, .match-chip { width: 60px; padding: 7px 0; }
.match-full[aria-pressed="true"] { background: var(--navy); border-color: var(--navy); color: var(--gold); }
.match-chip::before { content: '+$'; opacity: 0.8; }
@media (max-width: 359px) {
  .match-field { padding: 0 8px; }
  .match-input { width: 44px; }
  .match-full, .match-chip { width: 52px; }
  .match-input-row { gap: 5px; }
}
.other-ways { list-style: none; margin: 0; padding: 0; }
.other-item {
  padding: 22px 0; display: flex; gap: 12px 16px; align-items: center; min-width: 0;
}
@media (min-width: 640px) {
  .other-ways + .other-ways { border-top: 1px solid var(--rule); }
}
.other-body { flex: 1 1 auto; min-width: 0; }
.other-label { color: var(--paper); font-weight: 600; font-size: var(--fs-md); }
.other-note { color: var(--ink-dim); font-size: var(--fs-base); margin-top: 4px; }
.other-action {
  flex: 0 0 auto; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--act-bg); color: var(--act-text); font: inherit; font-weight: 600; font-size: var(--fs-base);
  border: 1.5px solid var(--act-border); border-radius: 8px; min-height: 48px; padding: 10px 18px; white-space: nowrap;
  max-width: 100%; min-width: 0; transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.other-action:hover { background: var(--navy); border-color: var(--navy); color: var(--gold); }
.other-action:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
@media (min-width: 561px) { select.other-action { width: 17rem; } }
@media (max-width: 560px) {
  .other-item { flex-wrap: wrap; }
  .other-action, .other-soon { flex-basis: 100%; width: 100%; text-align: center; }
}

.intro-row {
  display: flex; align-items: center; gap: 16px; width: 100%; text-align: left; cursor: pointer;
  padding: 16px 18px; border: 0; border-radius: 12px; background: var(--act-bg);
  color: var(--paper); font: inherit; font-size: var(--fs-base); line-height: 1.45;
}
.intro-face {
  flex: 0 0 auto; align-self: stretch; width: 76px; min-height: 76px; object-fit: cover;
  object-position: 50% 30%; margin: -16px 0 -16px -18px; border-radius: 12px 0 0 12px;
}
.intro-row-text { flex: 1 1 auto; min-width: 0; font-weight: 600; }
.intro-row:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.expander.is-open { transform: rotate(180deg); }
.intro-reveal { margin-top: 24px; }

.bf-footer { margin-top: 44px; font-size: var(--fs-base); color: var(--ink-dim); line-height: 1.65; }
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
  font-family: var(--font-outfit), system-ui, -apple-system, sans-serif;
  font-size: var(--fs-2xl);
  font-weight: 400;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3);
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.contribute-fab:hover { opacity: 0.9; }
.contribute-fab:active { transform: translateX(-50%) translateY(1px); }
.fab-split { font-size: var(--fs-xs); font-weight: 600; opacity: 0.85; letter-spacing: 0; }

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
.contribute-title { font-family: var(--font-outfit), system-ui, -apple-system, sans-serif; font-size: var(--fs-xl); font-weight: 500; color: #1a1915; letter-spacing: -0.01em; }
.contribute-close {
  margin-left: auto;
  background: rgba(0,0,0,0.06);
  border: none; border-radius: 50%;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: var(--fs-xs); color: #555;
  transition: color 0.15s ease;
}
.contribute-close:hover { color: #000; }

.contribute-thanks {
  padding: 20px 32px 48px; text-align: center;
}
.contribute-thanks-title {
  font-size: var(--fs-2xl); font-weight: 700; color: #1a1915; letter-spacing: -0.02em; margin-bottom: 12px;
}
.contribute-thanks-spinner {
  width: 28px; height: 28px; margin: 22px auto 0;
  border: 3px solid var(--rule); border-top-color: var(--paper);
  border-radius: 50%; animation: cspin 0.7s linear infinite;
}
@keyframes cspin { to { transform: rotate(360deg); } }

.contribute-choice { padding: 6px 28px 30px; }

.camp-intro {
  display: block; position: relative; width: 100%; aspect-ratio: 16 / 9;
  margin-bottom: 40px; padding: 0; border: 1px solid var(--rule); border-radius: 12px;
  overflow: hidden; background: #000; cursor: pointer;
}
.camp-intro-poster {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  display: block; transition: transform 0.4s ease;
}
.camp-intro:hover .camp-intro-poster { transform: scale(1.03); }
.camp-intro-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 46%);
}
.camp-intro-play {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; color: #fff; background: rgba(0,0,0,0.45);
  border: 2px solid rgba(255,255,255,0.92);
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}
.camp-intro-play svg { margin-left: 3px; }
.camp-intro:hover .camp-intro-play {
  background: var(--gold); border-color: var(--gold);
  transform: translate(-50%, -50%) scale(1.06);
}
.camp-intro-label {
  position: absolute; left: 16px; bottom: 13px; display: flex; flex-direction: column; gap: 2px;
  text-align: left; color: #fff; line-height: 1.05;
  font-family: var(--font-parkinsans), "Parkinsans", sans-serif; font-weight: 700;
  letter-spacing: 0.01em; text-shadow: 0 1px 10px rgba(0,0,0,0.55);
}
.camp-intro-kicker {
  font-family: var(--font-fraunces), Georgia, serif; font-style: italic; font-weight: 500; font-size: var(--fs-xs);
  letter-spacing: 0.02em; color: var(--gold); text-shadow: none;
}
.camp-intro-song { font-size: var(--fs-lg); font-weight: 700; }
.camp-intro-by { font-size: var(--fs-xs); font-weight: 500; letter-spacing: 0.01em; color: rgba(255,255,255,0.92); }
@media (max-width: 639px) {
  .wrap--intro { padding-top: 0; }
  .camp-intro {
    width: calc(100% + 32px); margin-left: -16px; margin-right: -16px; margin-bottom: 48px;
    border: 0; border-radius: 0;
  }
}

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

      <div className={og ? "bf-root bf-root--og" : "bf-root"}>
        <div className="status-shield" aria-hidden="true" />
        <SectionNav
          items={navItems}
          trip={leg.slug}
          frozen={og}
          onJump={(id) => {
            if (id === "who") openIntro();
          }}
        />
        <div className={introVideoId ? "wrap wrap--intro" : "wrap"}>
          {introVideoId && <LegIntroVideo videoId={introVideoId} />}

          <div className="masthead">
            <h1 className="bf-h1">
              <em>{leg.destination.replace(/^the /, "")}</em>
            </h1>
          </div>

          {showsVisible && (
            <section id="schedule" className="bf-section" style={{ marginTop: 16 }}>
              {upcoming.length > 0 && (
                <div className="dateline">
                  {upcoming.map((b, i) => (
                    <BookedRow key={i} booking={b} done={false} />
                  ))}
                </div>
              )}
              {displayPast.length > 0 && (
                <div className="prev-band">
                  <div className="prev-band-inner">
                    <details className="done done--band">
                      <summary>
                        {(leg.previousTrips ?? []).length > 0 ? (
                          (leg.previousTrips ?? []).map((trip) => (
                            <span key={trip.label} className="prev-trip">
                              <span className="prev-label">{trip.label}</span>
                              <span className="prev-note">{trip.note}</span>
                            </span>
                          ))
                        ) : (
                          <span className="prev-note">{completedText}.</span>
                        )}
                        <span className="done-toggle-row">
                          <span className="row-hint row-hint-closed">{completedHint}</span>
                          <span className="row-hint row-hint-open">See less</span>
                          <span className="expander" aria-hidden="true">
                            <ChevronIcon />
                          </span>
                        </span>
                      </summary>
                      <div className="dateline done-dateline">
                        {displayPast.map((b, i) => (
                          <BookedRow key={i} booking={b} done />
                        ))}
                        {concertsSoFar > 0 && (
                          <span className="done-count">
                            <strong>{concertsSoFar}</strong> concerts across North America so far
                          </span>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="gallery-slot" style={{ marginTop: displayPast.length > 0 ? 0 : 48 }}>
            <MomentsGallery og={og} leg={leg.slug} />
          </div>

          <section id="cover" className="bf-section">
            <div className="section-head">Cover my trip</div>
            <p className="p-note section-sub">
              Any amount helps. Venmo, Zelle, or card.
            </p>
            <ul className="pieces">
              {LINES.map((line) => {
                const note =
                  line.key === "flight" && flightBy ? `${line.note} · booked by ${flightBy}` : line.note;
                return (
                  <li key={line.key} className="piece">
                    <div className="piece-row">
                      <div className="p-head">
                        <div className="p-text">
                          <span className="p-label">{line.label}</span>{" "}
                          {note ? <span className="p-note">{note}</span> : null}
                        </div>
                        <LinePrice amount={line.amount} gifted={coveredKeys.has(line.key)} />
                      </div>
                      {!coveredKeys.has(line.key) && (
                        <LineMatchControl
                          value={lineVals[line.key]}
                          onChange={(v) => setLineVals((prev) => ({ ...prev, [line.key]: v }))}
                          full={line.amount}
                          presets={QUICK_PICKS.filter((p) => p < line.amount)}
                        />
                      )}
                    </div>
                    {line.key === "lodging" && !coveredKeys.has("lodging") && (
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
                );
              })}
              <li className="piece piece--honorarium">
                <div className="piece-row">
                  <div className="p-head">
                    <div className="p-text">
                      <span className="p-label">Honorarium</span>{" "}
                      <span className="p-note">for the performance itself, separate from the trip</span>
                    </div>
                  </div>
                  <LineMatchControl
                    value={honorarium}
                    onChange={setHonorariumVal}
                    presets={[...QUICK_PICKS, 100]}
                  />
                </div>
              </li>
            </ul>
            <div className="total-box">
              <div className="total-label">Total</div>
              <div className="total-amount">~{money(tripTotal)}</div>
            </div>
            <p className="bf-footer" style={{ marginTop: 8 }}>
              Estimates from my previous tour stops, subject to change. I also bring merch and a
              donation box to every concert.
            </p>

          </section>

          {intro && (
            <section id="who" className="bf-section">
              <div className="section-head">Who you&apos;re funding</div>
              <button
                type="button"
                className="intro-row"
                onClick={() => (introOpen ? setIntroOpen(false) : openIntro())}
                aria-expanded={introOpen}
              >
                <img src="/images/home/bio.jpeg" alt="" className="intro-face" />
                <span className="intro-row-text">
                  Rapper and software engineer from Bellevue, Washington
                  <span className="row-hint">{introOpen ? "See less" : "Expand for more info"}</span>
                </span>
                <span className={introOpen ? "expander is-open" : "expander"} aria-hidden="true">
                  <ChevronIcon />
                </span>
              </button>
              {introOpen && <div className="intro-reveal space-y-8">{intro}</div>}
            </section>
          )}
        </div>

        <div className="tail">
          <div className={introVideoId ? "wrap wrap--intro" : "wrap"}>
          <section id="help" className="bf-section">
            <div className="section-head">You can also</div>
            {posterSlugs.length > 0 && (
              <ul className="other-ways">
                <li className="other-item">
                  <div className="other-body">
                    <div className="other-label">Spread the word</div>
                    <div className="other-note">
                      personal texts work best, group chats help too
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
            <ul className="other-ways">
              <li className="other-item">
                <div className="other-body">
                  <div className="other-label">Donate in person</div>
                  <div className="other-note">find me at one of my concerts</div>
                </div>
                <a className="other-action" href="/shop">
                  Or buy merch
                </a>
              </li>
            </ul>

            <ul className="other-ways">
              {otherWays.map((item) => (
                <li key={item.key} className="other-item">
                  <div className="other-body">
                    <div className="other-label">{item.label}</div>
                    {item.note ? <div className="other-note">{item.note}</div> : null}
                  </div>
                  {item.key === "host" && (
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
                  )}
                </li>
              ))}
            </ul>
          </section>

          {nextTrip && (
            <a className="next-trip" href={`/fund/${nextTrip.slug}#cover`}>
              <span className="next-trip-title">
                Up next: {nextTrip.destination.replace(/^the /, "")}
              </span>
              <span className="next-trip-arrow" aria-hidden="true">
                <ArrowRightIcon size={34} weight="bold" />
              </span>
            </a>
          )}
          </div>
          <footer className="site-foot">
          <div className="site-foot-inner">
            <div className="site-foot-row">
              <a href="/" className="bf-brand">Peyt Spencer</a>
              <div className="site-foot-social">
                <Social isHorizontal />
              </div>
            </div>
          </div>
          </footer>
        </div>
      </div>

      {total > 0 && (
        <button
          className="contribute-fab"
          onClick={() => {
            posthog.capture("checkout_initiated", {
              product: "fund",
              trip: leg.slug,
              amount_cents: Math.round(total * 100),
              trip_cents: Math.round(lineTotal * 100),
              honorarium_cents: Math.round(honorariumAmt * 100),
              lines: items.map((i) => i.key),
            });
            setCheckoutOpen(true);
          }}
        >
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
          venmoUrl={venmoUrl}
          amountCents={amountCents}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {hostOpen && (
        <div
          className="fixed inset-0 z-[950] flex items-start justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setHostOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg lg:max-w-3xl rounded-2xl bg-white p-6 lg:p-8 shadow-2xl dark:bg-neutral-900"
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
