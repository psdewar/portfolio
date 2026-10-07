"use client";

import Link from "next/link";
import { isResidence, publicVenueName } from "../../lib/shows-shared";
import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useSearchParams } from "next/navigation";
import { useAudio } from "../../contexts/AudioContext";
import { TRACK_DATA } from "../../data/tracks";
import posthog from "posthog-js";
import {
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
  MapPinIcon,
  CalendarBlankIcon,
  CheckSquareIcon,
  SquareIcon,
} from "@phosphor-icons/react";
import ZoneGrain from "../ZoneGrain";
import { SPLIT_QUERY, prefersReducedMotion } from "../flip";
import ShowPoster from "../ShowPoster";
import PosterSlot from "../PosterSlot";
import SplitFlapText from "../../components/SplitFlapText";
import PaymentModal, { venmoPayUrl } from "../../components/PaymentModal";
import { formatEventDateShort } from "../../lib/dates";
import { buildIcs, downloadIcs } from "../../lib/ics";
import { routeFormError } from "../../lib/form-errors";
import { calculateStripeFee } from "../../api/shared/products";

const TYPE = {
  display: "clamp(2.5rem, 10cqi, 6rem)",
  lead: "clamp(1.25rem, 0.6vw + 1.1rem, 1.625rem)",
  body: "clamp(1rem, 0.4vw + 0.9rem, 1.25rem)",
  label: "clamp(0.8125rem, 0.3vw + 0.75rem, 1rem)",
  value: "clamp(1.75rem, 1.5vw + 1.25rem, 2.75rem)",
  button: "clamp(1.25rem, 0.8vw + 1rem, 1.75rem)",
};

const parseSupportDollars = (draft: string) =>
  Math.min(10000, Math.round((parseInt(draft, 10) || 0) / 5) * 5);

const ROW_CLASS =
  "group flex items-center justify-between gap-3 w-full min-w-0";

function ActionRow({
  label,
  pill,
  pillAlt,
  href,
  onClick,
}: {
  label: React.ReactNode;
  pill: string;
  pillAlt?: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="min-w-0 text-[color:var(--z-fg)] text-left [text-wrap:pretty]" style={{ fontSize: TYPE.body }}>
        {label}
      </span>
      <span
        className={`shrink-0 rounded-full border border-[color:var(--z-bd)] px-4 py-1.5 font-medium text-[color:var(--z-fg)] transition-colors group-active:!bg-[var(--rsvp-row-press)] group-active:!text-[color:var(--rsvp-row-press-text)]${pillAlt ? " inline-grid" : ""}`}
        style={{ fontSize: TYPE.body }}
      >
        {pillAlt ? (
          <>
            <span className="[grid-area:1/1]">{pill}</span>
            <span className="invisible [grid-area:1/1]" aria-hidden>{pillAlt}</span>
          </>
        ) : (
          pill
        )}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={ROW_CLASS}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} className={ROW_CLASS}>
      {content}
    </button>
  );
}

const ADDRESS_HIDDEN_COPY = "RSVP to get address";

interface RSVPFormProps {
  eventId: string;
  date: string;
  isPast: boolean;
  city: string;
  region: string;
  doorTime?: string | null;
  doorLabel?: string | null;
  venue?: string | null;
  venueLabel?: string | null;
  eventName?: string | null;
  address?: string | null;
  tags?: string | null;
  fundDefault?: number | null;
  posterLine?: string | null;
  posterImg?: string | null;
  bgImg?: string | null;
  onBack?: () => void;
  enter?: "morph" | "flap" | "none";
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  guests: number;
}

interface FormErrors {
  name?: string;
  email?: string;
  form?: string;
}

type RsvpStatus = "going" | "maybe";

