"use client";

import { useState } from "react";
import {
  CheckSquare,
  Square,
  CheckCircle,
  WarningCircle,
  DownloadSimple,
} from "@phosphor-icons/react";
import { SUPPORT_MENU } from "../lib/sponsor";

interface SponsorFormProps {
  city?: string;
  date?: string;
  compact?: boolean;
  isPdfMode?: boolean;
  initialItems?: string[];
  initialHost?: string;
  initialPhone?: string;
  initialEmail?: string;
}

export default function SponsorForm({
  city,
  date,
  compact,
  isPdfMode,
  initialItems,
  initialHost,
  initialPhone,
  initialEmail,
}: SponsorFormProps) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialItems || []),
  );
  const [eventCity, setEventCity] = useState(city || "");
  const [eventDate, setEventDate] = useState(date || "");
  const [hostName, setHostName] = useState(initialHost || "");
  const [hostPhone, setHostPhone] = useState(initialPhone || "");
  const [hostEmail, setHostEmail] = useState(initialEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const cityReadOnly = (compact && !!city) || isPdfMode;
  const dateReadOnly = (compact && !!date) || isPdfMode;

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
        if (section?.exclusive) {
          section.exclusive.forEach((i) => next.delete(i));
        }
        next.add(item);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const email = hostEmail.trim();
    if (!email || !email.includes("@")) {
      setSubmitResult({ ok: false, msg: "Please enter a valid email." });
      return;
    }
    if (checked.size === 0) {
      setSubmitResult({ ok: false, msg: "Please check at least one item." });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/sponsor-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hostName.trim(),
          email: hostEmail.trim(),
          city: eventCity.trim() || "Not specified",
          items: Array.from(checked),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitResult({ ok: false, msg: data.error || "Something went wrong." });
        return;
      }

      setSubmitResult({ ok: true, msg: "Submitted. You will hear from me." });
    } catch {
      setSubmitResult({ ok: false, msg: "Failed to submit. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    const url = new URL("/api/sponsor-pdf", window.location.origin);
    if (eventCity.trim()) url.searchParams.set("city", eventCity.trim());
    if (eventDate.trim()) url.searchParams.set("date", eventDate.trim());
    if (hostName.trim()) url.searchParams.set("host", hostName.trim());
    if (hostPhone.trim()) url.searchParams.set("phone", hostPhone.trim());
    if (hostEmail.trim()) url.searchParams.set("email", hostEmail.trim());
    if (checked.size > 0)
      url.searchParams.set("items", Array.from(checked).join("|"));
    window.open(url.toString(), "_blank");
  };

  const fieldClass = `w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white ${compact ? "pb-1 text-sm" : "pb-1.5 text-base sm:text-lg"}`;
  const iconSize = compact ? 16 : 20;

  return (
    <div>
      <p className={`text-xs ${compact ? "" : "sm:text-[13px]"} text-neutral-400 uppercase tracking-wider mb-2`}>Host</p>
      <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3 ${compact ? "mb-3 p-3" : "mb-5 sm:mb-8 p-4 sm:p-5 sm:space-y-4"}`}>
        <div className={`grid grid-cols-2 ${compact ? "gap-3" : "gap-3 sm:gap-4"}`}>
          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">City</label>
            {cityReadOnly ? (
              <p className={fieldClass}>{eventCity}</p>
            ) : (
              <input
                type="text"
                value={eventCity}
                onChange={(e) => setEventCity(e.target.value)}
                placeholder="Seattle, WA"
                autoComplete="address-level2"
                className={fieldClass}
              />
            )}
          </div>
          <div className="relative">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Date</label>
            {dateReadOnly ? (
              eventDate && <p className={fieldClass}>{formatDate(eventDate)}</p>
            ) : (
              <>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={`${fieldClass} absolute inset-0 top-auto opacity-0 cursor-pointer`}
                />
                <p className={`${fieldClass} ${eventDate ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>
                  {eventDate ? formatDate(eventDate) : "Select date"}
                </p>
              </>
            )}
          </div>
        </div>
        {(!isPdfMode || hostName || hostPhone || hostEmail) && (
          <div
            className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3 sm:gap-4"}`}
            style={isPdfMode ? { gridTemplateColumns: `repeat(${[hostName, hostPhone, hostEmail].filter(Boolean).length}, 1fr)` } : undefined}
          >
            {(!isPdfMode || hostName) && (
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Jane Doe"
                  className={fieldClass}
                />
              </div>
            )}
            {(!isPdfMode || hostPhone) && (
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="text"
                  value={hostPhone}
                  onChange={(e) => setHostPhone(e.target.value)}
                  placeholder="(206) 555-0100"
                  className={fieldClass}
                />
              </div>
            )}
            {(!isPdfMode || hostEmail) && (
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  placeholder="jane@email.com"
                  className={fieldClass}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Support menu */}
      <section>
        <h2 className={`font-medium mb-1 ${compact ? "text-lg" : "text-xl sm:text-[28px] sm:mb-2"} ${isPdfMode ? "mt-4" : ""}`}>
          What your community will provide
        </h2>
        {!isPdfMode && (
          <p className={`text-neutral-400 dark:text-neutral-500 mb-3 ${compact ? "text-xs" : "text-sm sm:text-base sm:mb-4"}`}>
            Check items, then submit. I will follow up within 48 hours.
          </p>
        )}

        <div className={compact ? "flex flex-wrap gap-x-6 gap-y-3" : "sm:columns-2 gap-12"}>
          {SUPPORT_MENU.map((section) => (
            <div key={section.category} className={compact ? "min-w-[180px]" : "break-inside-avoid mb-4 sm:mb-5"}>
              <p className={`text-xs text-neutral-400 uppercase tracking-wider ${compact ? "mb-1" : "sm:text-[13px] mb-1.5 sm:mb-2"}`}>
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
                      <span className={`leading-snug ${compact ? "text-sm" : "text-base sm:text-lg"} ${isChecked ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
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

      {/* Actions */}
      {!isPdfMode && (
        <section className={compact ? "mt-3" : "mt-4 sm:mt-8"}>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || submitResult?.ok}
              className={`flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity ${compact ? "py-2 text-xs" : "py-3 text-sm"}`}
            >
              {submitting ? "Submitting..." : `Submit (${checked.size} item${checked.size !== 1 ? "s" : ""} selected)`}
            </button>
            <button
              onClick={handleDownloadPdf}
              className={`flex items-center justify-center gap-2 px-5 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors ${compact ? "py-2 text-xs" : "py-3 text-sm"}`}
            >
              <DownloadSimple size={iconSize - 2} weight="bold" />
              PDF
            </button>
          </div>
          {submitResult && (
            <p className={`flex items-center gap-1.5 text-sm mt-2 ${submitResult.ok ? "text-green-600 dark:text-green-500" : "text-red-500 dark:text-red-400"}`}>
              {submitResult.ok ? <CheckCircle size={16} weight="fill" /> : <WarningCircle size={16} weight="fill" />}
              {submitResult.msg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
