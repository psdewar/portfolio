"use client";

import { useState, type FormEvent } from "react";
import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { nameColorClass, displayName, SourceLabel } from "./AdlibChat";
import { AdlibReactionButtons } from "./AdlibReactions";
import { FundPill } from "./FundPill";
import { ADLIB_MESSAGE_MAX_LENGTH, adlibErrorText } from "../lib/adlib";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";

export function AdlibChatOverlay({
  socket,
  onOpenSupport,
  desktopFullscreen = false,
}: {
  socket: UseAdlibSocketResult;
  onOpenSupport: () => void;
  desktopFullscreen?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const needsSignIn = socket.authState === "signed-out" || socket.authState === "needs-name";
  const recentMessages = socket.messages.slice(-5);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || text.length > ADLIB_MESSAGE_MAX_LENGTH) return;
    if (socket.send(text)) setDraft("");
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col justify-end">
      <ul
        className={`pointer-events-none flex flex-col gap-0.5 px-3 pb-2 [mask-image:linear-gradient(to_bottom,transparent,black_28%)] ${
          desktopFullscreen ? "max-w-[520px]" : ""
        }`}
      >
        {recentMessages.map((message) => (
          <li
            key={message.id}
            className="line-clamp-2 max-w-[75%] break-words text-[15px] leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,.9),0_0_6px_rgba(0,0,0,.6)]"
          >
            <span className={`font-semibold ${nameColorClass(message.sub)}`}>{displayName(message)}</span>
            <SourceLabel sub={message.sub} />{" "}
            {message.text}
          </li>
        ))}
      </ul>

      {socket.error && (
        <p className="px-3 pb-1 text-xs text-red-300">{adlibErrorText(socket.error)}</p>
      )}

      <form
        onSubmit={submit}
        className={`pointer-events-auto flex flex-col-reverse gap-2 px-3 pb-3 pt-1 ${
          desktopFullscreen ? "max-w-[520px]" : "min-[600px]:flex-row min-[600px]:items-center"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 min-[600px]:flex-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, ADLIB_MESSAGE_MAX_LENGTH))}
            onFocus={() => {
              if (needsSignIn) socket.requestSignIn();
            }}
            readOnly={needsSignIn}
            placeholder="Send a message"
            maxLength={ADLIB_MESSAGE_MAX_LENGTH}
            className="h-11 min-w-0 flex-1 rounded-full bg-black/40 px-4 text-[16px] text-white placeholder:text-white/70 backdrop-blur pointer-events-auto focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 disabled:opacity-40"
          >
            <PaperPlaneRightIcon weight="fill" size={18} />
          </button>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <AdlibReactionButtons
            onReact={socket.react}
            variant="overlay"
            action={<FundPill onClick={onOpenSupport} tone="overlay" />}
          />
        </div>
      </form>
    </div>
  );
}
