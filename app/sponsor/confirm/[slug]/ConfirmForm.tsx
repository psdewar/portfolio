"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import { isEmailValid } from "../../../lib/email";
import { formatEventDateShort, formatLongDate } from "../../../lib/dates";
import { DOOR_TIMES } from "../../../lib/door-times";
import { useGoogleMaps, createAutocomplete } from "../../../lib/maps";

// "Cafe Zoe, Menlo Park, CA" → parts, when the host typed a location but never
// picked a suggestion. Two- or three-part comma form only.
function parseTypedLocation(raw: string): { venue: string; city: string; region: string } | null {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return { venue: "", city: parts[0], region: parts[1] };
  return {
    venue: parts.slice(0, -2).join(", "),
    city: parts[parts.length - 2],
    region: parts[parts.length - 1],
  };
}

export default function ConfirmForm({
  slug,
  sig,
  host,
  isPrivate = false,
  needsLocation = false,
  date: initialDate,
  doorTime: initialDoorTime,
}: {
  slug: string;
  sig: string;
  host: { name: string; email: string; phone: string };
  isPrivate?: boolean;
  needsLocation?: boolean;
  date: string;
  doorTime: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(host.name);
  const [email, setEmail] = useState(host.email);
  const [phone, setPhone] = useState(host.phone);
  const [date, setDate] = useState(initialDate);
  const [doorTime, setDoorTime] = useState(initialDoorTime);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Re-entry lock: disabled={loading} misses a same-frame double-tap, which would
  // promote the draft twice (two shows, two Eventbrite events). Set synchronously.
  const submitting = useRef(false);

  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("US");
  const locRef = useRef<HTMLDivElement>(null);
  const mapsReady = useGoogleMaps();

  useEffect(() => {
    if (!needsLocation || !mapsReady || !locRef.current) return;
    const cls =
      "w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white pb-1.5 text-base";
    createAutocomplete(
      locRef.current,
      (r) => {
        setVenue(r.venue === r.city ? "" : r.venue);
        setAddress(r.address);
        setCity(r.city);
        setRegion(r.region);
        setCountry(r.country);
      },
      cls,
    );
  }, [needsLocation, mapsReady]);

  const today = new Date().toISOString().slice(0, 10);
  const doorOptions =
    doorTime && !DOOR_TIMES.includes(doorTime) ? [doorTime, ...DOOR_TIMES] : DOOR_TIMES;

  const handleConfirm = async () => {
    if (submitting.current) return;
    if (!name.trim() || !isEmailValid(email)) {
      setError("Add your name and a valid email.");
      return;
    }
    if (!date || !doorTime) {
      setError("Pick a date and door time.");
      return;
    }
    // Location fields only when the draft was created without one. The host may
    // have typed an address without picking a suggestion — parse that as a fallback.
    let loc = { venue, address, city, region, country };
    if (needsLocation && (!city || !region)) {
      const typed = locRef.current?.querySelector("input")?.value ?? "";
      const parsed = parseTypedLocation(typed);
      if (!parsed) {
        setError("Add the venue or address, like 'Cafe Zoe, Menlo Park, CA'.");
        return;
      }
      loc = { venue: parsed.venue, address: typed, city: parsed.city, region: parsed.region, country };
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          sig,
          name,
          email,
          phone,
          date,
          doorTime,
          ...(needsLocation ? loc : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save. Try again in a moment.");
        setLoading(false);
        submitting.current = false;
        return;
      }
      // Promotion mints a new location-derived slug; land on it.
      const finalSlug = (data.slug as string) || slug;
      router.push(isPrivate ? "/rsvp" : `/rsvp?submitted=${finalSlug}`);
    } catch {
      setError("Couldn't save. Try again in a moment.");
      setLoading(false);
      submitting.current = false;
    }
  };

  const fieldClass =
    "w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white pb-1.5 text-base";

  return (
    <div>
      <div className="space-y-4 mb-5">
        {needsLocation && (
          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Venue or address
            </label>
            <div ref={locRef}>
              <input
                type="text"
                placeholder="Cafe Zoe, Menlo Park, CA"
                className={fieldClass}
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <div className="group relative">
              <p
                aria-hidden="true"
                className={`${fieldClass} group-focus-within:border-neutral-900 dark:group-focus-within:border-white ${date ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
              >
                {date ? formatLongDate(date) : "Pick a date"}
              </p>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val < today) return;
                  setDate(val);
                }}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                aria-label="Event date"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
              Doors open
            </label>
            <div className="group relative">
              <p
                aria-hidden="true"
                className={`${fieldClass} flex items-center justify-between gap-2 group-focus-within:border-neutral-900 dark:group-focus-within:border-white ${doorTime ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
              >
                <span>{doorTime || "Pick a time"}</span>
                <CaretDownIcon size={14} className="shrink-0 text-neutral-400" />
              </p>
              <select
                value={doorTime}
                onChange={(e) => setDoorTime(e.target.value)}
                aria-label="Doors open"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
              >
                {doorOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name or organization"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:flex-1 min-w-0">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="abc@email.com"
            className={fieldClass}
          />
        </div>
          <div className="sm:shrink-0 sm:w-[15ch]">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(206) 555-0100"
            className={fieldClass}
          />
        </div>
        </div>
      </div>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg py-3 lg:py-4 text-sm lg:text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading
          ? isPrivate
            ? "Confirming…"
            : "Publishing…"
          : isPrivate
            ? `Confirm ${date ? formatEventDateShort(date) : "the date"}`
            : "Confirm and publish to /rsvp"}
      </button>
      {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
    </div>
  );
}
