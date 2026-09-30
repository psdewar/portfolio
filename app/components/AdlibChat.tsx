"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { EyeSlashIcon, PaperPlaneRightIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import {
  ADLIB_MESSAGE_MAX_LENGTH,
  adlibErrorText,
  nameColorClass,
  type AdlibMessage,
} from "../lib/adlib";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";

export { nameColorClass };

interface Props {
  socket: UseAdlibSocketResult;
  textClassName?: string;
  rowClassName?: string;
  reactionsBar?: ReactNode;
}

const HOST_AVATAR_SRC = "/images/home/bio.jpeg";
const HOST_AVATAR_SCALE = 20 / 560;
const HOST_AVATAR = {
  width: 1534 * HOST_AVATAR_SCALE,
  height: 883 * HOST_AVATAR_SCALE,
  left: -500 * HOST_AVATAR_SCALE,
  top: -70 * HOST_AVATAR_SCALE,
};

const NEAR_BOTTOM_PX = 48;
const SKELETON_ROWS = 8;
const LONG_PRESS_MS = 450;
const TOOLS_VISIBLE_MS = 3000;

const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});
function formatChatTime(ts: number) {
  return CHAT_TIME_FORMATTER.formatToParts(new Date(ts))
    .filter((p) => p.type === "hour" || p.type === "minute" || p.type === "second" || p.value === ":")
    .map((p) => p.value)
    .join("");
}

const HOST_DISPLAY_NAME = "Peyt S.";
export function displayName(message: AdlibMessage): string {
  return message.role === "host" ? HOST_DISPLAY_NAME : message.name;
}

export function SourceLabel({ sub }: { sub: string }) {
  if (!sub.startsWith("youtube:")) return null;
  return <span className="ml-1 text-[11px] font-normal opacity-75">YouTube</span>;
}

