"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsersIcon, MinusIcon, PlusIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import ContactFields from "../../components/ContactFields";
import Poster from "../../components/Poster";
import { formatEventDateShort } from "../../lib/dates";
import { calculateStripeFee } from "../../api/shared/products";

interface RSVPFormProps {
  eventId: string;
  date: string;
  city: string;
  region: string;
  doorTime?: string | null;
  doorLabel?: string | null;
  venue?: string | null;
  venueLabel?: string | null;
  address?: string | null;
  onBack?: () => void;
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
}

export default function RSVPForm({
  eventId,
  date,
  city,
  region,
  doorTime,
  doorLabel,
  venue,
  venueLabel,
  address,
  onBack,
}: RSVPFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    guests: 1,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(
    searchParams.get("test") === "success" || !!searchParams.get("session_id"),
  );
  const [supportCents, setSupportCents] = useState(2000);
  const totalWithFeesCents = supportCents > 0 ? calculateStripeFee(supportCents) : 0;
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (searchParams.get("session_id")) {
      sessionStorage.setItem("stayConnectedCompleted", "true");
    }
  }, [searchParams]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (isDesktop) {
      emailInputRef.current?.focus();
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          guests: formData.guests,
          eventId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ email: data.error || "Something went wrong" });
        return;
      }

      sessionStorage.setItem("stayConnectedCompleted", "true");

      if (supportCents > 0) {
        const checkoutRes = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: "support-next-concert",
            amount: totalWithFeesCents,
            customerEmail: formData.email,
            successPath: `/rsvp/${eventId}`,
            cancelPath: `/rsvp/${eventId}`,
            metadata: { eventId, name: formData.name },
          }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutRes.ok && checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
        setErrors({ email: checkoutData.error || "Couldn't start checkout — try again." });
        return;
      }

      setSubmitted(true);
    } catch {
      setErrors({ email: "Failed to submit. Please try again." });
    } finally {
      setIsLoading(false);
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
  const navLabel = venueLabel || venue || address || null;
  const doorDisplayLabel = doorLabel || (doorTime ? `Doors open at ${doorTime}` : null);
  const poster = (
    <Poster
      date={date}
      city={city}
      region={region}
      doorTime={doorTime ?? undefined}
      doorLabel={doorLabel}
      venue={venue}
      venueLabel={venueLabel}
      address={address}
      tags="Free admission"
    />
  );

  const backButton = onBack && (
    <button
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 -mt-6 pt-6 pb-6 -ml-3 pl-3 pr-4 text-xs uppercase tracking-wider"
      style={{ fontFamily: '"Space Mono", monospace' }}
    >
      <ArrowLeftIcon size={20} weight="bold" style={{ color: "#d4a553" }} />
      All shows
    </button>
  );

  function submitLabel(): string {
    if (isLoading) return supportCents > 0 ? "Redirecting..." : "Reserving...";
    return "I'll Be There";
  }

  const adjustSupport = (deltaCents: number) => setSupportCents((c) => Math.max(0, c + deltaCents));

  const supportSection = (
    <>
      <div>
        <label className="block text-neutral-600 dark:text-neutral-300 text-sm lg:text-lg mb-2">
          Support the next tour stop
        </label>
        <div className="flex items-stretch h-14 lg:h-[4.5rem]">
          <button
            type="button"
            {...repeatProps(() => adjustSupport(-500))}
            disabled={supportCents <= 0}
            className="flex-[2] rounded-l-lg lg:rounded-l-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors select-none"
            aria-label="Decrease support by $5"
          >
            <MinusIcon className="w-5 h-5 lg:w-6 lg:h-6" weight="bold" />
          </button>
          <div className="flex-[4] flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 border-y-2 border-neutral-200 dark:border-neutral-700">
            <span className="font-bebas text-2xl lg:text-4xl text-neutral-900 dark:text-white tabular-nums">
              {formatCents(supportCents)}
            </span>
          </div>
          <button
            type="button"
            {...repeatProps(() => adjustSupport(500))}
            className="flex-[2] rounded-r-lg lg:rounded-r-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors select-none"
            aria-label="Increase support by $5"
          >
            <PlusIcon className="w-5 h-5 lg:w-6 lg:h-6" weight="bold" />
          </button>
        </div>
        <p
          className="mt-1.5 text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 tabular-nums"
          style={{ fontFamily: '"Space Mono", monospace' }}
        >
          {supportCents > 0 ? `${formatCents(totalWithFeesCents)} total with fees` : "no charges"}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs lg:text-sm uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none">
        <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        <span style={{ fontFamily: '"Space Mono", monospace' }}>or</span>
        <span className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <label className="flex items-center gap-2 w-full px-3 py-3 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors text-sm lg:text-lg text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={supportCents === 0}
          onChange={(e) => setSupportCents(e.target.checked ? 0 : 2000)}
          className="w-4 h-4 lg:w-5 lg:h-5 rounded accent-[#d4a553]"
        />
        <span>RSVP for free</span>
      </label>
    </>
  );

  const rsvpLink = `peytspencer.com/rsvp/${eventId}`;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const copyRsvpLink = () =>
    navigator.clipboard.writeText(rsvpLink).then(() => {
      setLinkCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
    });

  const successContent = (size: "sm" | "lg") => (
    <div className={size === "lg" ? "space-y-8" : "space-y-6"}>
      <div>
        <h2
          className={`font-extrabold uppercase leading-none ${size === "lg" ? "text-4xl" : "text-2xl"} text-neutral-900 dark:text-white`}
          style={{ fontFamily: '"Parkinsans", sans-serif' }}
        >
          YOU'RE LOCKED IN
        </h2>
        <p
          className={`text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ${size === "lg" ? "text-sm mt-3" : "text-xs mt-2"}`}
          style={{ fontFamily: '"Space Mono", monospace' }}
        >
          I sent my 2025 Singles & 16s Pack to your inbox as a thank you.
        </p>
      </div>
      <button
        onClick={copyRsvpLink}
        className={`flex items-center justify-between w-full ${size === "lg" ? "px-6 py-5" : "px-5 py-4"} rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-[#d4a553] dark:hover:border-[#e0b860] transition-colors`}
      >
        <span
          className={`${size === "lg" ? "text-lg" : "text-base"} font-medium text-neutral-900 dark:text-white`}
        >
          Share this RSVP with a friend
        </span>
        <span className="text-sm font-medium" style={{ color: "#d4a553" }}>
          {linkCopied ? "Copied" : "Copy link"}
        </span>
      </button>
    </div>
  );

  return (
    <div className="fixed left-0 right-0 top-14 bottom-0 bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-full overflow-y-auto touch-pan-y">
        <div className="px-[6%] py-8">
          {backButton}

          {submitted ? (
            successContent("sm")
          ) : (
            <>
              <div className="mb-6">
                <h1
                  className="mb-2 font-extrabold uppercase leading-none"
                  style={{ fontFamily: '"Parkinsans", sans-serif' }}
                >
                  <span
                    className="block text-base md:text-lg font-semibold tracking-widest"
                    style={{ color: "#d4a553" }}
                  >
                    See you in
                  </span>
                  <span
                    className="block text-4xl text-neutral-900 dark:text-white"
                    style={{ animation: "rsvp-rise 0.6s cubic-bezier(0.32, 0.72, 0, 1) both" }}
                  >
                    {city}
                  </span>
                </h1>
                <p
                  className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm uppercase tracking-wider"
                  style={{ fontFamily: '"Space Mono", monospace' }}
                >
                  {dateLabel}
                  {navLabel ? ` · ${navLabel}` : ""}
                  {doorDisplayLabel ? ` · ${doorDisplayLabel}` : ""}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <ContactFields
                  ref={emailInputRef}
                  email={formData.email}
                  name={formData.name}
                  phone={formData.phone}
                  onEmailChange={(v) => updateField("email", v)}
                  onNameChange={(v) => updateField("name", v)}
                  onPhoneChange={(v) => updateField("phone", v)}
                  errors={errors}
                  variant="gold"
                />

                <div>
                  <label className="block text-neutral-600 dark:text-neutral-300 text-sm mb-2">
                    How many people?
                  </label>
                  <div className="flex items-stretch h-14">
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(-1))}
                      disabled={formData.guests <= 1}
                      className="flex-[2] rounded-l-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <MinusIcon className="w-5 h-5" weight="bold" />
                    </button>
                    <div className="flex-[4] flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 border-y-2 border-neutral-200 dark:border-neutral-700">
                      <UsersIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                      <span className="font-bebas text-2xl text-neutral-900 dark:text-white tabular-nums">
                        {formData.guests}
                      </span>
                    </div>
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(1))}
                      disabled={formData.guests >= 10}
                      className="flex-[2] rounded-r-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <PlusIcon className="w-5 h-5" weight="bold" />
                    </button>
                  </div>
                </div>

                {supportSection}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 font-medium text-lg rounded-lg tabular-nums border-2 border-neutral-900 shadow-[4px_4px_0_#0a0a0a] dark:shadow-[4px_4px_0_#0a0a0a] transition-[transform,box-shadow] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] dark:hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#0a0a0a] dark:disabled:hover:shadow-[4px_4px_0_#0a0a0a]"
                  style={{ background: "#0a0a0a", color: "#d4a553" }}
                >
                  {submitLabel()}
                </button>
              </form>
            </>
          )}
        </div>
        <div className="flex-shrink-0 touch-pan-y">{poster}</div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex absolute inset-0 right-4 gap-8">
        <div className="h-full flex-shrink-0">{poster}</div>
        <div className="flex-1 min-w-0 flex flex-col px-4 py-8 overflow-y-auto @container">
          {backButton}

          {submitted ? (
            successContent("lg")
          ) : (
            <>
              <div className="mb-6">
                <h1
                  className="mb-2 font-extrabold uppercase leading-none"
                  style={{ fontFamily: '"Parkinsans", sans-serif' }}
                >
                  <span
                    className="block text-xl font-semibold tracking-widest"
                    style={{ color: "#d4a553" }}
                  >
                    See you in
                  </span>
                  <span
                    className="block text-6xl text-neutral-900 dark:text-white"
                    style={{ animation: "rsvp-rise 0.6s cubic-bezier(0.32, 0.72, 0, 1) both" }}
                  >
                    {city}
                  </span>
                </h1>
                <p
                  className="text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-wider"
                  style={{ fontFamily: '"Space Mono", monospace' }}
                >
                  {dateLabel}
                  {navLabel ? ` · ${navLabel}` : ""}
                  {doorDisplayLabel ? ` · ${doorDisplayLabel}` : ""}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <ContactFields
                  ref={emailInputRef}
                  email={formData.email}
                  name={formData.name}
                  phone={formData.phone}
                  onEmailChange={(v) => updateField("email", v)}
                  onNameChange={(v) => updateField("name", v)}
                  onPhoneChange={(v) => updateField("phone", v)}
                  errors={errors}
                  variant="gold"
                />

                <div>
                  <label className="block text-neutral-600 dark:text-neutral-300 text-lg mb-2">
                    How many people?
                  </label>
                  <div className="flex items-stretch h-[4.5rem]">
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(-1))}
                      disabled={formData.guests <= 1}
                      className="flex-[2] rounded-l-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <MinusIcon className="w-6 h-6" weight="bold" />
                    </button>
                    <div className="flex-[4] flex items-center justify-center gap-3 bg-neutral-100 dark:bg-neutral-800 border-y-2 border-neutral-200 dark:border-neutral-700">
                      <UsersIcon className="w-7 h-7 text-neutral-500 dark:text-neutral-400" />
                      <span className="font-bebas text-4xl text-neutral-900 dark:text-white tabular-nums">
                        {formData.guests}
                      </span>
                    </div>
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(1))}
                      disabled={formData.guests >= 10}
                      className="flex-[2] rounded-r-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-500 disabled:text-neutral-300 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <PlusIcon className="w-6 h-6" weight="bold" />
                    </button>
                  </div>
                </div>

                {supportSection}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[4.5rem] font-medium text-2xl rounded-xl tabular-nums border-2 border-neutral-900 shadow-[6px_6px_0_#0a0a0a] dark:shadow-[6px_6px_0_#0a0a0a] transition-[transform,box-shadow] duration-100 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_#0a0a0a] dark:hover:shadow-[3px_3px_0_#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[6px_6px_0_#0a0a0a] dark:disabled:hover:shadow-[6px_6px_0_#0a0a0a]"
                  style={{ background: "#0a0a0a", color: "#d4a553" }}
                >
                  {submitLabel()}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
