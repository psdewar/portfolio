"use client";

import type { ReactNode } from "react";
import { ADLIB_REACTIONS, type AdlibFloatingReaction } from "../lib/adlib";

export function AdlibReactionButtons({
  onReact,
  variant = "overlay",
  action,
}: {
  onReact: (emoji: string) => void;
  variant?: "overlay" | "panel";
  action?: ReactNode;
}) {
  const emojiClass =
    variant === "overlay"
      ? "h-10 w-10 flex items-center justify-center text-[22px] leading-none transition-transform hover:scale-110 active:scale-90 drop-shadow-lg"
      : "h-10 w-9 flex items-center justify-center text-[22px] leading-none transition-transform hover:scale-110 active:scale-90";
  return (
    <div className={`flex items-center gap-0.5 ${action ? "w-full" : ""}`}>
      {ADLIB_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className={emojiClass}
        >
          {emoji}
        </button>
      ))}
      {action && <div className="ml-auto pl-2">{action}</div>}
    </div>
  );
}

interface Props {
  floating: AdlibFloatingReaction[];
  onReact: (emoji: string) => void;
  hideButtons?: boolean;
}

export function AdlibReactions({ floating, onReact, hideButtons = false }: Props) {
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
          <AdlibReactionButtons onReact={onReact} />
        </div>
      )}
    </div>
  );
}
