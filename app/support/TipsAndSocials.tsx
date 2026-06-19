"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { activatePatronStatus } from "../lib/patron";
import { SOCIAL_LINKS } from "../components/Social";
import { useToast } from "../contexts/ToastContext";
import PaymentOptions from "../components/PaymentOptions";
import ContributeCardModal from "./ContributeCardModal";

function TipsSection({
  interacFirst = false,
  isOg = false,
}: {
  interacFirst?: boolean;
  isOg?: boolean;
}) {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-1">Fund My Tour</h2>
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
        {isOg
          ? "Your contribution helps me remain independent while funding my next tour stop."
          : "Tap Venmo to send directly, copy my email for Zelle, or pay by card."}
      </p>
      {!isOg && (
        <PaymentOptions
          venmoUrl="https://venmo.com/u/psdewar"
          onCard={() => setCardOpen(true)}
          interacFirst={interacFirst}
        />
      )}
      {cardOpen && <ContributeCardModal onClose={() => setCardOpen(false)} />}
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 md:pt-12">
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <TipsSection interacFirst={interacFirst} isOg={searchParams.get("og") === "true"} />
      </div>
    </div>
  );
}
