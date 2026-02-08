"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  CheckSquare,
  Square,
  CheckCircle,
  WarningCircle,
  DownloadSimple,
} from "@phosphor-icons/react";

const VENUE_CHOICES = ["Home", "Community center", "Baha'i center"];

const SUPPORT_MENU: { category: string; items: string[]; exclusive?: string[] }[] = [
  {
    category: "Venue",
    items: [...VENUE_CHOICES, "Seating", "Setup help"],
    exclusive: VENUE_CHOICES,
  },
  {
    category: "Travel",
    items: [
      "Round-trip airfare",
      "Car rental or local rides",
      "Airport pickup and drop-off",
    ],
  },
  {
    category: "Lodging",
    items: ["Host home stay", "Hotel or Airbnb"],
  },
  {
    category: "Promotion",
    items: [
      "Community outreach and invitations",
      "Flyers or digital promotion",
    ],
  },
{
    category: "Financial",
    items: ["Artist honorarium", "Space for merch and donations"],
  },
];

export default function SponsorPage() {
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get("og") === "true";

  const initialItems = searchParams.get("items");
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialItems ? initialItems.split("|") : []),
  );
  const [eventCity, setEventCity] = useState(searchParams.get("city") || "");
  const [eventDate, setEventDate] = useState(searchParams.get("date") || "");
  const [hostName, setHostName] = useState(
    searchParams.get("host") || "",
  );
  const [hostPhone, setHostPhone] = useState(
    searchParams.get("phone") || "",
  );
  const [hostEmail, setHostEmail] = useState(
    searchParams.get("email") || "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

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
        setSubmitResult({
          ok: false,
          msg: data.error || "Something went wrong.",
        });
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
    const url = new URL("/sponsor", window.location.origin);
    if (eventCity.trim()) url.searchParams.set("city", eventCity.trim());
    if (eventDate.trim()) url.searchParams.set("date", eventDate.trim());
    if (hostName.trim()) url.searchParams.set("host", hostName.trim());
    if (hostPhone.trim()) url.searchParams.set("phone", hostPhone.trim());
    if (hostEmail.trim()) url.searchParams.set("email", hostEmail.trim());
    if (checked.size > 0)
      url.searchParams.set("items", Array.from(checked).join("|"));
    window.open(url.toString(), "_blank");
  };

  const fieldClass =
    "w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 pb-1.5 text-base sm:text-lg focus:outline-none focus:border-neutral-900 dark:focus:border-white";


  return (
    <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <div className="max-w-[820px] mx-auto px-5 py-6 sm:px-12 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 sm:gap-6 mb-5 sm:mb-8">
          <div className="w-[80px] h-[80px] sm:w-[112px] sm:h-[112px] rounded-lg overflow-hidden flex-shrink-0 relative">
            <Image
              src="/images/home/bio.jpeg"
              alt="Peyt Spencer"
              fill
              className="object-cover"
              sizes="192px"
              priority
              quality={95}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[40px] font-medium leading-tight tracking-tight">
              Concert Host Application
            </h1>
            <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-2">
              Peyt Spencer / Rapper, Software Engineer at Microsoft
            </p>
          </div>
        </div>

        {/* Event details */}
        <p className="text-xs sm:text-[13px] text-neutral-400 uppercase tracking-wider mb-2">Host</p>
        <div className="mb-5 sm:mb-8 p-4 sm:p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input
                type="text"
                value={eventCity}
                onChange={(e) => setEventCity(e.target.value)}
                placeholder="Seattle, WA"
                autoComplete="address-level2"
                list="cities"
                className={fieldClass}
              />
            </div>
            <div className="relative">
              <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                Date
              </label>
              {isPdfMode ? (
                eventDate && (
                  <p className={fieldClass}>
                    {new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )
              ) : (
                <>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={`${fieldClass} absolute inset-0 top-auto opacity-0 cursor-pointer`}
                  />
                  <p className={`${fieldClass} ${eventDate ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}>
                    {eventDate
                      ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Select date"}
                  </p>
                </>
              )}
            </div>
          </div>
          {(!isPdfMode || hostName || hostPhone || hostEmail) && (
            <>
              <div
                className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3"
                style={isPdfMode ? { gridTemplateColumns: `repeat(${[hostName, hostPhone, hostEmail].filter(Boolean).length}, 1fr)` } : undefined}
              >
                {(!isPdfMode || hostName) && (
                  <div>
                    <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                      Name
                    </label>
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
                    <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                      Phone
                    </label>
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
                    <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
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
            </>
          )}
        </div>

        {/* Support menu */}
        <section>
          <h2 className={`text-xl sm:text-[28px] font-medium mb-1 sm:mb-2 ${isPdfMode ? "mt-4" : ""}`}>What your community will provide</h2>
          {!isPdfMode && (
            <p className="text-sm sm:text-base text-neutral-400 dark:text-neutral-500 mb-3 sm:mb-4">
              Check items, then submit. I will follow up within 48 hours.
            </p>
          )}

          <div className="sm:columns-2 gap-12">
            {SUPPORT_MENU.map((section) => (
              <div key={section.category} className="break-inside-avoid mb-4 sm:mb-5">
                <p className="text-xs sm:text-[13px] text-neutral-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                  {section.category}
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  {section.items.map((item) => {
                      const isChecked = checked.has(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleItem(item)}
                          className="flex items-start gap-2.5 w-full text-left group"
                        >
                          <span className="mt-0.5 flex-shrink-0">
                            {isChecked ? (
                              <CheckSquare
                                size={20}
                                weight="fill"
                                className="text-neutral-900 dark:text-white"
                              />
                            ) : (
                              <Square
                                size={20}
                                className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors"
                              />
                            )}
                          </span>
                          <span
                            className={`text-base sm:text-lg leading-snug ${
                              isChecked
                                ? "text-neutral-900 dark:text-white"
                                : "text-neutral-500 dark:text-neutral-400"
                            }`}
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

        {/* Submission (web only) */}
        {!isPdfMode && (
          <section className="mt-4 sm:mt-8">

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting || submitResult?.ok}
                className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {submitting
                  ? "Submitting..."
                  : `Submit (${checked.size} item${checked.size !== 1 ? "s" : ""} selected)`}
              </button>

              <button
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 px-5 py-3 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-sm font-medium rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              >
                <DownloadSimple size={16} weight="bold" />
                PDF
              </button>
            </div>

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
    </div>
  );
}
