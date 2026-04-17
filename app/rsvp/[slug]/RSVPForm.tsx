"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsersIcon, MinusIcon, PlusIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import ContactFields from "../../components/ContactFields";
import Poster from "../../components/Poster";
import { formatEventDateShort } from "../../lib/dates";

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
  const [submitted, setSubmitted] = useState(searchParams.get("test") === "success");

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (searchParams.get("session_id")) {
      router.replace("/support");
    } else if (searchParams.get("rsvp_success") === "true") {
      router.replace("/support");
    }
  }, [searchParams, router]);

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
    if (isLoading) return "Reserving...";
    return "I'll Be There";
  }

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
        className={`flex items-center justify-between w-full ${size === "lg" ? "px-6 py-5" : "px-5 py-4"} rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-[#d4a553] dark:hover:border-[#e8c474] transition-colors`}
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
      <div className="lg:hidden flex flex-col h-full overflow-y-auto">
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
                  <span className="block text-base md:text-lg text-neutral-400 dark:text-neutral-500 font-semibold tracking-widest">
                    See you in
                  </span>
                  <span className="block text-4xl text-neutral-900 dark:text-white">{city}</span>
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
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(-1))}
                      disabled={formData.guests <= 1}
                      className="w-12 h-12 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <MinusIcon className="w-5 h-5" weight="bold" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                      <UsersIcon className="w-5 h-5 text-[#d4a553]" />
                      <span className="font-bebas text-2xl text-neutral-900 dark:text-white tabular-nums">
                        {formData.guests}
                      </span>
                    </div>
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(1))}
                      disabled={formData.guests >= 10}
                      className="w-12 h-12 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors select-none"
                    >
                      <PlusIcon className="w-5 h-5" weight="bold" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 text-[#0a0a0a] font-medium text-lg rounded-lg tabular-nums transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(to right, #d4a553, #e8c474)" }}
                >
                  {submitLabel()}
                </button>
              </form>

              <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-4">
                You'll receive a confirmation email.
              </p>
            </>
          )}
        </div>
        <div className="flex-shrink-0">{poster}</div>
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
                  <span className="block text-xl text-neutral-400 dark:text-neutral-500 font-semibold tracking-widest">
                    See you in
                  </span>
                  <span className="block text-6xl text-neutral-900 dark:text-white">{city}</span>
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
                      className="w-[4.5rem] rounded-l-xl border-2 border-r-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 select-none"
                    >
                      <MinusIcon className="w-6 h-6" weight="bold" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-3 bg-neutral-100 dark:bg-neutral-800 border-y-2 border-neutral-200 dark:border-neutral-700">
                      <UsersIcon className="w-7 h-7 text-[#d4a553]" />
                      <span className="font-bebas text-4xl text-neutral-900 dark:text-white tabular-nums">
                        {formData.guests}
                      </span>
                    </div>
                    <button
                      type="button"
                      {...repeatProps(() => adjustGuests(1))}
                      disabled={formData.guests >= 10}
                      className="w-[4.5rem] rounded-r-xl border-2 border-l-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 select-none"
                    >
                      <PlusIcon className="w-6 h-6" weight="bold" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[4.5rem] text-[#0a0a0a] font-medium text-2xl rounded-xl tabular-nums transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: "linear-gradient(to right, #d4a553, #e8c474)" }}
                >
                  {submitLabel()}
                </button>

                <p className="text-neutral-500 dark:text-neutral-400 text-base">
                  You'll receive a confirmation email.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
