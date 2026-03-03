"use client";

import { useState, useEffect, useRef } from "react";
import { CheckSquare, Square, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { SUPPORT_MENU } from "../lib/sponsor";
import { useGoogleMaps, createAutocomplete } from "../lib/maps";

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
  date: string;
  doorTime: string;
  items: string[];
}

interface SponsorFormProps {
  showSlug?: string;
  venue?: string;
  city?: string;
  region?: string;
  country?: string;
  date?: string;
  doorTime?: string;
  compact?: boolean;
  isPdfMode?: boolean;
  editMode?: boolean;
  initialItems?: string[];
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  onSuccess?: (data: SponsorFields) => void;
}

export default function SponsorForm({
  showSlug,
  venue,
  city,
  region,
  country,
  date,
  doorTime,
  compact,
  isPdfMode,
  editMode,
  initialItems,
  initialName,
  initialPhone,
  initialEmail,
  onSuccess,
}: SponsorFormProps) {
  const mapsReady = useGoogleMaps();
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const doorTimeRef = useRef<HTMLDivElement>(null);
  const [doorTimeOpen, setDoorTimeOpen] = useState(false);

  const [checked, setChecked] = useState<Set<string>>(new Set(initialItems || []));
  const [eventVenue, setEventVenue] = useState("");
  const [eventAddress, setEventAddress] = useState("");
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

  const cityReadOnly = (compact && !!city) || isPdfMode;
  const dateReadOnly = (compact && !!date) || isPdfMode;
  const hasLocation = !!(eventCity && eventRegion);

  useEffect(() => {
    if (!mapsReady || cityReadOnly || !cityContainerRef.current) return;
    createAutocomplete(cityContainerRef.current, (result) => {
      setEventVenue(result.venue);
      setEventAddress(result.address);
      setEventCity(result.city);
      setEventRegion(result.region);
      setEventCountry(result.country);
    });
  }, [mapsReady, cityReadOnly]);

  useEffect(() => {
    if (!doorTimeOpen) return;
    const handler = (e: MouseEvent) => {
      if (doorTimeRef.current && !doorTimeRef.current.contains(e.target as Node))
        setDoorTimeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [doorTimeOpen]);

  const formatDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const toggleItem = (item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        const section = SUPPORT_MENU.find((s) => s.exclusive?.includes(item));
        if (section?.exclusive) section.exclusive.forEach((i) => next.delete(i));
        next.add(item);
      }
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
    if (!eventCity || !eventRegion) {
      setSubmitResult({ ok: false, msg: "Please select a city." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    const fields: SponsorFields = {
      name: sponsorName.trim(),
      email,
      phone: sponsorPhone.trim(),
      city: eventCity,
      region: eventRegion,
      country: eventCountry,
      date: eventDate,
      doorTime: eventDoorTime,
      items: Array.from(checked),
    };

    try {
      const res = await fetch("/api/sponsors", {
        method: editMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showSlug,
          ...fields,
          ...(eventVenue && { venue: eventVenue }),
          ...(eventAddress && { address: eventAddress }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitResult({ ok: false, msg: data.error || "Something went wrong." });
        return;
      }

      setSubmitResult({
        ok: true,
        msg: editMode ? "Updated." : "Submitted. You will hear from me.",
      });
      onSuccess?.(fields);
    } catch {
      setSubmitResult({ ok: false, msg: "Failed to submit. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = `w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white ${compact ? "pb-1 text-sm" : "pb-1.5 text-base sm:text-lg"}`;
  const iconSize = compact ? 16 : 20;
  const cityDisplay = eventCity && eventRegion ? `${eventCity}, ${eventRegion}` : eventCity;
  const locationDisplay = venue ? `${venue}, ${cityDisplay || city}` : cityDisplay || city;

  return (
    <div>
      <div
        className={`rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3 ${compact ? "mb-3 p-3" : "mb-5 sm:mb-8 p-4 sm:p-5 sm:space-y-4"}`}
      >
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
            Location
          </label>
          {cityReadOnly ? (
            <p className={fieldClass}>{locationDisplay}</p>
          ) : (
            <div ref={cityContainerRef} />
          )}
        </div>

        <div className={`grid grid-cols-2 ${compact ? "gap-3" : "gap-3 sm:gap-4"}`}>
          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Date
            </label>
            {dateReadOnly ? (
              eventDate && <p className={fieldClass}>{formatDate(eventDate)}</p>
            ) : (
              <div className="relative">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={`${fieldClass} absolute inset-0 top-auto opacity-0 cursor-pointer`}
                />
                <p
                  className={`${fieldClass} ${eventDate ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
                >
                  {eventDate ? formatDate(eventDate) : "Select date"}
                </p>
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
                  onClick={() => setDoorTimeOpen((o) => !o)}
                  className={`${fieldClass} text-left ${eventDoorTime ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
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

        {(!isPdfMode || sponsorName || sponsorPhone || sponsorEmail) && (
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
                  Sponsor Name
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Jane Doe or Local Assembly"
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
                  className={fieldClass}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <section>
        <h2
          className={`font-medium mb-1 ${compact ? "text-lg" : "text-xl sm:text-[28px] sm:mb-2"} ${isPdfMode ? "mt-4" : ""}`}
        >
          What your community will provide
        </h2>
        {!isPdfMode && (
          <p
            className={`text-neutral-400 dark:text-neutral-500 mb-3 ${compact ? "text-xs" : "text-sm sm:text-base sm:mb-4"}`}
          >
            Check items, then submit. I will follow up within 48 hours.
          </p>
        )}

        <div className={compact ? "flex flex-wrap gap-x-6 gap-y-3" : "sm:columns-2 gap-12"}>
          {SUPPORT_MENU.map((section) => (
            <div
              key={section.category}
              className={compact ? "min-w-[180px]" : "break-inside-avoid mb-4 sm:mb-5"}
            >
              <p
                className={`text-xs text-neutral-400 uppercase tracking-wider ${compact ? "mb-1" : "sm:text-[13px] mb-1.5 sm:mb-2"}`}
              >
                {section.category}
              </p>
              <div className={compact ? "space-y-1" : "space-y-1.5 sm:space-y-2"}>
                {section.items.map((item) => {
                  const isChecked = checked.has(item);
                  const Icon = isChecked ? CheckSquare : Square;
                  return (
                    <button
                      key={item}
                      onClick={() => toggleItem(item)}
                      className="flex items-start gap-2 w-full text-left group"
                    >
                      <Icon
                        size={iconSize}
                        weight={isChecked ? "fill" : "regular"}
                        className={`mt-0.5 flex-shrink-0 ${isChecked ? "text-neutral-900 dark:text-white" : "text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors"}`}
                      />
                      <span
                        className={`leading-snug ${compact ? "text-sm" : "text-base sm:text-lg"} ${isChecked ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}
                      >
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {!isPdfMode && (
        <section className={compact ? "mt-3" : "mt-4 sm:mt-8"}>
          {!hasLocation && (
            <p className={`text-xs text-neutral-400 mb-2 ${compact ? "" : "sm:text-sm"}`}>
              Select a city above to enable submission.
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || submitResult?.ok || !hasLocation}
            className={`w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${compact ? "py-2 text-xs" : "py-3 text-sm"}`}
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
                <CheckCircle size={16} weight="fill" />
              ) : (
                <WarningCircle size={16} weight="fill" />
              )}
              {submitResult.msg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
