"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePostHog } from "posthog-js/react";
import { ContactFormData } from "../actions";

interface SelectedTier {
  name: string;
  amount: number;
  period: "monthly" | "annually";
}

const TIER_ELEMENTS: Record<string, string> = {
  Pen: "words that paint the art",
  Flow: "rhythm that moves the art",
  Mind: "ideas that shape the art",
  Soul: "fire that fuels the art",
};

interface StayConnectedProps {
  onClose?: () => void;
  isModal?: boolean;
  shouldShow?: boolean;
  selectedTier?: SelectedTier;
}

interface FormErrors {
  firstName?: string;
  email?: string;
  otp?: string;
}

type Mode = "signup" | "signin";
type Step = "form" | "code";

const now = () => Date.now();

const isWithinLastFiveMinutes = (saved: string | null): boolean => {
  if (!saved) return false;
  const FIVE_MINUTES = 5 * 60 * 1000;
  return now() - parseInt(saved, 10) < FIVE_MINUTES;
};

// This should only be called client-side (inside useEffect)
export const shouldShowStayConnected = (): boolean => {
  // Hide for OG screenshot captures
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("og") === "true") return false;
  // Never show to patrons - they've already committed
  const patronStatus = localStorage.getItem("patronStatus");
  if (patronStatus === "active") return false;
  const completedTime = sessionStorage.getItem("stayConnectedCompleted");
  if (isWithinLastFiveMinutes(completedTime)) return false;
  const dismissedTime = sessionStorage.getItem("stayConnectedDismissed");
  if (isWithinLastFiveMinutes(dismissedTime)) return false;
  return true;
};

