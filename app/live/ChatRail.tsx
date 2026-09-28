"use client";

import { useRef } from "react";
import { STORY } from "../data/story";
import { AdlibChat } from "../components/AdlibChat";
import { AdlibReactionButtons } from "../components/AdlibReactions";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { chatToggleIcon } from "./Stage";
import { CHAT_RAIL_MIN_PX } from "./useLiveLayout";
import { HoverTip, useHoverTip } from "./HoverTip";

export function StoryColumn({
  className = "",
  tone = "auto",
}: {
  className?: string;
  tone?: "auto" | "dark";
}) {
  const headingClass = tone === "dark" ? "text-white" : "text-neutral-900 dark:text-white";
  const bodyClass = tone === "dark" ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-400";
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      <h3 className={`text-lg font-semibold leading-tight ${headingClass}`}>My story</h3>
      {STORY.map((paragraph, i) => (
        <p key={i} className={`text-base leading-relaxed ${bodyClass}`}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function PortraitChatRail({ adlib }: { adlib: UseAdlibSocketResult }) {
  return (
    <div
      data-live-rail
      className="relative z-10 shrink-0 h-full bg-neutral-100 dark:bg-neutral-900 flex flex-col overflow-hidden shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.18)] dark:shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.55)]"
      style={{ width: "clamp(288px, 26%, 380px)" }}
    >
      <AdlibChat
        socket={adlib}
        textClassName="text-[15px] leading-[1.5]"
        rowClassName="py-1"
        reactionsBar={<AdlibReactionButtons onReact={adlib.react} variant="panel" />}
      />
    </div>
  );
}

export function DesktopChatRail({
  adlib,
  onHideChat,
}: {
  adlib: UseAdlibSocketResult;
  onHideChat: () => void;
}) {
  const hideChatRef = useRef<HTMLButtonElement>(null);
  const { open: hideChatOpen, bind: hideChatBind } = useHoverTip();
  return (
    <div
      data-live-rail
      className="relative z-10 flex-1 min-w-0 h-full bg-neutral-100 dark:bg-neutral-900 flex flex-col overflow-hidden shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.18)] dark:shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.55)]"
      style={{ minWidth: CHAT_RAIL_MIN_PX }}
    >
      <button
        ref={hideChatRef}
        type="button"
        onClick={onHideChat}
        aria-label="Hide chat"
        aria-expanded={true}
        className="absolute top-3 left-3 z-20 p-2.5 flex items-center justify-center text-neutral-900 dark:text-white hover:opacity-70 transition-opacity"
        {...hideChatBind}
      >
        {chatToggleIcon(false, false)}
      </button>
      <HoverTip open={hideChatOpen} anchorRef={hideChatRef} label="Collapse" side="right" />
      <AdlibChat
        socket={adlib}
        textClassName="text-[15px] leading-[1.5]"
        rowClassName="py-1"
        reactionsBar={<AdlibReactionButtons onReact={adlib.react} variant="panel" />}
      />
    </div>
  );
}

export function OfflineStoryRail() {
  return (
    <div
      data-live-rail
      className="relative z-10 flex-1 min-w-0 h-full bg-neutral-50 dark:bg-black overflow-y-auto"
      style={{ minWidth: CHAT_RAIL_MIN_PX }}
    >
      <StoryColumn />
    </div>
  );
}
