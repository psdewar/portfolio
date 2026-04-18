"use client";

import { useEffect, useRef, useState } from "react";

type Item = { q: string; a: string };

const faq: Item[] = [
  {
    q: "Are we too small to host?",
    a: "No! The smaller your community, the more intimate our concert can be. There's nothing like the energy of a dozen neighbors in their living room.",
  },
  {
    q: "What's the format?",
    a: "The concert fits into whatever you're already doing, whether that's a youth night, a family gathering, a devotional, or a standalone event. Music and conversation work in all of them.",
  },
  {
    q: "What if we can't host?",
    a: "Point me to a group who might host, and once a concert is booked, you can help share the poster!",
  },
  {
    q: "How fast can this come together?",
    a: "Flexible to your timing. A week or two is usually enough to share a poster and spread the word, but I can plan further out too. On your end, the rest is low-maintenance: I arrive with my own sound, and setup takes under 30 minutes.",
  },
];

export default function HostFAQ() {
  const ref = useRef<HTMLElement>(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("og") === "true") {
      setHide(true);
      return;
    }
    const hasFaqQuery = url.searchParams.has("faq");
    const hasFaqHash = window.location.hash === "#faq";
    if ((hasFaqQuery || hasFaqHash) && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (hide) return null;

  return (
    <section ref={ref} id="faq" className="w-full scroll-mt-16 py-12 sm:py-16">
      <header className="mb-8">
        <p className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">
          Common questions
        </p>
        <h2 className="font-medium mb-1 text-xl lg:text-2xl sm:mb-2 lg:mb-3 text-neutral-900 dark:text-neutral-100">
          Answered
        </h2>
      </header>

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
        {faq.map((item) => (
          <li key={item.q}>
            <details className="group">
              <summary className="flex items-start justify-between gap-4 py-4 cursor-pointer list-none">
                <span className="text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100 group-open:text-neutral-600 dark:group-open:text-neutral-300 transition-colors">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="mt-1 flex-shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 group-open:rotate-45 select-none"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M9 3v12M3 9h12" />
                  </svg>
                </span>
              </summary>
              <p className="pb-5 pr-10 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                {item.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
