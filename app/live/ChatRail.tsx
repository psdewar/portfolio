"use client";

import { useRef } from "react";
import { AdlibChat } from "../components/AdlibChat";
import { FundPill } from "../components/FundPill";
import { AdlibReactionButtons } from "../components/AdlibReactions";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { chatToggleIcon } from "./Stage";
import { RAIL_WIDTH_CSS } from "./useLiveLayout";
import { HoverTip, useHoverTip } from "./HoverTip";

export function DesktopChatRail({
  adlib,
  onHideChat,
  onOpenSupport,
}: {
  adlib: UseAdlibSocketResult;
  onHideChat: () => void;
  onOpenSupport: () => void;
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
        reactionsBar={
          <AdlibReactionButtons
            onReact={adlib.react}
            variant="panel"
            action={<FundPill onClick={onOpenSupport} />}
          />
        }
      />
    </div>
  );
}
