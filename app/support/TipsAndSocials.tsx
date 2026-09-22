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
  concertCount,
  nextStop,
}: {
  interacFirst?: boolean;
  isOg?: boolean;
  concertCount: number;
  nextStop?: string;
}) {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <h2
        className={`font-bebas text-3xl text-neutral-900 dark:text-white ${isOg ? "mb-4" : "mb-1"}`}
      >
        Fund My Tour
      </h2>
      {!isOg && (
        <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4 split:mb-[clamp(0.5rem,calc(-28px_+_4vh),1rem)]">
          {concertCount} concerts since Mar '26 &middot; hundreds of
          participants
          {nextStop && (
            <>
              <br />
              Next stop: {nextStop}
            </>
          )}
        </p>
      )}
      <PaymentOptions
        venmoUrl="https://venmo.com/u/psdewar"
        onCard={() => setCardOpen(true)}
        interacFirst={interacFirst}
      />
      {cardOpen && <ContributeCardModal onClose={() => setCardOpen(false)} />}
    </div>
  );
}

const SUCCESS_MESSAGES: Record<string, string> = {
  no_shows:
    "No shows on the schedule right now. Support the tour to help book the next one.",
};

export default function TipsAndSocials({
  interacFirst = false,
  concertCount,
  nextStop,
}: {
  interacFirst?: boolean;
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
      router.replace(
        sid
          ? `/listen?patron_welcome=1&session_id=${encodeURIComponent(sid)}`
          : "/listen",
      );
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 md:pt-12 md:pb-10 split:pt-[clamp(1.5rem,calc(-84px_+_12vh),3rem)] split:pb-[clamp(0.5rem,calc(-136px_+_16vh),2.5rem)] split:px-0 split:max-w-none split:mx-0">
      <div className="flex flex-col gap-8 max-w-lg mx-auto split:max-w-none split:mx-0">
        {thanked ? (
          <div className="flex-1 min-w-0">
            <h2 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">
              Thank you
            </h2>
            <SocialCards />
          </div>
        ) : (
          <TipsSection
            interacFirst={interacFirst}
            isOg={searchParams.get("og") === "true"}
            concertCount={concertCount}
            nextStop={nextStop}
          />
        )}
      </div>
    </div>
  );
}
