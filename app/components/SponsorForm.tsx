"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquareIcon,
  SquareIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  LockSimpleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { SUPPORT_MENU, SUPPORTER_ITEMS } from "../lib/sponsor";
import { useGoogleMaps, createAutocomplete } from "../lib/maps";
import { type Show, getVenueLabel, getDoorLabel } from "../lib/shows";
import { formatMonthDay, formatLongDate, isDatePast } from "../lib/dates";

// 11:30AM → 9:30PM, 30-min increments
const DOOR_TIMES = Array.from({ length: 21 }, (_, i) => {
  const dayMin = 690 + i * 30; // 690 = 11:30AM in minutes
  const h = Math.floor(dayMin / 60);
  const min = dayMin % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")}${ampm}`;
});

function parseDoorTimeMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export interface SponsorFields {
  name: string;
  email: string;
  phone: string;
  city: string;
  region: string;
  country: string;
  venue?: string;
  address?: string;
  date: string;
  doorTime: string;
  items: string[];
  role?: "host" | "supporter";
}

interface SponsorFormProps {
  showSlug?: string;
  submittedAt?: string;
  venue?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  date?: string;
  doorTime?: string;
  compact?: boolean;
  isPdfMode?: boolean;
  editMode?: boolean;
  readOnly?: boolean;
  mode?: "host" | "supporter";
  initialItems?: string[];
  initialDates?: string[];
  initialDoorTimes?: string[];
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  draftId?: string;
  draftSlug?: string;
  onSuccess?: (data: SponsorFields) => void;
}

