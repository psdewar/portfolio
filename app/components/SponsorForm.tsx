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
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
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
  initialName,
  initialPhone,
  initialEmail,
  onSuccess,
}: SponsorFormProps) {
  const router = useRouter();
  const mapsReady = useGoogleMaps();
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const doorTimeRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [doorTimeOpen, setDoorTimeOpen] = useState(false);

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
  const [eventDate, setEventDate] = useState(date || "");
  const [eventDoorTime, setEventDoorTime] = useState(doorTime || "7:00PM");
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
  const dateReadOnly = (compact && !!date) || isPdfMode;
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
    if (!doorTimeOpen) return;
    const handler = (e: MouseEvent) => {
      if (doorTimeRef.current && !doorTimeRef.current.contains(e.target as Node))
        setDoorTimeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [doorTimeOpen]);

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
      if (!showSlug && !editMode && !eventDate) {
        setSubmitResult({ ok: false, msg: "Please select a date." });
        return;
      }
    }

    if (isSupporter && !selectedShowSlug) {
      setSubmitResult({ ok: false, msg: "Please select a show to support." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    const fields: SponsorFields = {
      name: sponsorName.trim(),
      email,
      phone: sponsorPhone.trim(),
      city: isSupporter ? "" : eventCity,
      region: isSupporter ? "" : eventRegion,
      country: isSupporter ? "" : eventCountry,
      venue: isSupporter ? "" : eventVenue || "",
      address: isSupporter ? "" : eventAddress || "",
      date: isSupporter ? "" : eventDate,
      doorTime: isSupporter ? "" : eventDoorTime,
      items: Array.from(checked),
      role: isSupporter ? "supporter" : "host",
    };

    try {
      let finalShowSlug = isSupporter ? selectedShowSlug : showSlug;

      if (!finalShowSlug && !editMode) {
        const showRes = await fetch("/api/shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: eventDate,
            doorTime: eventDoorTime,
            city: eventCity,
            region: eventRegion,
            country: eventCountry,
            venue: eventVenue || null,
            address: eventAddress || null,
            planStatus: "intent",
          }),
        });
        if (!showRes.ok) {
          setSubmitResult({ ok: false, msg: "Failed to book the date. Try again." });
          return;
        }
        const showData = await showRes.json();
        finalShowSlug = showData.slug;
      }

      const sponsorBody: Record<string, unknown> = {
        showSlug: finalShowSlug,
        ...fields,
        role: fields.role,
      };
      if (!isSupporter && eventVenue) sponsorBody.venue = eventVenue;
      if (!isSupporter && eventAddress) sponsorBody.address = eventAddress;
      if (editMode && submittedAt) sponsorBody.submittedAt = submittedAt;

      const res = await fetch("/api/sponsors", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sponsorBody),
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
      setSubmitResult({ ok: false, msg: "Failed to submit. Try again." });
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
            placeholder="Jane Doe or Local Assembly"
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
            <h2 className={headingClass}>How your community will support this upcoming concert</h2>
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
                        placeholder="Search by venue name or street address"
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

            <div className={`grid grid-cols-2 ${compact ? "gap-3" : "gap-3 sm:gap-4"}`}>
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                {dateReadOnly ? (
                  eventDate && <p className={fieldClass}>{formatLongDate(eventDate)}</p>
                ) : (
                  <div className="relative">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      disabled={readOnly}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => dateInputRef.current?.showPicker?.()}
                      disabled={readOnly}
                      className={`${fieldClass} text-left w-full ${eventDate ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
                    >
                      {eventDate ? formatLongDate(eventDate) : "Select date"}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                  Door Time
                </label>
                {isPdfMode ? (
                  <p className={fieldClass}>{eventDoorTime}</p>
                ) : (
                  <div className="relative" ref={doorTimeRef}>
                    <button
                      type="button"
                      onClick={() => !readOnly && setDoorTimeOpen((o) => !o)}
                      disabled={readOnly}
                      className={`${fieldClass} text-left ${eventDoorTime ? "text-neutral-900 dark:text-white" : "text-neutral-400"} ${readOnly ? "opacity-75" : ""}`}
                    >
                      {eventDoorTime || "Select time"}
                    </button>
                    {doorTimeOpen && (
                      <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1">
                        {DOOR_TIMES.map((t) => (
                          <li key={t}>
                            <button
                              type="button"
                              onClick={() => {
                                setEventDoorTime(t);
                                setDoorTimeOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${t === eventDoorTime ? "text-neutral-900 dark:text-white font-medium" : "text-neutral-500 dark:text-neutral-400"}`}
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

            {contactFields}
          </div>

          {/* Host: checkboxes */}
          <section>
            <h2 className={headingClass}>
              How your community will
              {wizardMode === "host" ? " contribute" : " support this upcoming concert"}
            </h2>

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
              Select a city above to enable submission.
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
