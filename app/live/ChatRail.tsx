"use client";

import { useRef } from "react";
import { STORY } from "../data/story";
import { AdlibChat } from "../components/AdlibChat";
import { AdlibReactionButtons } from "../components/AdlibReactions";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { chatToggleIcon } from "./Stage";
import { CHAT_RAIL_MIN_PX, RAIL_WIDTH_CSS } from "./useLiveLayout";
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
    <div className={`p-4 space-y-3 [container-type:inline-size] ${className}`}>
      <h3 className={`text-lg font-semibold leading-tight ${headingClass}`}>My story</h3>
      {STORY.map((paragraph, i) => (
        <p key={i} className={`max-w-[68ch] text-base leading-relaxed [@container(min-width:520px)]:text-lg ${bodyClass}`}>
          {paragraph}
        </p>
      ))}
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
  const hideChatIconRef = useRef<HTMLSpanElement>(null);
  const { open: hideChatOpen, bind: hideChatBind } = useHoverTip();
  return (
    <div
      data-live-rail
      className="relative z-10 shrink-0 h-full bg-neutral-100 dark:bg-neutral-900 flex flex-col overflow-hidden shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.18)] dark:shadow-[-16px_0_24px_-6px_rgba(0,0,0,0.55)]"
      style={{ width: RAIL_WIDTH_CSS }}
    >
      <div className="shrink-0 h-11 flex items-center px-1">
        <button
          type="button"
          onClick={onHideChat}
          aria-label="Hide chat"
          aria-expanded={true}
          className="p-2.5 flex items-center justify-center text-neutral-900 dark:text-white hover:opacity-70 transition-opacity"
          {...hideChatBind}
        >
          <span ref={hideChatIconRef} className="inline-flex">
            {chatToggleIcon(false, false)}
          </span>
        </button>
      </div>
      <HoverTip open={hideChatOpen} anchorRef={hideChatIconRef} label="Collapse" side="right" />
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
      className="relative z-10 h-full flex-1 min-w-0 bg-neutral-50 dark:bg-black overflow-y-auto"
      style={{ minWidth: CHAT_RAIL_MIN_PX }}
    >
      <StoryColumn />
    </div>
  );
}
