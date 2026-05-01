"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { activatePatronStatus } from "../lib/patron";
import { SOCIAL_LINKS } from "../components/Social";
import { CopySimpleIcon, CheckIcon } from "@phosphor-icons/react";
import { useToast } from "../contexts/ToastContext";

const ZELLE_EMAIL = process.env.NEXT_PUBLIC_ZELLE_EMAIL ?? "";
const INTERAC_EMAIL = process.env.NEXT_PUBLIC_INTERAC_EMAIL ?? "";

function TipsSection({
  interacFirst = false,
  isOg = false,
}: {
  interacFirst?: boolean;
  isOg?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.show(label);
    setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 2000);
  };

  const interacButton = INTERAC_EMAIL && (
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
  );

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-1">Send a Tip</h2>
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
        Your contribution helps me remain independent while funding my next tour stop.
        {!isOg &&
          (interacFirst
            ? " Tap to copy my email for an Interac e-Transfer, or use Venmo/Zelle if you prefer."
            : " Tap Venmo to send directly, or copy my email for Zelle or Interac.")}
      </p>
      {!isOg && (
        <div className="space-y-3">
          {interacFirst && interacButton}
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
              <Image
                src="/zelle_logo.svg"
                alt="Zelle"
                width={80}
                height={32}
                className="shrink-0"
              />
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
          {!interacFirst && interacButton}
        </div>
      )}
    </div>
  );
}

export function SocialSection() {
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

const SUCCESS_MESSAGES: Record<string, string> = {
  no_shows: "No shows on the schedule right now. Support the tour to help book the next one.",
};

export default function TipsAndSocials({ interacFirst = false }: { interacFirst?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

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

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("success");
    const msg = key ? SUCCESS_MESSAGES[key] : null;
    if (!msg) return;
    toast.show(msg, 5000);
    window.history.replaceState({}, "", "/support");
  }, [toast]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <TipsSection interacFirst={interacFirst} isOg={searchParams.get("og") === "true"} />
      </div>
    </div>
  );
}