export default function StayConnected({
  onClose,
  isModal = false,
  shouldShow: externalShouldShow,
  selectedTier,
}: StayConnectedProps) {
  const posthog = usePostHog();
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    firstName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const otpRef = useRef<HTMLInputElement | null>(null);

  // Mode and step state
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<Step>("form");
  const [signInEmail, setSignInEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Visibility controlled by parent - if not provided, default to true (parent should control rendering)
  const componentShouldShow = externalShouldShow ?? true;

  const handleClose = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stayConnectedDismissed", now().toString());
    }
    onClose?.();
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (step === "code") {
        otpRef.current?.focus();
      } else if (mode === "signup") {
        firstNameRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 0);
    return () => clearTimeout(id);
  }, [isModal, mode, step]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  const handleRequestSignInCode = async () => {
    if (!signInEmail.trim() || !signInEmail.includes("@")) {
      setErrors({ email: "Please enter a valid email" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ email: data.error || "Failed to send code" });
        setIsLoading(false);
        return;
      }

      setOtpToken(data.token);
      setStep("code");
      setCountdown(120); // 2 minutes
    } catch {
      setErrors({ email: "Failed to send code. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestSignUpCode = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/otp/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contactFormData, tier: selectedTier?.name || "" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ email: data.error || "Failed to send code" });
        setIsLoading(false);
        return;
      }

      setOtpToken(data.token);
      setStep("code");
      setCountdown(120); // 2 minutes
    } catch {
      setErrors({ email: "Failed to send code. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otpCode.length !== 4) {
      setErrors({ otp: "Please enter the 4-digit code" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Use different endpoint for signup vs signin
      const endpoint = mode === "signup" ? "/api/otp/verify-signup" : "/api/otp/verify";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: otpToken, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ otp: data.error || "Invalid code" });
        setIsLoading(false);
        return;
      }

      // Success - store firstName and close
      if (typeof window !== "undefined") {
        localStorage.setItem("liveCommenterName", data.firstName);
        sessionStorage.setItem("stayConnectedCompleted", now().toString());
      }

      // Track email capture (only for signup, not signin)
      if (mode === "signup") {
        posthog?.capture("email_captured", { source: "live" });
      }

      setIsSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch {
      setErrors({ otp: "Verification failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrors({});
    setStep("form");
    setOtpCode("");
    setOtpToken("");
    setCountdown(0);
  };

  // Don't render if shouldn't show (after hooks to avoid conditional hook calls)
  if (!componentShouldShow) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!contactFormData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!contactFormData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactFormData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleRequestSignUpCode();
  };
  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setContactFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isSuccess) {
    return (
      <div
        className={`${
          isModal
            ? "bg-white dark:bg-neutral-800 rounded-xl p-4 sm:p-6 md:p-8 max-w-sm sm:max-w-md w-full mx-4"
            : "bg-white dark:bg-neutral-800 rounded-xl p-4 sm:p-6"
        } shadow-2xl text-center`}
      >
        <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-3 sm:mb-4">
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-2">
          {mode === "signin" ? "Welcome back!" : "Thanks for your support!"}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          {mode === "signin" ? "You're signed in" : "I'll be in touch soon"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${
        isModal
          ? "bg-white dark:bg-neutral-800 rounded-xl p-4 sm:p-6 md:p-8 max-w-sm sm:max-w-md w-full mx-4"
          : "bg-white dark:bg-neutral-800 rounded-xl p-4 sm:p-6"
      } shadow-2xl relative`}
    >
      {isModal && onClose && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      <div className="my-4 inline-flex items-center gap-3 pr-6">
        <Image
          src="/images/home/openmic-square.jpeg"
          alt="Peyt rhymes with heat"
          width={48}
          height={48}
          className="sm:w-16 sm:h-16 mx-auto rounded-full"
        />
        <div className="text-left">
          {selectedTier && step !== "code" && (
            <p className="text-gray-900 dark:text-white text-sm sm:text-base font-medium">
              You chose {selectedTier.name}:{" "}
              {TIER_ELEMENTS[selectedTier.name] || "the element that puts it all together"}
            </p>
          )}
          <p className="text-gray-600 dark:text-gray-100 text-sm sm:text-base font-medium">
            {step === "code"
              ? "Enter the verification code sent to your email."
              : selectedTier
                ? "Sign in or create an account to continue."
                : mode === "signup"
                  ? "Drop your info and I'll keep you updated on releases, livestreams, and upcoming shows."
                  : "Enter your email to get a verification code."}
          </p>
        </div>
      </div>

      {step === "code" ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Code sent to {mode === "signup" ? contactFormData.email : signInEmail}
            </p>
            {countdown > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Expires in {formatCountdown(countdown)}
              </p>
            )}
          </div>
          <div>
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Enter 4-digit code"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setOtpCode(val);
                if (errors.otp) setErrors({});
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-center tracking-[0.5em] font-mono ${
                errors.otp
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100"
              } focus:outline-none`}
            />
            {errors.otp && (
              <p className="text-red-500 text-xs sm:text-sm mt-1 text-center">{errors.otp}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={isLoading || countdown <= 0}
            className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-gray-400 text-white dark:text-neutral-900 font-medium py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? "Verifying..." : countdown <= 0 ? "Code expired" : "Verify"}
          </button>
          {countdown <= 0 && (
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-sm text-neutral-900 dark:text-neutral-100 underline hover:underline"
            >
              Request new code
            </button>
          )}
          <button
            type="button"
            onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            {mode === "signup" ? "Already signed up? Sign in" : "New here? Sign up"}
          </button>
        </div>
      ) : mode === "signup" ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <input
              ref={firstNameRef}
              type="text"
              placeholder="First name *"
              value={contactFormData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.firstName
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100"
              } focus:outline-none`}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <input
              type="email"
              placeholder="Email address *"
              value={contactFormData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100"
              } focus:outline-none`}
            />
            {errors.email && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email}</p>}
          </div>
          <div>
            <input
              type="tel"
              placeholder="Phone number"
              value={contactFormData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-gray-400 text-white dark:text-neutral-900 font-medium py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending code..." : "Stay connected"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Already signed up? Sign in
          </button>
        </form>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <input
              ref={emailRef}
              type="email"
              placeholder="Email address"
              value={signInEmail}
              onChange={(e) => {
                setSignInEmail(e.target.value);
                if (errors.email) setErrors({});
              }}
              onKeyDown={(e) => e.key === "Enter" && handleRequestSignInCode()}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                errors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100"
              } focus:outline-none`}
            />
            {errors.email && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email}</p>}
          </div>
          <button
            type="button"
            onClick={handleRequestSignInCode}
            disabled={isLoading}
            className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-gray-400 text-white dark:text-neutral-900 font-medium py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send code"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            New here? Sign up
          </button>
        </div>
      )}
    </div>
  );
}
