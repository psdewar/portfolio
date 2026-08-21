"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { activatePatronStatus } from "../lib/patron";
import { getTourConcertCount } from "../data/timeline";
import SocialCards from "../components/SocialCards";
import { useToast } from "../contexts/ToastContext";
import PaymentOptions from "../components/PaymentOptions";
import ContributeCardModal from "./ContributeCardModal";

function TipsSection({
  interacFirst = false,
  isOg = false,
  sponsorHref = "/sponsor",
}: {
  interacFirst?: boolean;
  isOg?: boolean;
  sponsorHref?: string;
}) {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-1">Fund My Tour</h2>
      {isOg && (
        <p className="text-base text-neutral-500 dark:text-neutral-400 mb-1">
          Your contribution helps me remain independent while funding my next tour stop.
        </p>
      )}
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
        {getTourConcertCount()} concerts so far &middot; hundreds of participants
      </p>
      {!isOg && (
        <PaymentOptions
          venmoUrl="https://venmo.com/u/psdewar"
          onCard={() => setCardOpen(true)}
          interacFirst={interacFirst}
        />
      )}
      {!isOg && (
        <div className="text-center mt-2">
          <a
            href={sponsorHref}
            className="inline-block py-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-base underline underline-offset-2 transition-colors"
          >
            Interested in sponsoring a live concert?
          </a>
        </div>
      )}
      {cardOpen && <ContributeCardModal onClose={() => setCardOpen(false)} />}
    </div>
  );
}

export function SocialSection() {
  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">Find Me</h2>
      <SocialCards />
    </div>
  );
}

const SUCCESS_MESSAGES: Record<string, string> = {
  no_shows: "No shows on the schedule right now. Support the tour to help book the next one.",
};

export default function TipsAndSocials({
  interacFirst = false,
  sponsorHref,
}: {
  interacFirst?: boolean;
  sponsorHref?: string;
}) {
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 md:pt-12">
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <TipsSection
          interacFirst={interacFirst}
          isOg={searchParams.get("og") === "true"}
          sponsorHref={sponsorHref}
        />
      </div>
    </div>
  );
}