export default function RSVPForm({
  eventId,
  date,
  isPast,
  city,
  region,
  doorTime,
  doorLabel,
  venue,
  venueLabel,
  eventName,
  address,
  tags,
  fundDefault,
  posterLine,
  posterImg,
  bgImg,
  onBack,
  enter = "none",
}: RSVPFormProps) {
  const searchParams = useSearchParams();
  const supportLabelId = useId();
  const guestsLabelId = useId();
  const { loadTrack, toggle, currentTrack, isPlaying } = useAudio();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    guests: 1,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [mode, setMode] = useState<RsvpStatus>("going");
  const [submittedStatus, setSubmittedStatus] = useState<RsvpStatus>("going");
  const isMaybe = mode === "maybe";
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<"name" | "success" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(
    searchParams.get("test") === "success" || !!searchParams.get("session_id"),
  );
  useEffect(() => {
    const target = pendingScrollRef.current;
    if (!target) return;
    pendingScrollRef.current = null;
    if (window.matchMedia(SPLIT_QUERY).matches) return;
    (target === "name" ? nameFieldRef : successRef).current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, [mode, submitted]);
  const defaultSupportCents = (fundDefault ?? 0) * 100;
  const [committedCents, setSupportCents] = useState(defaultSupportCents);
  const [supportDraft, setSupportDraft] = useState<string | null>(null);
  const supportCents = supportDraft === null ? committedCents : parseSupportDollars(supportDraft) * 100;
  const [showPay, setShowPay] = useState(false);
  const [payError, setPayError] = useState("");
  const totalWithFeesCents = supportCents > 0 ? calculateStripeFee(supportCents) : 0;
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (searchParams.get("session_id")) {
      sessionStorage.setItem("stayConnectedCompleted", "true");
    }
    const fbclid = searchParams.get("fbclid");
    if (fbclid) sessionStorage.setItem("fbclid", fbclid);
  }, [searchParams]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (isDesktop) {
      nameInputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      posthog.capture("rsvp_viewed", {
        event_id: eventId,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [eventId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(mode);
  };

  const submit = async (status: RsvpStatus) => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          guests: status === "maybe" ? 1 : formData.guests,
          intent: status === "maybe" ? "maybe" : undefined,
          eventId,
          fbclid: searchParams.get("fbclid") || sessionStorage.getItem("fbclid") || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors(routeFormError(res.status, data.error));
        return;
      }

      sessionStorage.setItem("stayConnectedCompleted", "true");
      const emailLower = formData.email.trim().toLowerCase();
      posthog.identify(emailLower);
      localStorage.setItem("attendeeEmail", emailLower);

      posthog.capture("rsvp_submitted", {
        event_id: eventId,
        guests: status === "maybe" ? 1 : formData.guests,
        status,
        paid: status === "going" && supportCents > 0,
        amount_cents: status === "going" ? supportCents : 0,
      });

      setSubmittedStatus(status);
      pendingScrollRef.current = "success";
      setSubmitted(true);
      if (status === "going" && supportCents > 0) setShowPay(true);
    } catch {
      setErrors({ form: "Failed to submit. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const cardLoadingRef = useRef(false);
  const startCardCheckout = async () => {
    if (cardLoadingRef.current) return;
    cardLoadingRef.current = true;
    setPayError("");
    try {
      const checkoutRes = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "support-next-concert",
          amount: totalWithFeesCents,
          customerEmail: formData.email,
          successPath: `/rsvp/${eventId}`,
          cancelPath: `/rsvp/${eventId}`,
          metadata: {
            eventId,
            name: formData.name,
            phDistinctId: posthog.get_distinct_id?.() ?? "",
          },
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (checkoutRes.ok && checkoutData.url) {
        window.location.href = checkoutData.url;
        return;
      }
      setPayError(checkoutData.error || "Couldn't start checkout. Try Venmo or Zelle instead.");
    } catch {
      setPayError("Couldn't start checkout. Try Venmo or Zelle instead.");
    } finally {
      cardLoadingRef.current = false;
    }
  };

  const adjustGuests = (delta: number) =>
    setFormData((prev) => ({ ...prev, guests: Math.max(1, Math.min(10, prev.guests + delta)) }));

  const repeatRef = useRef<ReturnType<typeof setTimeout>>();
  const stopRepeat = useCallback(() => clearTimeout(repeatRef.current), []);
  const startRepeat = useCallback((action: () => void) => {
    action();
    let delay = 300;
    const tick = () => {
      action();
      delay = Math.max(50, delay * 0.75);
      repeatRef.current = setTimeout(tick, delay);
    };
    repeatRef.current = setTimeout(tick, 400);
  }, []);
  useEffect(() => () => clearTimeout(repeatRef.current), []);

  const repeatProps = (action: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") e.preventDefault();
      startRepeat(action);
    },
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    },
  });

  const dateLabel = formatEventDateShort(date);
  const residence = isResidence({ venue: venue ?? null, address: address ?? null });
  const showAddress = Boolean(address) && !residence;
  const publicVenue = publicVenueName({ venue: venue ?? null, address: address ?? null, venueLabel });
  const addressLine = showAddress ? `${address}, ${city}, ${region}` : null;
  const addressHiddenLine = isPast ? null : ADDRESS_HIDDEN_COPY;
  const venueLine2 = addressLine || addressHiddenLine;
  const doorDisplayLabel = doorLabel || (doorTime ? `Doors open at ${doorTime}` : null);
  const addToCalendar = () =>
    downloadIcs(
      `${eventId}.ics`,
      buildIcs({
        uid: `${eventId}@peytspencer.com`,
        title: `${eventName || "From The Ground Up"}, ${city}`,
        date,
        doorTime,
        location: [publicVenue, addressLine].filter(Boolean).join(", ") || `${city}, ${region}`,
        url: `https://peytspencer.com/rsvp/${eventId}`,
      }),
    );
  const poster = (
    <ShowPoster
      fill
      show={{ date, city, region, doorTime, doorLabel, venue: residence ? null : venue, venueLabel, address: residence ? null : address, tags, posterLine, posterImg, bgImg }}
    />
  );

  const pillText = { fontSize: TYPE.body };
  const parkinsans = { fontFamily: '"Parkinsans", sans-serif' };
  const gutter = "mx-auto w-[calc(100%-2*var(--g))] max-w-md split:mx-0 split:w-full split:max-w-none split:pr-[clamp(1.5rem,3vw,3rem)]";

  const backButton = onBack && (
    <div className="relative z-[1] order-1 hidden split:block split:pt-6 split:w-full split:pr-[clamp(1.5rem,3vw,3rem)]">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--z-pill)] hover:bg-[var(--z-pill-h)] ring-1 ring-inset ring-[color:var(--z-pillbd)] transition-colors px-4 py-1.5 font-semibold text-[color:var(--z-pillfg)]"
        style={pillText}
      >
        <ArrowLeftIcon size="1.1em" weight="bold" />
        All shows
      </button>
    </div>
  );

  function submitLabel(): string {
    if (isLoading) return "Reserving...";
    return isMaybe ? "Keep me posted" : "I'll Be There";
  }

  const adjustSupport = (deltaCents: number) => {
    setSupportCents(Math.max(0, supportCents + deltaCents));
    setSupportDraft(null);
  };
  const commitSupportDraft = () => {
    if (supportDraft === null) return;
    setSupportCents(supportCents);
    setSupportDraft(null);
  };

  const labelClass =
    "block text-neutral-500 dark:text-neutral-400";
  const labelStyle = {
    fontSize: TYPE.body,
    lineHeight: 1.5,
    marginBottom: `max(0px, calc(clamp(0.375rem, 0.5vw, 0.625rem) + round(down, 1.5 * ${TYPE.label}, 1px) - 1.5 * ${TYPE.body}))`,
  };
  const fieldClass =
    "w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white pb-2 text-neutral-900 dark:text-white";

  const stepBtn =
    "flex-1 min-w-0 self-stretch flex items-center px-2 touch-manipulation text-neutral-700 dark:text-neutral-200 [@media(hover:hover)]:hover:text-neutral-900 dark:[@media(hover:hover)]:hover:text-white active:bg-neutral-900/5 dark:active:bg-white/10 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:active:bg-transparent disabled:cursor-not-allowed transition-colors select-none";

  const renderStepper = ({
    value,
    center,
    onMinus,
    onPlus,
    minusDisabled,
    plusDisabled,
    minusLabel,
    plusLabel,
  }: {
    value: string | number;
    center?: React.ReactNode;
    onMinus: () => void;
    onPlus: () => void;
    minusDisabled?: boolean;
    plusDisabled?: boolean;
    minusLabel: string;
    plusLabel: string;
  }) => (
    <div className="[container-type:inline-size] border-b border-neutral-300 dark:border-neutral-700 focus-within:border-neutral-900 dark:focus-within:border-white transition-colors">
    <div className="flex items-stretch h-[clamp(3.5rem,2.5vw+2.5rem,4.25rem)]">
      <button
        type="button"
        {...repeatProps(onMinus)}
        disabled={minusDisabled}
        className={`${stepBtn} justify-start`}
        aria-label={minusLabel}
      >
        <MinusIcon size="1.5rem" weight="bold" />
      </button>
      {center ?? (
        <div className="shrink-0 flex items-center justify-center px-2 pointer-events-none select-none">
          <span
            className="text-neutral-900 dark:text-white tabular-nums font-bold"
            style={{ fontSize: TYPE.value }}
          >
            {value}
          </span>
        </div>
      )}
      <button
        type="button"
        {...repeatProps(onPlus)}
        disabled={plusDisabled}
        className={`${stepBtn} justify-end`}
        aria-label={plusLabel}
      >
        <PlusIcon size="1.5rem" weight="bold" />
      </button>
    </div>
    </div>
  );

  const walkInFree = supportCents === 0;
  const supportGroup = (
    <div role="group" aria-labelledby={supportLabelId} className="min-w-0">
      <span id={supportLabelId} className={labelClass} style={labelStyle}>
        Fund my tour across North America
      </span>
      {renderStepper({
        value: formatCents(supportCents),
        center: (
          <div
            className="shrink-0 inline-flex items-center justify-center gap-0 px-2 text-neutral-900 dark:text-white font-bold"
            style={{ fontSize: TYPE.value }}
          >
            <span aria-hidden="true">$</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Support amount in dollars"
              value={supportDraft ?? String(Math.round(supportCents / 100))}
              onChange={(e) => setSupportDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onFocus={(e) => e.target.select()}
              onBlur={commitSupportDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSupportDraft();
                }
              }}
              className="bg-transparent p-0 text-left tabular-nums font-bold focus:outline-none"
              style={{ fontSize: "inherit", width: `${Math.max(1, (supportDraft ?? String(Math.round(supportCents / 100))).length) * 1.12}ch` }}
            />
          </div>
        ),
        onMinus: () => adjustSupport(-500),
        onPlus: () => adjustSupport(500),
        minusDisabled: supportCents <= 0,
        minusLabel: "Decrease support by $5",
        plusLabel: "Increase support by $5",
      })}
      <p className="mt-2 text-neutral-500 dark:text-neutral-400 tabular-nums" style={pillText}>
        {supportCents > 0 ? "no fees with Venmo or Zelle" : "no charges"}
      </p>
    </div>
  );
  const walkInButton = (
    <button
      type="button"
      role="checkbox"
      aria-checked={walkInFree}
      onClick={() => setSupportCents(walkInFree ? defaultSupportCents || 2000 : 0)}
      className="relative before:absolute before:inset-x-0 before:-inset-y-1 w-full flex items-center gap-3 py-1.5 text-left text-neutral-700 dark:text-neutral-300 select-none"
      style={pillText}
    >
      {walkInFree ? (
        <CheckSquareIcon size="1.5em" weight="fill" className="shrink-0 text-neutral-900 dark:text-white" />
      ) : (
        <SquareIcon size="1.5em" className="shrink-0 text-neutral-400" />
      )}
      <span>Walk in for free</span>
    </button>
  );

  const rsvpLink = `peytspencer.com/rsvp/${eventId}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [showLinkInput, setShowLinkInput] = useState(false);

  const markCopied = () => {
    setLinkCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
  };

  const copyRsvpLink = async () => {
    try {
      await navigator.clipboard.writeText(rsvpLink);
      markCopied();
    } catch {
      if (typeof navigator.share === "function") {
        navigator.share({ url: `https://${rsvpLink}` }).catch(() => {});
      } else {
        setShowLinkInput(true);
      }
    }
  };

  const shareLink = (
    <>
      <ActionRow label="Invite a friend to come with you" pill={linkCopied ? "Copied" : "Copy link"} onClick={copyRsvpLink} />
      {showLinkInput && (
        <input
          readOnly
          aria-label="RSVP link"
          value={rsvpLink}
          autoFocus
          onFocus={(e) => e.target.select()}
          className={`${fieldClass} mt-3`}
          style={pillText}
        />
      )}
    </>
  );

  const patience = TRACK_DATA.find((t) => t.id === "patience")!;
  const patiencePlaying = currentTrack?.id === patience.id && isPlaying;

  const playPatience = () => {
    if (currentTrack?.id === patience.id) {
      toggle();
      return;
    }
    loadTrack(
      { id: patience.id, title: patience.title, artist: patience.artist, src: patience.audioUrl, thumbnail: patience.thumbnail, duration: patience.duration },
      true,
    );
  };

  const calendarRow = <ActionRow label="Add the concert to your calendar" pill="Add" onClick={addToCalendar} />;

  const goingSuccess = (
    <div ref={successRef} className="scroll-mt-4 space-y-6">
      <div>
        <h2
          className="font-extrabold uppercase leading-none text-[color:var(--z-fg)]"
          style={{ ...parkinsans, fontSize: "clamp(2rem, 6cqi, 3rem)" }}
        >
          YOU'RE CONFIRMED
        </h2>
        <p className="text-[color:var(--z-fg3)] mt-3 leading-snug" style={{ fontSize: TYPE.body }}>
          I sent my 2025 Singles & 16s Pack to your inbox as a thank you.
        </p>
      </div>
      <div className="space-y-3">
        <ActionRow label={<>Learn my song “Patience” before <span className="whitespace-nowrap">{city}</span></>} pill={patiencePlaying ? "Pause" : "Play"} pillAlt={patiencePlaying ? "Play" : "Pause"} onClick={playPatience} />
        {calendarRow}
        {formData.guests === 1 && shareLink}
      </div>
    </div>
  );

  const maybeSuccess = (
    <div ref={successRef} className="scroll-mt-4 space-y-6">
      <div>
        <h2
          className="font-extrabold uppercase leading-none text-[color:var(--z-fg)]"
          style={{ ...parkinsans, fontSize: "clamp(2rem, 6cqi, 3rem)" }}
        >
          You're in.
        </h2>
        <p className="text-[color:var(--z-fg3)] mt-3 leading-snug" style={{ fontSize: TYPE.body }}>
          You'll hear from me before {city}.
        </p>
      </div>
      <div className="space-y-3">
        {calendarRow}
        {shareLink}
      </div>
    </div>
  );

  const successContent = submittedStatus === "maybe" ? maybeSuccess : goingSuccess;

  const buildClass = enter === "morph" ? "rsvp-build" : "";
  const buildStyle = (i: number) => (enter === "morph" ? ({ "--i": i } as React.CSSProperties) : undefined);
  const infoPrimary = "block font-semibold text-[color:var(--z-fg)] break-words leading-snug";
  const infoPrimaryStyle = { fontSize: TYPE.lead };
  const infoRow = "flex items-start gap-3 min-w-0";
  const iconBox = "shrink-0 flex items-center h-[1lh] leading-snug text-[color:var(--z-ico)]";
  const iconSize = "1.35em";
  const dateRowText = (
    <>
      <span className={infoPrimary} style={infoPrimaryStyle}>
        {dateLabel}
      </span>
      {doorDisplayLabel && (
        <span className="block text-[color:var(--z-fg3)]" style={infoPrimaryStyle}>
          {doorDisplayLabel}
        </span>
      )}
    </>
  );

  return (
    <div className="rsvp-root fixed inset-x-0 top-[var(--header-h,65px)] bottom-0 overflow-hidden split:relative split:top-0 split:bottom-auto split:flex-1 split:overflow-visible">
      {showPay && (
        <PaymentModal
          venmoUrl={venmoPayUrl(supportCents / 100, `Concert support ${city}`)}
          label={`Concert support · ${city}`}
          amount={formatCents(supportCents)}
          hint={`No fees with Venmo or Zelle. Card adds processing fees (${formatCents(totalWithFeesCents)} total).`}
          error={payError}
          onCard={startCardCheckout}
          onClose={() => setShowPay(false)}
        />
      )}

      <ZoneGrain />

      <div className="relative h-full overflow-y-auto touch-pan-y flex flex-col split:flex-row-reverse split:h-auto split:min-h-[calc(100dvh-var(--header-h,65px))] split:overflow-visible [--g:clamp(1rem,4vw,1.5rem)] split:mx-auto split:max-w-7xl split:px-8">
        <div
          data-detail-poster className={`relative z-[1] hidden split:block split:sticky split:top-[var(--header-h,65px)] split:self-start split:h-[calc(100dvh-var(--header-h,65px))] split:flex-1 split:min-w-0 overflow-hidden ${enter === "morph" ? "split:rsvp-build" : ""}`}
          style={buildStyle(0)}
        >
          {poster}
        </div>
        <PosterSlot className="order-3 mt-auto" />

        <div className="contents split:relative split:flex split:flex-col split:flex-[0_1_calc(28rem+clamp(1.5rem,3vw,3rem))] split:min-w-0">
          {backButton}

          <div
            className={`relative z-[1] order-1 split:order-3 [container-type:inline-size] pt-6 split:pt-4 min-w-0 ${gutter} ${submitted ? "pb-8 split:pb-[max(2rem,var(--player-h,0px))]" : ""}`}
          >
            {submitted ? (
              successContent
            ) : (
              <div className="space-y-[clamp(1.25rem,2vw,2rem)] split:pb-6">
                <div className="relative">
                  <h1 className="font-extrabold leading-none">
                    <span
                      className={`block font-normal mb-1 text-[color:var(--z-fg2)] `}
                      style={{ fontSize: TYPE.lead }}
                    >
                      {isPast ? "Thank you," : "See you in"}
                    </span>
                    <span className="block break-words leading-[0.95]">
                      <span
                        data-flip-city
                        className="inline-block text-[color:var(--z-fg)] split:![font-size:clamp(2.5rem,12.3cqi,3.45rem)]"
                        style={{ ...parkinsans, fontSize: TYPE.display }}
                      >
                        <SplitFlapText text={city} active={enter === "flap"} />
                      </span>
                    </span>
                    <span aria-hidden="true" className="rsvp-hair mt-3 h-px w-full max-w-[9rem]" />
                  </h1>
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="split:hidden absolute right-0 h-9 before:absolute before:-inset-x-1.5 before:-inset-y-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--z-pill)] hover:bg-[var(--z-pill-h)] ring-1 ring-inset ring-[color:var(--z-pillbd)] transition-colors px-4 py-1.5 font-semibold text-[color:var(--z-pillfg)]"
                      style={{ top: `calc((${TYPE.lead} - 2.25rem) / 2)`, fontSize: TYPE.body }}
                    >
                      <ArrowLeftIcon size="1.1em" weight="bold" aria-hidden="true" />
                      All shows
                    </button>
                  )}
                </div>

                <ul className="space-y-[clamp(0.875rem,1.5vw,1.25rem)]">
                  <li className={`${infoRow} ${buildClass}`} style={buildStyle(1)}>
                    <span className={iconBox} style={infoPrimaryStyle}><CalendarBlankIcon size={iconSize} weight="bold" aria-hidden="true" /></span>
                    <div className="flex-1 min-w-0 whitespace-nowrap">{dateRowText}</div>
                  </li>
                  <li className={`${infoRow} ${buildClass}`} style={buildStyle(2)}>
                    <span className={iconBox} style={infoPrimaryStyle}><MapPinIcon size={iconSize} weight="bold" aria-hidden="true" /></span>
                    {publicVenue ? (
                      <span className="flex-1 min-w-0 flex flex-col justify-center min-h-[1lh] leading-snug" style={infoPrimaryStyle}>
                        <span className="block font-semibold text-[color:var(--z-fg)] break-words leading-snug">{publicVenue}</span>
                        {venueLine2 && (
                          <span className="block break-words leading-snug text-[color:var(--z-fg3)]">{venueLine2}</span>
                        )}
                      </span>
                    ) : (
                      <span className="flex-1 min-w-0 flex items-center min-h-[1lh] leading-snug" style={infoPrimaryStyle}>
                        {addressLine ? (
                          <span className="block font-semibold text-[color:var(--z-fg)] break-words leading-snug">{addressLine}</span>
                        ) : (
                          <span className="block font-semibold text-[color:var(--z-fg3)] leading-snug">
                            {isPast ? `${city}, ${region}` : venueLine2}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>

          {!submitted && (
            <div className={`relative z-[1] order-2 split:order-4 [container-type:inline-size] w-full min-w-0 ${buildClass}`} style={buildStyle(3)}>
              {isPast ? (
                <div className="w-full px-[var(--g)] split:pl-0 split:pr-[clamp(1.5rem,3vw,3rem)] pt-[clamp(1.25rem,3cqi,2.5rem)] pb-8 split:pb-[max(2rem,var(--player-h,0px))]">
                  <div className="mx-auto split:mx-0 w-full max-w-md split:max-w-none">
                    <Link
                      href="/moments"
                      className="flex items-center justify-center w-full h-[clamp(3.5rem,3vw+2.5rem,4.75rem)] text-[#0a0a0a] font-semibold border-2 border-neutral-900 shadow-[4px_4px_0_#0a0a0a] split:shadow-[6px_6px_0_#0a0a0a] transition-[transform,box-shadow] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                      style={{ ...parkinsans, background: "#d4a553", fontSize: TYPE.button }}
                    >
                      See the moments
                    </Link>
                  </div>
                </div>
              ) : (
                <form
                  id="rsvp-form"
                  onSubmit={handleSubmit}
                  noValidate
                  className="w-full px-[var(--g)] split:pl-0 split:pr-[clamp(1.5rem,3vw,3rem)] pt-[clamp(1.25rem,3cqi,2.5rem)] pb-8 split:pb-[max(2rem,var(--player-h,0px))]"
                >
                  <div className="mx-auto split:mx-0 w-full max-w-md split:max-w-none space-y-[clamp(1.25rem,2vw,2rem)]">
                    <div ref={nameFieldRef} className="scroll-mt-4">
                      <label htmlFor="rsvp-name" className={labelClass} style={labelStyle}>
                        Name *
                      </label>
                      <input
                        id="rsvp-name"
                        ref={nameInputRef}
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        enterKeyHint="next"
                        autoComplete="name"
                        className={`${fieldClass} ${errors.name ? "!border-red-500" : ""}`}
                        style={pillText}
                      />
                      {errors.name && <p className="text-red-500 mt-1" style={{ fontSize: TYPE.body }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label htmlFor="rsvp-email" className={labelClass} style={labelStyle}>
                        Email address *
                      </label>
                      <input
                        id="rsvp-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        enterKeyHint="next"
                        autoComplete="email"
                        className={`${fieldClass} ${errors.email ? "!border-red-500" : ""}`}
                        style={pillText}
                      />
                      {errors.email && <p className="text-red-500 mt-1" style={{ fontSize: TYPE.body }}>{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="rsvp-phone" className={labelClass} style={labelStyle}>
                        Phone
                      </label>
                      <input
                        id="rsvp-phone"
                        type="tel"
                        inputMode="tel"
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        enterKeyHint="done"
                        autoComplete="tel"
                        className={fieldClass}
                        style={pillText}
                      />
                    </div>

                    {!isMaybe && (
                      <>
                        <div role="group" aria-labelledby={guestsLabelId} className="min-w-0">
                          <span id={guestsLabelId} className={labelClass} style={labelStyle}>
                            How many people? *
                          </span>
                          {renderStepper({
                            value: formData.guests,
                            onMinus: () => adjustGuests(-1),
                            onPlus: () => adjustGuests(1),
                            minusDisabled: formData.guests <= 1,
                            plusDisabled: formData.guests >= 10,
                            minusLabel: "Decrease guests",
                            plusLabel: "Increase guests",
                          })}
                        </div>
                        {supportGroup}
                        {walkInButton}
                      </>
                    )}

                    {errors.form && <p className="text-red-500" style={{ fontSize: TYPE.body }}>{errors.form}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[clamp(3.5rem,3vw+2.5rem,4.75rem)] text-[#0a0a0a] font-semibold tabular-nums border-2 border-neutral-900 shadow-[4px_4px_0_#0a0a0a] split:shadow-[6px_6px_0_#0a0a0a] transition-[transform,box-shadow] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#0a0a0a]"
                      style={{ ...parkinsans, background: "#d4a553", fontSize: TYPE.button }}
                    >
                      {submitLabel()}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pendingScrollRef.current = isMaybe ? null : "name";
                        setMode(isMaybe ? "going" : "maybe");
                      }}
                      className="!mt-3 mx-auto flex w-fit min-h-11 items-center px-3 text-neutral-500 dark:text-neutral-400 [@media(hover:hover)]:hover:text-neutral-900 dark:[@media(hover:hover)]:hover:text-[color:var(--z-fg)] transition-colors"
                      style={pillText}
                    >
                      <span className="underline underline-offset-4">{isMaybe ? "I'll be there" : "Interested, keep me posted"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
