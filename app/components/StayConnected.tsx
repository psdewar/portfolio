"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { ContactFormData } from "../actions";
import FormInput from "./FormInput";
import ContactFields from "./ContactFields";

interface SelectedTier {
  name: string;
  amount: number;
  period: "monthly" | "annually";
}

interface StayConnectedProps {
  onClose?: (email?: string) => void;
  onChangeTier?: () => void;
  isModal?: boolean;
  shouldShow?: boolean;
  selectedTier?: SelectedTier;
}

interface FormErrors {
  email?: string;
  otp?: string;
}

type Mode = "signup" | "signin";
type Step = "form" | "code";

const now = () => Date.now();

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const PRIMARY_BUTTON_CLASS =
  "w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-gray-400 text-white dark:text-neutral-900 font-medium py-3 px-4 text-base rounded-lg transition-colors disabled:cursor-not-allowed";

const MODE_SWITCH_BUTTON_CLASS =
  "w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2 transition-colors";

// This should only be called client-side (inside useEffect)
export const shouldShowStayConnected = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  // Hide for OG screenshot captures
  if (urlParams.get("og") === "true") return false;
  // Hide on any success redirect
  if (urlParams.get("success")) return false;
  // Never show to patrons
  if (localStorage.getItem("patronStatus") === "active") return false;
  // Already completed or dismissed this session (tab)
  if (sessionStorage.getItem("stayConnectedCompleted")) return false;
  if (sessionStorage.getItem("stayConnectedDismissed")) return false;
  return true;
};

export default function StayConnected({
  onClose,
  onChangeTier,
  isModal = false,
  shouldShow: externalShouldShow,
  selectedTier,
}: StayConnectedProps) {
  const posthog = usePostHog();
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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

  const handleClose = (email?: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stayConnectedDismissed", now().toString());
    }
    onClose?.(email);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (step === "code") {
        otpRef.current?.focus();
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
        body: JSON.stringify({
          name: contactFormData.name,
          email: contactFormData.email,
          phone: contactFormData.phone,
          tier: selectedTier?.name || "",
        }),
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

      // Success - store name and close
      if (typeof window !== "undefined") {
        if (data.firstName) localStorage.setItem("liveCommenterName", data.firstName);
        sessionStorage.setItem("stayConnectedCompleted", now().toString());
      }

      // Track email capture (only for signup, not signin)
      if (mode === "signup") {
        posthog?.capture("email_captured", { source: "live" });
      }

      const verifiedEmail = mode === "signup" ? contactFormData.email : signInEmail;
      setIsSuccess(true);
      setTimeout(() => handleClose(verifiedEmail.trim().toLowerCase()), 2000);
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

  if (!componentShouldShow) return null;

  const containerClass = isModal
    ? "bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm sm:max-w-md w-full mx-4"
    : "bg-white dark:bg-neutral-800 rounded-xl p-4 sm:p-6";

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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
      <div className={`${containerClass} shadow-2xl text-center`}>
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

  const headerTitle =
    step === "code"
      ? "Check your email"
      : selectedTier
        ? `Join the ${selectedTier.name} tier`
        : mode === "signup"
          ? "Stay connected"
          : "Welcome back";

  const headerSub =
    step === "code"
      ? `Code sent to ${mode === "signup" ? contactFormData.email : signInEmail}`
      : selectedTier
        ? `Sign ${mode === "signup" ? "up" : "in"} to continue to checkout`
        : mode === "signup"
          ? "Drop your info and I'll keep you updated on releases, livestreams, and upcoming shows."
          : "Enter your email to get a verification code.";

  return (
    <div className={`${containerClass} shadow-2xl`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {!(selectedTier && step !== "code") && (
            <Image
              src="/images/home/openmic-square.jpeg"
              alt="Peyt rhymes with heat"
              width={48}
              height={48}
              className="rounded-full shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className="font-bebas text-2xl leading-none text-neutral-900 dark:text-white">
              {headerTitle}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {selectedTier && step === "form" ? (
                <>
                  ${selectedTier.amount}
                  {selectedTier.period === "annually" ? "/yr" : "/mo"}
                  {onChangeTier ? (
                    <>
                      {" or "}
                      <button
                        type="button"
                        onClick={onChangeTier}
                        className="inline-block underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white transition-colors py-3 -my-3"
                      >
                        change tier
                      </button>
                    </>
                  ) : null}
                </>
              ) : (
                headerSub
              )}
            </p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            onClick={() => handleClose()}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4 text-neutral-500 dark:text-neutral-300"
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
      </div>

      {step === "code" ? (
        <div className="space-y-3 sm:space-y-4">
          {countdown > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Expires in {formatCountdown(countdown)}
            </p>
          )}
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
              className={`w-full px-4 py-3 text-base rounded-lg border-2 transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-center tracking-[0.5em] font-mono ${
                errors.otp
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100"
              } focus:outline-none`}
            />
            {errors.otp && (
              <p className="text-red-500 text-sm mt-1 text-center">{errors.otp}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={isLoading || countdown <= 0}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? "Verifying..." : countdown <= 0 ? "Code expired" : "Verify"}
          </button>
          {countdown <= 0 && (
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full py-3 text-sm text-neutral-900 dark:text-neutral-100 underline hover:underline"
            >
              Request new code
            </button>
          )}
        </div>
      ) : mode === "signup" ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <ContactFields
            ref={emailRef}
            email={contactFormData.email}
            name={contactFormData.name}
            phone={contactFormData.phone}
            onEmailChange={(v) => handleInputChange("email", v)}
            onNameChange={(v) => handleInputChange("name", v)}
            onPhoneChange={(v) => handleInputChange("phone", v)}
            errors={errors}
            compact
          />
          <button
            type="submit"
            disabled={isLoading}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? "Sending code..." : "Stay connected"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={MODE_SWITCH_BUTTON_CLASS}
          >
            Already signed up? Sign in
          </button>
        </form>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <FormInput
            ref={emailRef}
            type="email"
            placeholder="Email address"
            value={signInEmail}
            onChange={(e) => {
              setSignInEmail(e.target.value);
              if (errors.email) setErrors({});
            }}
            onKeyDown={(e) => e.key === "Enter" && handleRequestSignInCode()}
            error={errors.email}
            compact
          />
          <button
            type="button"
            onClick={handleRequestSignInCode}
            disabled={isLoading}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? "Sending..." : "Send code"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={MODE_SWITCH_BUTTON_CLASS}
          >
            New here? Sign up
          </button>
        </div>
      )}
    </div>
  );
}
