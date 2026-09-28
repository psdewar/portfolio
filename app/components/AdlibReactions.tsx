"use client";

import { ADLIB_REACTIONS, type AdlibFloatingReaction } from "../lib/adlib";

export function AdlibReactionButtons({
  onReact,
  onSupport,
  variant = "overlay",
}: {
  onReact: (emoji: string) => void;
  onSupport?: () => void;
  variant?: "overlay" | "panel";
}) {
  const pill =
    variant === "panel"
      ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700"
      : "bg-black/40 text-white backdrop-blur hover:bg-black/60";
  return (
    <div className="flex gap-1.5">
      {onSupport && (
        <button
          type="button"
          onClick={onSupport}
          className={`flex min-h-11 items-center rounded-full px-3 text-sm font-medium transition-colors active:scale-95 ${pill}`}
        >
          Support
        </button>
      )}
      {ADLIB_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition-colors active:scale-90 ${pill}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface Props {
  floating: AdlibFloatingReaction[];
  onReact: (emoji: string) => void;
  onSupport?: () => void;
  hideButtons?: boolean;
}

export function AdlibReactions({ floating, onReact, onSupport, hideButtons = false }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div className="absolute bottom-16 right-4 flex flex-col items-center">
        {floating.map((r) => (
          <span
            key={r.key}
            aria-hidden
            className="absolute bottom-0 text-3xl motion-safe:animate-adlib-float motion-reduce:animate-fade-in"
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {!hideButtons && (
        <div className="pointer-events-auto absolute bottom-3 right-3">
          <AdlibReactionButtons onReact={onReact} onSupport={onSupport} />
        </div>
      )}
    </div>
  );
}
