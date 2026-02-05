"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon, UsersIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { calculateStripeFee } from "../api/shared/products";
import ContactFields from "../components/ContactFields";

interface FormData {
  name: string;
  email: string;
  phone: string;
  guests: number;
  addMusic: boolean;
  musicAmount: number; // in cents, min 1000
}

interface FormErrors {
  name?: string;
  email?: string;
}

function Poster() {
  return (
    <>
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600&family=Parkinsans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap");

        .poster {
          width: 100%;
          aspect-ratio: 480 / 720;
          position: relative;
          overflow: hidden;
          font-family: "Parkinsans", sans-serif;
          background: #0a0a0a;
          container-type: inline-size;
        }
        @media (min-width: 768px) {
          .poster {
            width: auto;
            height: 100%;
            aspect-ratio: 480 / 720;
            border-radius: 0 8px 8px 0;
          }
        }
        .poster-bg {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: 1;
        }
        .poster::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
          z-index: 11;
          pointer-events: none;
          opacity: 0.4;
        }
        .photo-overlay {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(10, 10, 10, 0.85) 0%,
            rgba(10, 10, 10, 0.65) 15%,
            rgba(10, 10, 10, 0.22) 45%,
            transparent 70%
          );
          z-index: 3;
        }
        .bottom-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(
            to top,
            rgba(10, 10, 10, 0.9) 0%,
            rgba(10, 10, 10, 0.75) 25%,
            rgba(10, 10, 10, 0.4) 55%,
            transparent 100%
          );
          z-index: 4;
        }
        .poster-content {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          padding: 5% 6%;
        }
        .lockup {
          display: flex;
          align-items: center;
          gap: 0.625cqw;
          margin-bottom: 0.833cqw;
        }
        .lockup-img {
          height: 4.583cqw;
          width: auto;
        }
        .lockup-records {
          font-family: "Fira Sans", sans-serif;
          font-size: 3.125cqw;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 0.208cqw;
        }
        .presents {
          font-family: "Space Mono", monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
          margin-bottom: 1.667cqw;
          margin-top: 1.667cqw;
        }
        .title-block {
          margin-bottom: auto;
        }
        .title-from {
          font-size: 5.417cqw;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #d4a553;
          line-height: 0.9;
        }
        .title-big {
          font-size: 15cqw;
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.01em;
          color: #f0ede6;
          text-transform: uppercase;
        }
        .title-accent {
          width: 14.375cqw;
          height: 0.625cqw;
          background: linear-gradient(to right, #d4a553, #e8c474);
          border-radius: 0.417cqw;
          margin: 1.25cqw 0 1.458cqw;
        }
        .the-concert {
          font-family: "Space Mono", monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
        }
        .details {
          margin-top: auto;
          width: 100%;
        }
        .bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
        }
        .bottom-left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .detail-group {
          display: flex;
          flex-direction: column;
          gap: 0.833cqw;
        }
        .detail-value {
          font-size: 2.5cqw;
          font-weight: 500;
          color: #c0b8a8;
          letter-spacing: 0.02em;
        }
        .detail-value.date {
          font-size: 3.75cqw;
          font-weight: 700;
          color: #f0ede6;
        }
        .tags {
          display: flex;
          gap: 2.083cqw;
          margin-top: 2.5cqw;
        }
        .tag {
          font-size: 2.083cqw;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 1.667cqw 3.333cqw;
          border-radius: 0.833cqw;
          border: 1px solid transparent;
        }
        .tag-free {
          color: #0a0a0a;
          background: #d4a553;
          border-color: #d4a553;
        }
        .tag-friends {
          color: #e8c474;
          background: rgba(232, 196, 116, 0.08);
          border-color: rgba(232, 196, 116, 0.25);
        }
      `}</style>
      <div className="poster">
        <img src="/Jan23OpenMicNight-08_Original.jpg" alt="" className="poster-bg" />
        <div className="photo-overlay" />
        <div className="bottom-overlay" />
        <div className="poster-content">
          <div className="lockup">
            <img src="/lyrist-trademark-white.png" alt="Lyrist" className="lockup-img" />
            <span className="lockup-records">Records</span>
          </div>
          <div className="presents">presents</div>
          <div className="title-block">
            <div className="title-from">From The</div>
            <div className="title-big">Ground</div>
            <div className="title-big" style={{ marginBottom: 0 }}>
              Up
            </div>
            <div className="title-accent" />
            <div className="the-concert">a concert by rapper</div>
            <div className="the-concert">and software engineer</div>
            <div className="the-concert">peyt spencer</div>
          </div>
          <div className="details">
            <div className="bottom-row">
              <div className="bottom-left">
                <div className="detail-group">
                  <div className="detail-value date">Friday, February 20, 2026</div>
                  <div className="detail-value">8432 Granville Ave, Richmond, BC</div>
                  <div className="detail-value">Doors open at 5PM</div>
                </div>
                <div className="tags">
                  <div className="tag tag-free">Free Admission</div>
                  <div className="tag tag-friends">Bring Your Friends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RSVPPage() {
  const searchParams = useSearchParams();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    guests: 1,
    addMusic: false,
    musicAmount: 1000, // $10 default
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Check URL params for success states
  useEffect(() => {
    if (searchParams.get("rsvp_success") === "true") {
      setIsSuccess(true);
    }
    if (searchParams.get("session_id")) {
      setIsSuccess(true);
      setPurchaseSuccess(true);
    }
  }, [searchParams]);

  // Focus name input on mount (desktop only - mobile blocks this)
  useEffect(() => {
    const isDesktop = window.matchMedia("(pointer: fine)").matches;
    if (isDesktop) {
      emailInputRef.current?.focus();
    }
  }, []);

  const musicTotalCents = calculateStripeFee(formData.musicAmount);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

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
      // Step 1: Submit RSVP
      console.log("[RSVP Client] Submitting RSVP:", {
        name: formData.name,
        email: formData.email,
        guests: formData.guests,
        addMusic: formData.addMusic,
        musicAmount: formData.musicAmount,
      });

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          guests: formData.guests,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ email: data.error || "Something went wrong" });
        return;
      }

      console.log("[RSVP Client] RSVP saved");

      // Step 2: If music purchase, redirect to Stripe checkout
      if (formData.addMusic) {
        console.log("[RSVP Client] Creating checkout session:", {
          productId: "singles-16s-pack-2025",
          amount: musicTotalCents,
        });

        const checkoutRes = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: "singles-16s-pack-2025",
            amount: musicTotalCents,
            successPath: "/rsvp",
            cancelPath: "/rsvp?rsvp_success=true",
          }),
        });

        if (!checkoutRes.ok) {
          // RSVP succeeded but checkout failed - show RSVP success anyway
          console.log("[RSVP Client] Checkout failed, showing RSVP success");
          setIsSuccess(true);
          return;
        }

        const { url } = await checkoutRes.json();
        if (url) {
          console.log("[RSVP Client] Redirecting to Stripe:", { url });
          window.location.href = url;
          return;
        }
      }

      setIsSuccess(true);
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

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" weight="bold" />
          </div>
          <h1 className="font-bebas text-4xl md:text-5xl text-neutral-900 dark:text-white mb-3">
            {purchaseSuccess ? "You're In + Music Purchased" : "You're In"}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 mb-2">
            {formData.name
              ? formData.guests > 1
                ? `${formData.guests} spots reserved for ${formData.name}`
                : `1 spot reserved for ${formData.name}`
              : "Your spot is reserved"}
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8">
            {purchaseSuccess
              ? "Check your email for RSVP confirmation and your download link."
              : "Check your email for confirmation and details."}
          </p>

          {/* Patron callout - only show if no purchase was made */}
          {!purchaseSuccess && (
            <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl p-6 mb-6">
              <h2 className="font-bebas text-xl text-neutral-900 dark:text-white mb-2">
                Support My Independence
              </h2>
              <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4">
                Become a monthly patron to fund new music, tours, and creative projects.
              </p>
              <Link
                href="/patron"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all hover:scale-105"
                style={{ background: "linear-gradient(to right, #f97316, #ec4899)" }}
              >
                Become a Patron
              </Link>
            </div>
          )}

          <Link
            href="/"
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-sm transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 right-0 top-14 bottom-0 bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Mobile layout */}
      <div className="md:hidden flex flex-col h-full overflow-y-auto">
        <div className="px-[6%] py-8">
          <div className="mb-6">
            <h1 className="font-bebas text-4xl md:text-6xl text-neutral-900 dark:text-white mb-2">
              RSVP
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base">
              Friday, February 20th · Doors at 5PM
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
                  Total: ${(musicTotalCents / 100).toFixed(2)} (includes processing fee)
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
          {/* Close mobile form div */}
        </div>
        <div className="flex-shrink-0">
          <Poster />
        </div>
        {/* Close mobile layout */}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex absolute inset-0 right-4 gap-8">
        <div className="h-full flex-shrink-0">
          <Poster />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-6">
          <div className="mb-2">
            <h1 className="font-bebas text-8xl text-neutral-900 dark:text-white mb-1">RSVP</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xl">
              Friday, February 20th · Doors at 5PM
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
