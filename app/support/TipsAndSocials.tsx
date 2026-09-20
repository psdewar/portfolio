"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SocialCards from "../components/SocialCards";
import { useToast } from "../contexts/ToastContext";
import PaymentOptions from "../components/PaymentOptions";
import ContributeCardModal from "./ContributeCardModal";

function TipsSection({
  interacFirst = false,
  isOg = false,
  sponsorHref,
  concertCount,
  nextStop,
}: {
  interacFirst?: boolean;
  isOg?: boolean;
  sponsorHref?: string;
  concertCount: number;
  nextStop?: string;
}) {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-1">Fund My Tour</h2>
      <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4 split:mb-[clamp(0.5rem,calc(-28px_+_4vh),1rem)]">
        {concertCount} concerts since March &middot; hundreds of participants
        {nextStop && <> &middot; next stop: {nextStop}</>}
      </p>
      {!isOg && (
        <PaymentOptions
          venmoUrl="https://venmo.com/u/psdewar"
          onCard={() => setCardOpen(true)}
          interacFirst={interacFirst}
        />
      )}
      {!isOg && sponsorHref && (
        <div className="text-center mt-2 split:mt-[clamp(0.25rem,calc(-14px_+_2vh),0.5rem)]">
          <a
            href={sponsorHref}
            className="inline-block py-3 split:py-[clamp(0.25rem,calc(-32px_+_4vh),0.75rem)] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-base underline underline-offset-2 transition-colors"
          >
            Host my concert in your living room
          </a>
        </div>
      )}
      {cardOpen && <ContributeCardModal onClose={() => setCardOpen(false)} />}
    </div>
  );
}

const SUCCESS_MESSAGES: Record<string, string> = {
  no_shows: "No shows on the schedule right now. Support the tour to help book the next one.",
};

export default function TipsAndSocials({
  interacFirst = false,
  sponsorHref,
  concertCount,
  nextStop,
}: {
  interacFirst?: boolean;
  sponsorHref?: string;
  concertCount: number;
  nextStop?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const thanks = searchParams.get("thanks");
  const thanked = thanks === "tip" || thanks === "order";

  useEffect(() => {
    if (thanks === "1") {
      const sid = searchParams.get("session_id");
      router.replace(sid ? `/listen?patron_welcome=1&session_id=${encodeURIComponent(sid)}` : "/listen");
    }
  }, [thanks, searchParams, router]);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("success");
    const msg = key ? SUCCESS_MESSAGES[key] : null;
    if (!msg) return;
    toast.show(msg, 5000);
    window.history.replaceState({}, "", "/support");
  }, [toast]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 md:pt-12 split:pt-[clamp(1.5rem,calc(-84px_+_12vh),3rem)] split:pb-[clamp(0.5rem,calc(-136px_+_16vh),2.5rem)] split:px-0 split:max-w-none split:mx-0">
      <div className="flex flex-col gap-8 max-w-lg mx-auto split:max-w-none split:mx-0">
        {thanked ? (
          <div className="flex-1 min-w-0">
            <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">Thank you</h2>
            <SocialCards />
          </div>
        ) : (
          <TipsSection
            interacFirst={interacFirst}
            isOg={searchParams.get("og") === "true"}
            sponsorHref={sponsorHref}
            concertCount={concertCount}
            nextStop={nextStop}
          />
        )}
      </div>
    </div>
  );
}
