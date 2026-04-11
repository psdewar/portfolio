"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { activatePatronStatus } from "../lib/patron";
import { SOCIAL_LINKS } from "../components/Social";
import { CopySimpleIcon, CheckIcon } from "@phosphor-icons/react";
import { Toast } from "../components/Toast";

const ZELLE_EMAIL = process.env.NEXT_PUBLIC_ZELLE_EMAIL ?? "";
const INTERAC_EMAIL = process.env.NEXT_PUBLIC_INTERAC_EMAIL ?? "";

function TipsSection({ showInterac: initialShowInterac = false, isOg = false }: { showInterac?: boolean; isOg?: boolean }) {
  const [useInterac, setUseInterac] = useState(initialShowInterac);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    timers.current.forEach(clearTimeout);
    setCopied(key);
    setToast(label);
    setToastExiting(false);
    timers.current = [
      setTimeout(() => setCopied(null), 2000),
      setTimeout(() => setToastExiting(true), 2500),
      setTimeout(() => {
        setToast(null);
        setToastExiting(false);
      }, 3000),
    ];
  };

  return (
    <div className="flex-1 min-w-0">
      {toast && <Toast message={toast} exiting={toastExiting} />}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white">Send a Tip</h2>
        {initialShowInterac && !isOg && (
          <button
            onClick={() => setUseInterac(!useInterac)}
            className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <span
              className={`relative w-10 h-6 rounded-full transition-colors ${
                !useInterac ? "bg-orange-500" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center transition-all ${
                  !useInterac ? "left-[18px]" : "left-0.5"
                }`}
              >
                {!useInterac && (
                  <CheckIcon size={12} weight="bold" className="text-orange-500" />
                )}
              </span>
            </span>
            No Canadian account
          </button>
        )}
      </div>
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
        Your contribution helps me remain independent while funding my next live concert.
        {!isOg && (useInterac
          ? " Tap to copy my email, then open your banking app and send an Interac e-Transfer."
          : " Tap Venmo to send directly, or copy my email for Zelle.")}
      </p>
      {!isOg && (
        <div className="space-y-3">
          {useInterac && INTERAC_EMAIL ? (
            <button
              onClick={() =>
                handleCopy(
                  INTERAC_EMAIL,
                  "interac",
                  "Email copied, open your bank app to send an e-Transfer",
                )
              }
              className="w-full flex items-center justify-between px-5 py-1 rounded-xl text-left transition-colors hover:opacity-90 overflow-hidden"
              style={{ backgroundColor: "#FFBE00" }}
            >
              <Image
                src="/interac_logo.svg"
                alt="Interac e-Transfer"
                width={56}
                height={56}
                className="shrink-0"
              />
              <span
                className="flex items-center gap-1.5 text-base font-medium shrink-0"
                style={{ color: "#333" }}
              >
                {copied === "interac" ? (
                  <>
                    <CheckIcon size={14} weight="bold" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopySimpleIcon size={14} weight="bold" />
                    Copy my email for e-Transfer
                  </>
                )}
              </span>
            </button>
          ) : (
            <>
              <a
                href="https://venmo.com/u/psdewar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-5 py-4 rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: "#008CFF" }}
              >
                <Image
                  src="/Venmo_Logo_Blue.png"
                  alt="Venmo"
                  width={120}
                  height={25}
                  priority
                  className="brightness-0 invert"
                />
              </a>
              {ZELLE_EMAIL && (
                <button
                  onClick={() => handleCopy(ZELLE_EMAIL, "zelle", "Email copied, open Zelle to send")}
                  className="w-full flex items-center justify-between px-5 py-1 rounded-xl border-2 text-left transition-colors hover:opacity-90"
                  style={{ borderColor: "#6D1ED4" }}
                >
                  <Image src="/zelle_logo.svg" alt="Zelle" width={80} height={32} className="shrink-0" />
                  <span className="flex items-center gap-1.5 text-base text-neutral-500 dark:text-neutral-400 shrink-0">
                    {copied === "zelle" ? (
                      <>
                        <CheckIcon size={14} weight="bold" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopySimpleIcon size={14} weight="bold" />
                        Copy my email for Zelle
                      </>
                    )}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SocialSection() {
  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">Find Me</h2>
      <div className="-mx-4 sm:mx-0 sm:rounded-xl border-y-2 sm:border-x-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800 sm:overflow-hidden">
        {SOCIAL_LINKS.map(({ href, label, username, icon: Icon, color }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Icon size={32} weight="regular" style={{ color }} />
            <span className="text-neutral-900 dark:text-white font-medium text-xl">{label}</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-lg ml-auto">
              {username}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function TipsAndSocials({ showInterac = false }: { showInterac?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("thanks") === "1") {
      const sid = searchParams.get("session_id");
      activatePatronStatus();

      if (sid) {
        fetch(`/api/checkout-session?session_id=${sid}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.email) localStorage.setItem("patronEmail", data.email);
          })
          .catch(console.error)
          .finally(() => router.replace("/listen?patron_welcome=1"));
      } else {
        router.replace("/listen?patron_welcome=1");
      }
    }
  }, [searchParams, router]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <TipsSection showInterac={showInterac} isOg={searchParams.get("og") === "true"} />
        <SocialSection />
        <a
          href="/sponsor"
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-base underline underline-offset-2 transition-colors"
        >
          Interested in sponsoring a live concert?
        </a>
      </div>
    </div>
  );
}