export default function SponsorForm({
  showSlug,
  submittedAt,
  venue,
  address,
  city,
  region,
  country,
  date,
  doorTime,
  compact,
  isPdfMode,
  editMode,
  readOnly,
  mode,
  initialItems,
  initialDates,
  initialDoorTimes,
  initialName,
  initialPhone,
  initialEmail,
  draftId,
  draftSlug,
  onSuccess,
}: SponsorFormProps) {
  const router = useRouter();
  const mapsReady = useGoogleMaps();
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const doorTimeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [doorTimeOpenIndex, setDoorTimeOpenIndex] = useState<number | null>(null);

  const defaultSupporterItems =
    mode === "supporter" && !editMode && !compact && !initialItems ? [SUPPORTER_ITEMS[0]] : [];
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialItems || defaultSupporterItems),
  );
  const [eventVenue, setEventVenue] = useState(venue || "");
  const [eventAddress, setEventAddress] = useState(address || "");
  const [eventCity, setEventCity] = useState(city || "");
  const [eventRegion, setEventRegion] = useState(region || "");
  const [eventCountry, setEventCountry] = useState(country || "");
  const [eventDates, setEventDates] = useState<string[]>(
    initialDates && initialDates.length > 0 ? initialDates : date ? [date] : [""],
  );
  const [eventDoorTimes, setEventDoorTimes] = useState<string[]>(() => {
    const len = initialDates && initialDates.length > 0 ? initialDates.length : 1;
    return Array.from({ length: len }, (_, i) => initialDoorTimes?.[i] ?? doorTime ?? "");
  });
  const [sponsorName, setSponsorName] = useState(initialName || "");
  const [sponsorPhone, setSponsorPhone] = useState(initialPhone || "");
  const [sponsorEmail, setSponsorEmail] = useState(initialEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Wizard state — only active for the public form (not editMode/compact/isPdfMode)
  const isWizard = !editMode && !compact && !isPdfMode;
  const [wizardMode, setWizardMode] = useState<"host" | "supporter" | null>(mode || null);
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(
    !isWizard ? 2 : mode === "host" ? 2 : mode === "supporter" ? (showSlug ? 2 : 1) : 0,
  );
  const [pickerShows, setPickerShows] = useState<Show[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const hasFetchedShows = useRef(false);
  const [selectedShowSlug, setSelectedShowSlug] = useState<string | null>(showSlug || null);
  const [hostNames, setHostNames] = useState<Record<string, string>>({});

  const cityReadOnly = isPdfMode || (compact && !!city);
  const dateReadOnly = (compact && !!date) || isPdfMode || (!!draftId && !!date);
  const hasLocation = !!(eventCity && eventRegion);

  // Fetch shows + sponsors once when entering supporter mode
  useEffect(() => {
    if (wizardMode !== "supporter" || hasFetchedShows.current) return;
    hasFetchedShows.current = true;
    setPickerLoading(true);
    Promise.all([
      fetch("/api/shows")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/sponsors")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(
        ([showsData, sponsorsData]: [
          Show[],
          { showSlug?: string; name?: string; role?: string }[],
        ]) => {
          setPickerShows(
            Array.isArray(showsData)
              ? showsData
                  .filter((s) => s.status === "upcoming" && !isDatePast(s.date))
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              : [],
          );
          const names: Record<string, string> = {};
          if (Array.isArray(sponsorsData)) {
            for (const sp of sponsorsData) {
              if (!sp.showSlug || !sp.name) continue;
              if (sp.role === "host") {
                names[sp.showSlug] = sp.name;
              } else if (!names[sp.showSlug]) {
                names[sp.showSlug] = sp.name;
              }
            }
          }
          setHostNames(names);
        },
      )
      .catch(() => setPickerShows([]))
      .finally(() => setPickerLoading(false));
  }, [wizardMode]);

  const initAutocomplete = useCallback(() => {
    if (!mapsReady || cityReadOnly || !cityContainerRef.current) return;
    const cls = `w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white ${compact ? "pb-1 text-sm" : "pb-1.5 lg:pb-2 text-base sm:text-lg"}`;
    createAutocomplete(
      cityContainerRef.current,
      (result) => {
        setEventVenue(result.venue === result.city ? "" : result.venue);
        setEventAddress(result.address);
        setEventCity(result.city);
        setEventRegion(result.region);
        setEventCountry(result.country);
      },
      cls,
    );
  }, [mapsReady, cityReadOnly, compact]);

  useEffect(() => {
    initAutocomplete();
  }, [initAutocomplete]);

  useEffect(() => {
    if (doorTimeOpenIndex === null) return;
    const handler = (e: MouseEvent) => {
      const ref = doorTimeRefs.current[doorTimeOpenIndex];
      if (ref && !ref.contains(e.target as Node)) setDoorTimeOpenIndex(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [doorTimeOpenIndex]);

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const handleSubmit = async () => {
    const email = sponsorEmail.trim();
    if (email && !email.includes("@")) {
      setSubmitResult({ ok: false, msg: "Please enter a valid email." });
      return;
    }
    if (checked.size === 0) {
      setSubmitResult({ ok: false, msg: "Please check at least one item." });
      return;
    }

    const isSupporter = wizardMode === "supporter";

    if (!isSupporter) {
      if (!eventCity || !eventRegion) {
        setSubmitResult({ ok: false, msg: "Please select a city." });
        return;
      }

      const multi = eventDates.length > 1;
      const seenByDate = new Map<string, number[]>();
      for (let i = 0; i < eventDates.length; i++) {
        const d = eventDates[i].trim();
        if (!d) {
          setSubmitResult({
            ok: false,
            msg: multi ? `Pick a date for row ${i + 1} or remove it.` : "Pick a date.",
          });
          return;
        }
        const t = eventDoorTimes[i]?.trim();
        if (!t) {
          setSubmitResult({
            ok: false,
            msg: multi ? `Pick a door time for ${formatLongDate(d)}.` : "Pick a door time.",
          });
          return;
        }
        const minutes = parseDoorTimeMinutes(t);
        if (minutes === null) continue;
        const prior = seenByDate.get(d) || [];
        for (const pm of prior) {
          if (Math.abs(pm - minutes) < 120) {
            setSubmitResult({
              ok: false,
              msg:
                pm === minutes
                  ? `${formatLongDate(d)} at ${t} is listed twice. Change the door time or remove the duplicate.`
                  : `Two shows on ${formatLongDate(d)} need at least 2 hours between door times.`,
            });
            return;
          }
        }
        seenByDate.set(d, [...prior, minutes]);
      }
    }

    if (isSupporter && !selectedShowSlug) {
      setSubmitResult({ ok: false, msg: "Please select a show to support." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    const slotsToSubmit = isSupporter
      ? []
      : eventDates.map((d, i) => ({
          date: d.trim(),
          doorTime: eventDoorTimes[i].trim(),
        }));
    const primarySlot = slotsToSubmit[0] || { date: "", doorTime: "" };

    const fields: SponsorFields = {
      name: sponsorName.trim(),
      email,
      phone: sponsorPhone.trim(),
      city: isSupporter ? "" : eventCity,
      region: isSupporter ? "" : eventRegion,
      country: isSupporter ? "" : eventCountry,
      venue: isSupporter ? "" : eventVenue || "",
      address: isSupporter ? "" : eventAddress || "",
      date: isSupporter ? "" : primarySlot.date,
      doorTime: isSupporter ? "" : primarySlot.doorTime,
      items: Array.from(checked),
      role: isSupporter ? "supporter" : "host",
    };

    const buildSponsorBody = (slug: string, slot: { date: string; doorTime: string }) => ({
      showSlug: slug,
      ...fields,
      date: slot.date,
      doorTime: slot.doorTime,
      ...(editMode && submittedAt ? { submittedAt } : {}),
    });

    try {
      const isDraftCompletion = !!(draftId && draftSlug && !isSupporter);

      if (isDraftCompletion) {
        const patchRes = await fetch("/api/shows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: draftSlug,
            visibility: "public",
            doorTime: primarySlot.doorTime || undefined,
            venue: eventVenue || null,
            address: eventAddress || null,
          }),
        });
        if (!patchRes.ok) {
          setSubmitResult({ ok: false, msg: "Didn't save. Text me and I'll fix it." });
          return;
        }

        const sponsorRes = await fetch("/api/sponsors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSponsorBody(draftSlug, primarySlot)),
        });
        if (!sponsorRes.ok) {
          const data = await sponsorRes.json().catch(() => ({}));
          setSubmitResult({ ok: false, msg: data.error || "Couldn't save your details." });
          return;
        }

        onSuccess?.(fields);
        router.push(`/rsvp?submitted=${draftSlug}`);
        return;
      }

      const isHostNewSubmission = !editMode && !isSupporter && !showSlug;

      if (isHostNewSubmission) {
        const showResults = await Promise.allSettled(
          slotsToSubmit.map((slot) =>
            fetch("/api/shows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: slot.date,
                doorTime: slot.doorTime,
                city: eventCity,
                region: eventRegion,
                country: eventCountry,
                venue: eventVenue || null,
                address: eventAddress || null,
                planStatus: "intent",
              }),
            }).then(async (r) => {
              if (!r.ok) throw new Error(await r.text());
              return { slug: (await r.json()).slug as string, slot };
            }),
          ),
        );
        const booked = showResults.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

        if (booked.length === 0) {
          setSubmitResult({ ok: false, msg: "Didn't book. Text me and I'll fix it." });
          return;
        }

        await Promise.allSettled(
          booked.map(({ slug, slot }) =>
            fetch("/api/sponsors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildSponsorBody(slug, slot)),
            }),
          ),
        );

        if (booked.length > 1) {
          const pamphletId = `${eventCity}-${eventRegion}-${primarySlot.date}`
            .toLowerCase()
            .replace(/[^\w]+/g, "-")
            .replace(/^-+|-+$/g, "");
          if (pamphletId) {
            fetch("/api/pamphlets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: pamphletId,
                shows: booked.map((b) => ({ slug: b.slug })),
              }),
            }).catch(() => {});
          }
        }

        onSuccess?.(fields);
        router.push(`/rsvp?submitted=${booked.map((b) => b.slug).join(",")}`);
        return;
      }

      const finalShowSlug = isSupporter ? selectedShowSlug : showSlug;
      const res = await fetch("/api/sponsors", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSponsorBody(finalShowSlug!, primarySlot)),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitResult({ ok: false, msg: data.error || "Something went wrong." });
        return;
      }

      const data = await res.json();

      if (editMode) {
        setSubmitResult({ ok: true, msg: "Updated." });
        onSuccess?.(fields);
      } else {
        onSuccess?.(fields);
        router.push(`/rsvp?submitted=${data.showSlug}`);
      }
    } catch {
      setSubmitResult({ ok: false, msg: "Didn't submit. Text me and I'll fix it." });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = `w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white ${compact ? "pb-1 text-sm" : "pb-1.5 lg:pb-2 text-base sm:text-lg"}`;
  const iconSize = compact ? 16 : 20;
  const cityDisplay = eventCity && eventRegion ? `${eventCity}, ${eventRegion}` : eventCity;
  const resolvedVenue = eventVenue || venue;
  const locationDisplay = resolvedVenue
    ? `${resolvedVenue}, ${cityDisplay || city}`
    : cityDisplay || city;

  const selectedShow =
    wizardMode === "supporter" && selectedShowSlug
      ? (pickerShows.find((s) => s.slug === selectedShowSlug) ?? null)
      : null;
  const supporterLocked = !!(wizardMode === "supporter" && selectedShowSlug);
  const isSupporter = mode === "supporter" || (isWizard && wizardMode === "supporter");
  const headingClass = `font-medium mb-1 ${compact ? "text-lg" : "text-xl lg:text-2xl sm:mb-2 lg:mb-3"} ${isPdfMode ? "mt-4" : ""}`;
  const desktopCols: number[][] = [[0], [1]];

  const showLocationDisplay = (show: Show) =>
    show.venueLabel ||
    (show.venue ? `${show.venue}, ${show.city}, ${show.region}` : `${show.city}, ${show.region}`);

  const contactFields = (!isPdfMode || sponsorName || sponsorPhone || sponsorEmail) && (
    <div
      className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3 sm:gap-4"}`}
      style={
        isPdfMode
          ? {
              gridTemplateColumns: `repeat(${[sponsorName, sponsorPhone, sponsorEmail].filter(Boolean).length}, 1fr)`,
            }
          : undefined
      }
    >
      {(!isPdfMode || sponsorName) && (
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            placeholder="Your name or organization"
            required={isWizard && wizardMode === "supporter"}
            disabled={readOnly}
            className={fieldClass}
          />
        </div>
      )}
      {(!isPdfMode || sponsorPhone) && (
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
            Phone
          </label>
          <input
            type="text"
            value={sponsorPhone}
            onChange={(e) => setSponsorPhone(e.target.value)}
            placeholder="(206) 555-0100"
            disabled={readOnly}
            className={fieldClass}
          />
        </div>
      )}
      {(!isPdfMode || sponsorEmail) && (
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={sponsorEmail}
            onChange={(e) => setSponsorEmail(e.target.value)}
            placeholder="abc@email.com"
            disabled={readOnly}
            className={fieldClass}
          />
        </div>
      )}
    </div>
  );

  const renderCheckItem = (item: string, size: number) => {
    const isChecked = checked.has(item);
    const Icon = isChecked ? CheckSquareIcon : SquareIcon;
    return (
      <button
        key={item}
        onClick={() => toggleItem(item)}
        disabled={readOnly}
        className={`flex items-start gap-2 w-full text-left group ${readOnly ? "opacity-75 cursor-default" : ""}`}
      >
        <Icon
          size={size}
          weight={isChecked ? "fill" : "regular"}
          className={`mt-0.5 flex-shrink-0 ${isChecked ? "text-neutral-900 dark:text-white" : "text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors"}`}
        />
        <span
          className={`leading-snug ${compact ? "text-sm" : "text-base sm:text-lg"} ${isChecked ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}
        >
          {item}
          {item === "Artist honorarium" && (
            <span
              className={`block text-neutral-400 dark:text-neutral-500 ${compact ? "text-xs" : "text-xs sm:text-sm"}`}
            >
              Recognizes the performance itself. Any amount goes a long way.
            </span>
          )}
        </span>
      </button>
    );
  };

  // ── Wizard step 1 (supporter): show picker ─────────────────────────────────
  if (isWizard && wizardStep === 1 && wizardMode === "supporter") {
    return (
      <div>
        <Link
          href="/sponsor"
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-5"
        >
          <ArrowLeftIcon size={14} />
          Back
        </Link>

        <p className={`font-medium mb-3 ${compact ? "text-base" : "text-lg sm:text-xl"}`}>
          Choose a show to support
        </p>

        {pickerLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
              />
            ))}
          </div>
        ) : pickerShows.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No shows are currently open for support.
          </p>
        ) : (
          <div className="space-y-2">
            {pickerShows.map((show) => (
              <Link
                key={show.slug}
                href={`/sponsor/support/${show.slug}`}
                className="w-full text-left flex items-center justify-between gap-4 rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group"
              >
                <div>
                  <p className="font-medium text-sm">{showLocationDisplay(show)}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {formatMonthDay(show.date)}
                    {show.doorTime && ` · ${getDoorLabel(show)}`}
                  </p>
                </div>
                <ArrowRightIcon
                  size={16}
                  className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main form (wizard step 1 host, wizard step 2, or flat/edit/compact/pdf) ─
  const showBackButton = isWizard && wizardStep > 0;
  const backHref =
    wizardMode === "host"
      ? "/sponsor"
      : wizardMode === "supporter" && showSlug
        ? "/sponsor/support"
        : wizardMode === "supporter"
          ? "/sponsor"
          : null;
  const backIsLink = !!backHref;

  return (
    <div>
      {draftId && !isPdfMode && !readOnly && (
        <div className="mb-5 sm:mb-6 lg:mb-5 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-900/40">
          <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
            I started this booking for you. Add your venue and contact, and I'll send the
            poster you can share with your Assembly. About 30 seconds.
          </p>
        </div>
      )}
      {showBackButton &&
        (backIsLink ? (
          <Link
            href={backHref!}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-5"
          >
            <ArrowLeftIcon size={14} />
            Back
          </Link>
        ) : (
          <button
            onClick={() =>
              setWizardStep((prev) => {
                const next = (prev - 1) as 0 | 1 | 2;
                if (next === 1 && wizardMode === "supporter") setSelectedShowSlug(null);
                return next;
              })
            }
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-5"
          >
            <ArrowLeftIcon size={14} />
            Back
          </button>
        ))}

      {isSupporter ? (
        <>
          {/* Supporter: show summary */}
          {!(mode === "supporter" && compact) && (
            <div className={compact ? "mb-3" : "mb-5 sm:mb-6 lg:mb-5"}>
              {!compact && !isPdfMode && (
                <h2 className="font-medium text-xl lg:text-2xl">
                  {supporterLocked && hostNames[selectedShowSlug!]
                    ? `Hosted by ${hostNames[selectedShowSlug!]}`
                    : "Show details"}
                </h2>
              )}
              {selectedShow ? (
                <div
                  className={`text-neutral-500 dark:text-neutral-400 ${compact ? "text-sm" : "text-base sm:text-lg"} ${!compact && !isPdfMode ? "mt-2" : ""}`}
                >
                  <p>{showLocationDisplay(selectedShow)}</p>
                  <p>{formatLongDate(selectedShow.date)}</p>
                  <p>{getDoorLabel(selectedShow)}</p>
                </div>
              ) : (
                <p className={`text-neutral-400 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
                  Loading...
                </p>
              )}
            </div>
          )}

          {/* Supporter: Contact info box */}
          {!(mode === "supporter" && compact) &&
            (!isPdfMode || sponsorName || sponsorPhone || sponsorEmail) && (
              <div
                className={`rounded-lg border border-neutral-200 dark:border-neutral-800 ${compact ? "mb-3 p-3" : "mb-5 sm:mb-6 lg:mb-5 p-4 sm:p-5 lg:p-6"}`}
              >
                {!compact && !isPdfMode && (
                  <h2 className="font-medium text-xl lg:text-2xl mb-3 sm:mb-4">Support details</h2>
                )}
                {contactFields}
              </div>
            )}

          {/* Supporter: checkboxes (last, so honorarium is right before submit) */}
          <section>
            <h2 className={headingClass}>Ways to support</h2>
            <div className={compact ? "space-y-1" : "space-y-4"}>
              {SUPPORTER_ITEMS.map((item) => renderCheckItem(item, iconSize))}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Host: one merged box with show details + contact fields */}
          <div
            className={`rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3 ${compact ? "mb-3 p-3" : "mb-5 sm:mb-6 lg:mb-5 p-4 sm:p-5 lg:p-6 sm:space-y-4 lg:space-y-4"}`}
          >
            {!compact && !isPdfMode && (
              <h2 className="font-medium text-xl lg:text-2xl">Host details</h2>
            )}
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                Venue or address
              </label>
              {cityReadOnly ? (
                <div
                  className={`flex items-center justify-between gap-3 ${compact ? "py-1" : "py-1.5 lg:py-2"}`}
                >
                  <span className={compact ? "text-sm" : "text-base sm:text-lg"}>
                    {locationDisplay}
                  </span>
                  <LockSimpleIcon
                    size={compact ? 13 : 15}
                    className="flex-shrink-0 text-neutral-300 dark:text-neutral-600"
                  />
                </div>
              ) : (
                <>
                  <div ref={cityContainerRef} className={hasLocation ? "hidden" : undefined}>
                    {!mapsReady && (
                      <input
                        ref={cityInputRef}
                        type="text"
                        placeholder="Magdalene Carney Institute, West Palm Beach, FL"
                        className={fieldClass}
                        onChange={(e) => {
                          const parts = e.target.value.split(",").map((s) => s.trim());
                          if (parts.length >= 3) {
                            setEventVenue(parts.slice(0, -2).join(", "));
                            setEventCity(parts[parts.length - 2]);
                            setEventRegion(parts[parts.length - 1]);
                          } else if (parts.length === 2) {
                            setEventVenue("");
                            setEventCity(parts[0]);
                            setEventRegion(parts[1]);
                          }
                        }}
                      />
                    )}
                  </div>
                  {hasLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventVenue("");
                        setEventAddress("");
                        setEventCity("");
                        setEventRegion("");
                        setEventCountry("");
                        if (mapsReady) {
                          initAutocomplete();
                          (cityContainerRef.current?.firstElementChild as HTMLElement)?.focus();
                        } else {
                          cityInputRef.current?.focus();
                        }
                      }}
                      className={`${fieldClass} text-left flex items-center justify-between group`}
                    >
                      <span>{locationDisplay}</span>
                      <span className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 text-xs ml-2">
                        change
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div>
              <div className={`grid grid-cols-2 ${compact ? "gap-3" : "gap-3 sm:gap-4"} mb-1.5`}>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider">
                  {eventDates.length > 1 ? "Dates" : "Date"}
                </label>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider">
                  Doors open
                </label>
              </div>
              <div className="space-y-2.5">
                {eventDates.map((d, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`grid grid-cols-2 items-start ${compact ? "gap-3" : "gap-3 sm:gap-4"}`}
                    >
                      <div>
                        {dateReadOnly ? (
                          d && <p className={fieldClass}>{formatLongDate(d)}</p>
                        ) : (
                          <div className="group relative">
                            <p
                              aria-hidden="true"
                              className={`${fieldClass} group-focus-within:border-neutral-900 dark:group-focus-within:border-white ${d ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
                            >
                              {d
                                ? formatLongDate(d)
                                : formatLongDate(new Date().toISOString().slice(0, 10))}
                            </p>
                            <input
                              type="date"
                              value={d}
                              min={new Date().toISOString().slice(0, 10)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val < new Date().toISOString().slice(0, 10)) return;
                                setEventDates((prev) => prev.map((x, j) => (j === i ? val : x)));
                              }}
                              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                              disabled={readOnly}
                              aria-label={`Event date${eventDates.length > 1 ? ` ${i + 1}` : ""}`}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        {isPdfMode ? (
                          <p className={fieldClass}>{eventDoorTimes[i]}</p>
                        ) : (
                          <div
                            className="relative"
                            ref={(el) => {
                              doorTimeRefs.current[i] = el;
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                !readOnly && setDoorTimeOpenIndex((cur) => (cur === i ? null : i))
                              }
                              disabled={readOnly}
                              aria-label={`Doors open${eventDates.length > 1 ? ` ${i + 1}` : ""}`}
                              className={`${fieldClass} text-left ${eventDoorTimes[i] ? "text-neutral-900 dark:text-white" : "text-neutral-400"} ${readOnly ? "opacity-75" : ""}`}
                            >
                              {eventDoorTimes[i] || "7:00PM"}
                            </button>
                            {doorTimeOpenIndex === i && (
                              <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1">
                                {DOOR_TIMES.map((t) => (
                                  <li key={t}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEventDoorTimes((prev) =>
                                          prev.map((x, j) => (j === i ? t : x)),
                                        );
                                        setDoorTimeOpenIndex(null);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${t === eventDoorTimes[i] ? "text-neutral-900 dark:text-white font-medium" : "text-neutral-500 dark:text-neutral-400"}`}
                                    >
                                      {t}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {i > 0 && !readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setEventDates((prev) => prev.filter((_, j) => j !== i));
                          setEventDoorTimes((prev) => prev.filter((_, j) => j !== i));
                          setDoorTimeOpenIndex((cur) => (cur === i ? null : cur));
                        }}
                        aria-label={`Remove ${d ? formatLongDate(d) : "this date"}`}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center h-7 w-7 rounded-full bg-white dark:bg-neutral-950 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 transition-colors"
                      >
                        <XIcon size={13} weight="bold" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && !editMode && !draftId && eventDates.length < 3 && (
                <button
                  type="button"
                  disabled={!eventDates[eventDates.length - 1]?.trim()}
                  onClick={() => {
                    setEventDates((prev) => {
                      const last = prev[prev.length - 1];
                      if (!last) return prev;
                      const [y, m, d] = last.split("-").map(Number);
                      const nextDate = new Date(Date.UTC(y, m - 1, d + 1))
                        .toISOString()
                        .slice(0, 10);
                      return [...prev, nextDate];
                    });
                    setEventDoorTimes((prev) => [...prev, prev[prev.length - 1] || ""]);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-neutral-600 disabled:hover:border-neutral-300 dark:disabled:hover:text-neutral-400 dark:disabled:hover:border-neutral-700"
                >
                  <PlusIcon size={12} weight="bold" aria-hidden="true" />
                  Add another time
                </button>
              )}
            </div>

            {contactFields}
          </div>

          {/* Host: checkboxes */}
          <section>
            <h2 className={headingClass}>Ways to contribute</h2>

            {/* Mobile / tablet: CSS columns */}
            <div
              className={
                compact ? "flex flex-wrap gap-x-6 gap-y-3" : "sm:columns-2 lg:hidden gap-6"
              }
            >
              {SUPPORT_MENU.map((section, idx) => (
                <div
                  key={idx}
                  className={compact ? "min-w-[180px]" : "break-inside-avoid mb-4 sm:mb-5"}
                >
                  {section.category && (
                    <p
                      className={`text-xs text-neutral-400 uppercase tracking-wider ${compact ? "mb-1" : "sm:text-[13px] mb-1.5 sm:mb-2"}`}
                    >
                      {section.category}
                    </p>
                  )}
                  <div className={compact ? "space-y-1" : "space-y-4"}>
                    {section.items.map((item) => renderCheckItem(item, iconSize))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: explicit 2-column grid */}
            {!compact && (
              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12">
                {desktopCols.map((indices, col) => (
                  <div key={col} className="space-y-5">
                    {indices.map((i) => {
                      const section = SUPPORT_MENU[i];
                      if (!section) return null;
                      return (
                        <div key={i}>
                          {section.category && (
                            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                              {section.category}
                            </p>
                          )}
                          <div className="space-y-4">
                            {section.items.map((item) => renderCheckItem(item, 20))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!isPdfMode && !readOnly && (
        <section className={compact ? "mt-3" : "mt-4 sm:mt-5 lg:mt-3"}>
          {wizardMode !== "supporter" && !hasLocation && !editMode && !compact && (
            <p className={`text-xs text-neutral-400 mb-2 ${compact ? "" : "sm:text-sm"}`}>
              Select a venue or address to enable submission.
            </p>
          )}
          {wizardMode === "host" && hasLocation && (
            <p className={`text-xs text-neutral-400 mb-2 ${compact ? "" : "sm:text-sm"}`}>
              Submitting books the date.
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              submitResult?.ok === true ||
              (wizardMode !== "supporter" && !editMode && !compact && !hasLocation) ||
              (wizardMode === "supporter" && !sponsorName.trim())
            }
            className={`w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${compact ? "py-2 text-xs" : "py-3 lg:py-4 text-sm lg:text-base"}`}
          >
            {submitting
              ? "Submitting..."
              : editMode
                ? "Save Changes"
                : `Submit (${checked.size} item${checked.size !== 1 ? "s" : ""} selected)`}
          </button>
          {submitResult && (
            <p
              className={`flex items-center gap-1.5 text-sm mt-2 ${submitResult.ok ? "text-green-600 dark:text-green-500" : "text-red-500 dark:text-red-400"}`}
            >
              {submitResult.ok ? (
                <CheckCircleIcon size={16} weight="fill" />
              ) : (
                <WarningCircleIcon size={16} weight="fill" />
              )}
              {submitResult.msg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
