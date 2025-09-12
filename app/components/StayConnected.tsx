"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ContactFormData, processStayConnected } from "../actions";

interface StayConnectedProps {
  onClose?: () => void;
  isModal?: boolean;
  shouldShow?: boolean;
}

interface FormErrors {
  firstName?: string;
  email?: string;
}

const now = () => Date.now();

const isWithinLastFiveMinutes = (saved: string | null): boolean => {
  if (!saved) return false;
  const FIVE_MINUTES = 5 * 60 * 1000;
  return now() - parseInt(saved, 10) < FIVE_MINUTES;
};

export const shouldShowStayConnected = (): boolean => {
  if (typeof window === "undefined") return true;
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
}: StayConnectedProps) {
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    firstName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstNameRef = useRef<HTMLInputElement | null>(null);

  // If external shouldShow is provided, use it, otherwise use internal logic
  const componentShouldShow =
    externalShouldShow !== undefined ? externalShouldShow : shouldShowStayConnected();

  const handleClose = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stayConnectedDismissed", now().toString());
    }
    onClose?.();
  };

  useEffect(() => {
    const id = setTimeout(() => {
      firstNameRef.current?.focus();
      // optional: place cursor at end or select all
      // firstNameRef.current?.setSelectionRange?.(ContactFormData.firstName.length, ContactFormData.firstName.length);
      // firstNameRef.current?.select();
    }, 0);
    return () => clearTimeout(id);
  }, [isModal]);

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

    if (!validateForm()) return;

    setIsLoading(true);

    const { error } = await processStayConnected(contactFormData);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error submitting stay connected form:", error);
      }
      setErrors({ email: "Failed to submit. Please try again later." });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsSuccess(true);

    setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("stayConnectedCompleted", now().toString());
      }
      handleClose();
    }, 2000);
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
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Thanks for your support!
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          I&apos;ll be in touch soon
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
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
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

      <div className="my-4 inline-flex items-center gap-2">
        <Image
          src="/images/home/new-era-5-square.jpeg"
          alt="Peyt rhymes with heat"
          width={48}
          height={48}
          className="sm:w-16 sm:h-16 mx-auto rounded-full border-2 border-blue-500"
        />
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base font-medium">
          Drop your info and I&apos;ll keep you updated on releases, projects, and upcoming shows.
        </p>
      </div>

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
                : "border-gray-200 dark:border-neutral-600 focus:border-blue-500 dark:focus:border-blue-400"
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
                : "border-gray-200 dark:border-neutral-600 focus:border-blue-500 dark:focus:border-blue-400"
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
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border-2 border-gray-200 dark:border-neutral-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-sm sm:text-base">Submitting...</span>
            </div>
          ) : (
            "Stay connected"
          )}
        </button>
      </form>
    </div>
  );
}
