"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { activatePatronStatus } from "../lib/patron";
import { SOCIAL_LINKS } from "../components/Social";
import { CopySimpleIcon, CheckIcon } from "@phosphor-icons/react";

const ZELLE_EMAIL = process.env.NEXT_PUBLIC_ZELLE_EMAIL ?? "";

function TipsSection({ isOg = false }: { isOg?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopyZelle = () => {
    navigator.clipboard.writeText(ZELLE_EMAIL);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-1">Send a Tip</h2>
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
        Your contribution helps me remain independent while funding my next live concert.
      </p>
      <div className="space-y-3">
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
            className="brightness-0 invert"
          />
        </a>
        {ZELLE_EMAIL && !isOg && (
          <button
            onClick={handleCopyZelle}
            className="w-full flex items-center justify-between px-5 py-1 rounded-xl border-2 text-left transition-colors hover:opacity-90"
            style={{ borderColor: "#6D1ED4" }}
          >
            <Image src="/zelle_logo.svg" alt="Zelle" width={80} height={32} className="shrink-0" />
            <span className="flex items-center gap-1.5 text-base text-neutral-500 dark:text-neutral-400 shrink-0">
              {copied ? (
                <>
                  <CheckIcon size={14} weight="bold" />
                  Copied, now open Zelle
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
      </div>
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

export default function TipsAndSocials() {
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
        <TipsSection isOg={searchParams.get("og") === "true"} />
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
