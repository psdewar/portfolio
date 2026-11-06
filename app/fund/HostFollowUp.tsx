"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

const COPY = {
  lead: "Thanks for reading this far. Quick question:",
  headline: "Is there potential for a concert?",
  answers: [
    {
      answer: "talk",
      label: "Let's talk",
      thanks: "Thank you! I'll reach out soon.",
    },
    {
      answer: "asking",
      label: "I'll ask around",
      thanks: "Thanks. I'll reach out again soon.",
    },
    {
      answer: "no",
      label: "Not at this time",
      thanks: "Thanks for letting me know!",
    },
  ],
} as const;

type Answer = (typeof COPY.answers)[number]["answer"];

export default function HostFollowUp({
  trip,
  community,
  suppressed,
}: {
  trip: string;
  community: string;
  suppressed: boolean;
}) {
  const [reached, setReached] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [answered, setAnswered] = useState<Answer | null>(null);
  const visible = reached && !suppressed;
  const announced = useRef(false);
  const storageKey = `fund-host-answer:${trip}:${community}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) setGone(true);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReached(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -160px 0px" },
    );
    for (const target of [
      document.getElementById("who"),
      document.querySelector(".site-foot"),
    ]) {
      if (target) io.observe(target);
    }
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || gone || announced.current) return;
    announced.current = true;
    posthog.capture("fund_host_prompt_shown", { trip });
  }, [visible, gone, trip]);

  useEffect(() => {
    if (!answered) return;
    const fade = setTimeout(() => setLeaving(true), 3600);
    const remove = setTimeout(() => setGone(true), 4000);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [answered]);

  if (gone) return null;

  const answer = (value: Answer) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {}
    posthog.capture("fund_host_prompt_answer", {
      trip,
      community,
      answer: value,
    });
    setAnswered(value);
  };

  return (
    <div
      className={`host-bar${visible ? " is-on" : ""}${leaving ? " is-leaving" : ""}`}
    >
      <div className="host-bar-inner">
        {answered ? (
          <p className="host-bar-head" role="status">
            {COPY.answers.find((a) => a.answer === answered)?.thanks}
          </p>
        ) : (
          <>
            <p className="host-bar-text">
              <span className="host-bar-lead">{COPY.lead}</span>
              <span className="host-bar-head">{COPY.headline}</span>
            </p>
            <div className="host-bar-actions">
              {COPY.answers.map((a, i) => (
                <button
                  key={a.answer}
                  type="button"
                  className={
                    i === 0 ? "host-btn host-btn--primary" : "host-btn"
                  }
                  onClick={() => answer(a.answer)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
