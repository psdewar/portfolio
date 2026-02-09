"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsersIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { calculateStripeFee } from "../../api/shared/products";
import ContactFields from "../../components/ContactFields";
import Poster from "../../components/Poster";

interface RSVPFormProps {
  eventId: string;
  date: string;
  city: string;
  region: string;
  doorTime: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  guests: number;
  addMusic: boolean;
  musicAmount: number;
}

interface FormErrors {
  name?: string;
  email?: string;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function RSVPForm({ eventId, date, city, region, doorTime }: RSVPFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    guests: 1,
    addMusic: false,
    musicAmount: 1000,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("session_id")) {
      router.replace("/listen?success=rsvp_music");
    } else if (searchParams.get("rsvp_success") === "true") {
      router.replace("/listen?success=rsvp");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (isDesktop) {
      emailInputRef.current?.focus();
    }
  }, []);

  const musicTotalCents = calculateStripeFee(formData.musicAmount);

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

      if (formData.addMusic) {
        const checkoutRes = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: "singles-16s-pack-2025",
            amount: musicTotalCents,
            customerEmail: formData.email.trim(),
            successPath: "/listen?success=rsvp_music",
            cancelPath: "/listen?success=rsvp",
          }),
        });

        if (!checkoutRes.ok) {
          router.push("/listen?success=rsvp");
          return;
        }

        const { url } = await checkoutRes.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }

      router.push("/listen?success=rsvp");
    } catch {
      setErrors({ email: "Failed to submit. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const adjustGuests = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      guests: Math.max(1, Math.min(10, prev.guests + delta)),
    }));
  };

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

  const dateLabel = `${formatShortDate(date)}th`;
  const doorLabel = `Doors at ${doorTime}`;

  return (
    <div className="fixed left-0 right-0 top-14 bottom-0 bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Mobile layout */}
      <div className="md:hidden flex flex-col h-full overflow-y-auto">
        <div className="px-[6%] py-8">
          <div className="mb-6">
            <h1
              className="text-4xl md:text-6xl text-neutral-900 dark:text-white mb-2 font-extrabold uppercase"
              style={{ fontFamily: '"Parkinsans", sans-serif' }}
            >
              RSVP
            </h1>
            <p
              className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm uppercase tracking-wider"
              style={{ fontFamily: '"Space Mono", monospace' }}
            >
              {dateLabel} · {doorLabel}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <ContactFields
              ref={emailInputRef}
              email={formData.email}
              name={formData.name}
              phone={formData.phone}
              onEmailChange={(v) => setFormData((prev) => ({ ...prev, email: v }))}
              onNameChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
              onPhoneChange={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
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

            {/* Music purchase option */}
            <div className="border-2 border-neutral-200 dark:border-neutral-700 rounded-lg">
              <label className="flex items-center gap-3 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.addMusic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addMusic: e.target.checked }))}
                  className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-[#d4a553] focus:ring-[#d4a553] accent-[#d4a553] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    Download Singles & 16s from 2025
                  </span>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                    ~10 min of music + lyricbook, $10 minimum
                  </p>
                </div>
              </label>
            </div>

            {formData.addMusic && (
              <div className="space-y-2">
                <label className="block text-neutral-600 dark:text-neutral-300 text-sm">
                  Your price
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    {...repeatProps(() =>
                      setFormData((prev) => ({
                        ...prev,
                        musicAmount: Math.max(1000, prev.musicAmount - 500),
                      })),
                    )}
                    disabled={formData.musicAmount <= 1000}
                    className="w-12 h-12 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    <MinusIcon className="w-5 h-5" weight="bold" />
                  </button>
                  <div className="flex-1 flex items-center justify-center py-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <span className="font-bebas text-3xl text-neutral-900 dark:text-white tabular-nums">
                      ${formData.musicAmount / 100}
                    </span>
                  </div>
                  <button
                    type="button"
                    {...repeatProps(() =>
                      setFormData((prev) => ({
                        ...prev,
                        musicAmount: prev.musicAmount + 500,
                      })),
                    )}
                    className="w-12 h-12 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] transition-colors select-none"
                  >
                    <PlusIcon className="w-5 h-5" weight="bold" />
                  </button>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs text-right tabular-nums">
                  + ${(musicTotalCents / 100).toFixed(2)} processing fee
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-[#0a0a0a] font-medium text-lg rounded-lg tabular-nums transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(to right, #d4a553, #e8c474)" }}
            >
              {isLoading
                ? "Reserving..."
                : formData.addMusic
                  ? `I'll Be There + Music ($${(musicTotalCents / 100).toFixed(2)})`
                  : "I'll Be There (Free)"}
            </button>
          </form>

          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-4">
            You'll receive a confirmation email.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Poster date={date} city={city} region={region} doorTime={doorTime} />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex absolute inset-0 right-4 gap-8">
        <div className="h-full flex-shrink-0">
          <Poster date={date} city={city} region={region} doorTime={doorTime} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-6">
          <div className="mb-2">
            <h1
              className="text-8xl text-neutral-900 dark:text-white mb-2 font-extrabold uppercase"
              style={{ fontFamily: '"Parkinsans", sans-serif' }}
            >
              RSVP
            </h1>
            <p
              className="text-neutral-500 dark:text-neutral-400 text-sm uppercase tracking-wider"
              style={{ fontFamily: '"Space Mono", monospace' }}
            >
              {dateLabel} · {doorLabel}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <ContactFields
              ref={emailInputRef}
              email={formData.email}
              name={formData.name}
              phone={formData.phone}
              onEmailChange={(v) => setFormData((prev) => ({ ...prev, email: v }))}
              onNameChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
              onPhoneChange={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
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

            <div className="flex items-stretch gap-4 h-[4.5rem]">
              <div
                className={`border-2 border-neutral-200 dark:border-neutral-700 rounded-xl transition-all duration-300 ease-in-out ${formData.addMusic ? "w-1/2" : "w-full"}`}
              >
                <label className="flex items-center gap-4 px-5 cursor-pointer h-full">
                  <input
                    type="checkbox"
                    checked={formData.addMusic}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, addMusic: e.target.checked }))
                    }
                    className="w-6 h-6 rounded border-neutral-300 dark:border-neutral-600 text-[#d4a553] focus:ring-[#d4a553] accent-[#d4a553] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-neutral-900 dark:text-white text-lg leading-tight line-clamp-1">
                      Download Singles & 16s from 2025
                    </span>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5 line-clamp-1">
                      ~10 min of music + lyricbook, $10 min
                    </p>
                  </div>
                </label>
              </div>

              <div
                className={`flex items-stretch overflow-hidden transition-all duration-300 ease-in-out ${formData.addMusic ? "w-1/2 opacity-100" : "w-0 opacity-0"}`}
              >
                <button
                  type="button"
                  {...repeatProps(() =>
                    setFormData((prev) => ({
                      ...prev,
                      musicAmount: Math.max(1000, prev.musicAmount - 500),
                    })),
                  )}
                  disabled={formData.musicAmount <= 1000}
                  className="w-[4.5rem] rounded-l-xl border-2 border-r-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 select-none"
                >
                  <MinusIcon className="w-5 h-5" weight="bold" />
                </button>
                <div className="flex flex-col items-center justify-center flex-1 min-w-0 bg-neutral-100 dark:bg-neutral-800 border-y-2 border-neutral-200 dark:border-neutral-700">
                  <span className="font-bebas text-4xl text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
                    ${formData.musicAmount / 100}
                  </span>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs tabular-nums whitespace-nowrap">
                    + ${((musicTotalCents - formData.musicAmount) / 100).toFixed(2)} processing fees
                  </p>
                </div>
                <button
                  type="button"
                  {...repeatProps(() =>
                    setFormData((prev) => ({
                      ...prev,
                      musicAmount: prev.musicAmount + 500,
                    })),
                  )}
                  className="w-[4.5rem] rounded-r-xl border-2 border-l-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553] dark:hover:border-[#e8c474] transition-colors flex-shrink-0 select-none"
                >
                  <PlusIcon className="w-5 h-5" weight="bold" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[4.5rem] text-[#0a0a0a] font-medium text-2xl rounded-xl tabular-nums transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(to right, #d4a553, #e8c474)" }}
            >
              {isLoading
                ? "Reserving..."
                : formData.addMusic
                  ? `I'll Be There + Music ($${(musicTotalCents / 100).toFixed(2)})`
                  : "I'll Be There (Free)"}
            </button>

            <p className="text-neutral-500 dark:text-neutral-400 text-base">
              You'll receive a confirmation email.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