export function AdlibChat({
  socket,
  textClassName = "text-sm",
  rowClassName = "py-0.5 leading-snug",
  reactionsBar,
}: Props) {
  const {
    authState,
    identity,
    connected,
    historyLoaded,
    messages,
    error,
    send,
    hide,
    mute,
  } = socket;
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [draft, setDraft] = useState("");
  const prevCount = useRef(messages.length);
  const [activeId, setActiveId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);

  const isHost = identity?.role === "host";
  const signedIn = authState === "signed-in" && !!identity;

  useEffect(() => {
    const added = messages.length - prevCount.current;
    prevCount.current = messages.length;
    if (added <= 0) return;
    const list = listRef.current;
    if (!list) return;
    if (autoScroll) {
      list.scrollTop = list.scrollHeight;
    } else {
      setNewCount((n) => n + added);
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (activeHideTimer.current) clearTimeout(activeHideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!signedIn || !connected || !pendingRef.current) return;
    if (draft.trim() !== pendingRef.current) {
      pendingRef.current = null;
      return;
    }
    const text = pendingRef.current;
    if (send(text)) {
      pendingRef.current = null;
      setDraft("");
    }
  }, [signedIn, connected, send, draft]);

  useEffect(() => {
    if (authState === "signed-out") pendingRef.current = null;
  }, [authState]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
    setAutoScroll(atBottom);
    if (atBottom) setNewCount(0);
  };

  const scrollToBottom = () => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    setAutoScroll(true);
    setNewCount(0);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || text.length > ADLIB_MESSAGE_MAX_LENGTH) return;
    if (send(text)) {
      setDraft("");
      return;
    }
    if (!signedIn) pendingRef.current = text;
  };

  const startLongPress = (id: number) => {
    if (!isHost) return;
    longPressTimer.current = setTimeout(() => {
      setActiveId(id);
      if (activeHideTimer.current) clearTimeout(activeHideTimer.current);
      activeHideTimer.current = setTimeout(() => {
        setActiveId((cur) => (cur === id ? null : cur));
      }, TOOLS_VISIBLE_MS);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const nearLimit = draft.length >= ADLIB_MESSAGE_MAX_LENGTH - 40;

  return (
    <div
      data-adlib-connected={connected}
      className="relative flex h-full min-h-0 flex-col bg-neutral-100 dark:bg-neutral-900"
    >
      <style>{`.chat-row-time { transform: translateY(-1px); }`}</style>
      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`min-h-0 flex-1 overflow-y-auto pl-1 pr-3 py-2 ${messages.length === 0 && historyLoaded ? "flex flex-col" : ""} ${textClassName}`}
      >
        {!historyLoaded ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"
                style={{ width: `${55 + ((i * 13) % 40)}%` }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="flex-1 flex items-center justify-center text-center text-sm text-neutral-400 dark:text-neutral-600">
            No messages yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {messages.map((m) => (
              <ChatRow
                key={m.id}
                message={m}
                isHost={!!isHost}
                isSelf={identity?.sub === m.sub}
                active={activeId === m.id}
                rowClassName={rowClassName}
                onHoverStart={() => isHost && setActiveId(m.id)}
                onHoverEnd={() => isHost && setActiveId((cur) => (cur === m.id ? null : cur))}
                onTouchStart={() => startLongPress(m.id)}
                onTouchEnd={cancelLongPress}
                onHide={() => hide(m.id)}
                onMute={() => mute(m.sub)}
              />
            ))}
          </ul>
        )}
      </div>

      {newCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-neutral-900"
        >
          {newCount} new message{newCount > 1 ? "s" : ""}
        </button>
      )}

      {reactionsBar && <div className="shrink-0 px-1 pt-1">{reactionsBar}</div>}

      <div
        className={`shrink-0 p-2 ${reactionsBar ? "" : "border-t border-neutral-200 dark:border-neutral-800"}`}
      >
        {authState === "loading" ? (
          <div className="h-9 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, ADLIB_MESSAGE_MAX_LENGTH))}
                placeholder="Send a message"
                maxLength={ADLIB_MESSAGE_MAX_LENGTH}
                className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-[16px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-neutral-600"
              />
              <button
                type="submit"
                disabled={!draft.trim() || !connected}
                title={!connected ? "Reconnecting..." : undefined}
                aria-label="Send"
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              >
                <PaperPlaneRightIcon weight="fill" size={18} />
              </button>
            </div>
            <div className="flex min-h-[1rem] items-center justify-between px-1">
              <p className="text-xs text-red-500 dark:text-red-400">
                {error ? adlibErrorText(error) : ""}
              </p>
              {nearLimit && (
                <p className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                  {draft.length}/{ADLIB_MESSAGE_MAX_LENGTH}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ChatRow({
  message,
  isHost,
  isSelf,
  active,
  rowClassName,
  onHoverStart,
  onHoverEnd,
  onTouchStart,
  onTouchEnd,
  onHide,
  onMute,
}: {
  message: AdlibMessage;
  isHost: boolean;
  isSelf: boolean;
  active: boolean;
  rowClassName: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onHide: () => void;
  onMute: () => void;
}) {
  const canModerate = isHost && !isSelf;

  return (
    <li
      className={`group flex items-baseline gap-1 rounded px-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${rowClassName}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <span className="min-w-0 flex-1 break-words">
        <span
          className="chat-row-time mr-1 text-[11px] leading-snug tabular-nums text-neutral-400 dark:text-neutral-500"
          title={new Date(message.ts).toLocaleString()}
          suppressHydrationWarning
        >
          {formatChatTime(message.ts)}
        </span>
        {message.role === "host" && (
          <span className="relative mr-1 inline-block h-5 w-5 shrink-0 overflow-hidden rounded-full align-middle">
            <Image
              src={HOST_AVATAR_SRC}
              alt=""
              width={HOST_AVATAR.width}
              height={HOST_AVATAR.height}
              className="absolute"
              style={{
                width: `${HOST_AVATAR.width}px`,
                height: `${HOST_AVATAR.height}px`,
                maxWidth: "none",
                left: `${HOST_AVATAR.left}px`,
                top: `${HOST_AVATAR.top}px`,
              }}
            />
          </span>
        )}
        <span className={`chat-row-name font-semibold ${nameColorClass(message.sub)}`}>{displayName(message)}</span>
        <SourceLabel sub={message.sub} />
        <span className="text-neutral-500 dark:text-neutral-400">: </span>
        <span className="text-neutral-900 dark:text-neutral-100">{message.text}</span>
      </span>

      {canModerate && (
        <div className={`flex shrink-0 self-center gap-1 ${active ? "visible" : "invisible group-hover:visible"}`}>
          <button
            onClick={onHide}
            aria-label="Hide message"
            className="rounded p-1 -my-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          >
            <EyeSlashIcon size={14} />
          </button>
          <button
            onClick={onMute}
            aria-label="Mute user"
            className="rounded p-1 -my-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          >
            <SpeakerSlashIcon size={14} />
          </button>
        </div>
      )}
    </li>
  );
}
