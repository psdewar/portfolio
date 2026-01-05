"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePostHog } from "posthog-js/react";

// Strip HTML tags from message body
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;
const WS_URL = OWNCAST_URL?.replace("https://", "wss://").replace(
  "http://",
  "ws://",
);

// Use proxy routes to avoid CORS
const API_BASE = "/api/live/chat";

interface ChatMessage {
  id: string;
  author: string;
  body: string;
  timestamp: Date;
  type: "chat" | "system";
}

interface Viewer {
  id: string;
  displayName: string;
  createdAt: Date;
}

interface LiveChatProps {
  commenterName: string | null;
  onRequestSignIn: () => void;
  isFloating?: boolean;
}

export default function LiveChat({
  commenterName,
  onRequestSignIn,
  isFloating = true,
}: LiveChatProps) {
  const posthog = usePostHog();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showViewerList, setShowViewerList] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSendTime, setLastSendTime] = useState(0);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const floatingScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const registerViewer = useCallback(async () => {
    if (!commenterName) return;

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: commenterName }),
      });
      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem("owncastAccessToken", data.accessToken);
      }
    } catch (err) {
      console.error("[LiveChat] Failed to register:", err);
    }
  }, [commenterName]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (Array.isArray(data)) {
        const historyMessages: ChatMessage[] = data.map((msg) => ({
          id: msg.id,
          author: msg.user?.displayName || "Anonymous",
          body: msg.body,
          timestamp: new Date(msg.timestamp),
          type: "chat" as const,
        }));
        // Deduplicate by ID when merging with existing messages
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = historyMessages.filter(
            (m) => !existingIds.has(m.id),
          );
          return [...newMessages, ...prev].slice(-100);
        });
      }
    } catch (err) {
      console.error("[LiveChat] Failed to load history:", err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!WS_URL || !accessToken) return;

    const ws = new WebSocket(`${WS_URL}/ws?accessToken=${accessToken}`);

    ws.onopen = () => {
      console.log("[LiveChat] Connected to Owncast");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "CHAT":
            const newMessage: ChatMessage = {
              id: data.id || Date.now().toString(),
              author: data.user?.displayName || "Anonymous",
              body: data.body,
              timestamp: new Date(data.timestamp || Date.now()),
              type: "chat",
            };
            setMessages((prev) => {
              // Deduplicate by ID
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev.slice(-100), newMessage];
            });
            break;

          case "USER_JOINED":
            const newViewer: Viewer = {
              id: data.user?.id || Date.now().toString(),
              displayName: data.user?.displayName || "Anonymous",
              createdAt: new Date(),
            };
            setViewers((prev) => {
              if (prev.find((v) => v.id === newViewer.id)) return prev;
              return [...prev, newViewer];
            });
            setMessages((prev) => [
              ...prev.slice(-100),
              {
                id: `system-${Date.now()}`,
                author: "",
                body: `${newViewer.displayName} joined`,
                timestamp: new Date(),
                type: "system",
              },
            ]);
            break;

          case "USER_PARTED":
            setViewers((prev) => prev.filter((u) => u.id !== data.user?.id));
            break;
        }
      } catch (err) {
        console.error("[LiveChat] Failed to parse message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[LiveChat] Disconnected");
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error("[LiveChat] WebSocket error:", err);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [accessToken]);

  useEffect(() => {
    const savedToken = localStorage.getItem("owncastAccessToken");
    if (savedToken) {
      setAccessToken(savedToken);
    } else if (commenterName) {
      registerViewer();
    }
    loadHistory();
  }, [commenterName, registerViewer, loadHistory]);

  useEffect(() => {
    if (accessToken) {
      const cleanup = connectWebSocket();
      return cleanup;
    }
  }, [accessToken, connectWebSocket]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    // Client-side rate limiting (only block rapid spam)
    const now = Date.now();
    if (now - lastSendTime < 500) {
      setSendError("Slow down!");
      setTimeout(() => setSendError(null), 2000);
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setSendError("Not connected");
      setTimeout(() => setSendError(null), 2000);
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "CHAT",
          body: inputValue.trim(),
        }),
      );
      setInputValue("");
      setLastSendTime(now);

      // Track first chat message
      if (!hasSentFirstMessage) {
        posthog?.capture("chat_message_sent", { is_first_message: true });
        setHasSentFirstMessage(true);
      }
    } catch {
      setSendError("Failed to send");
      setTimeout(() => setSendError(null), 2000);
    }
  };

  // Track previous message count for new message detection
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll floating messages when new messages arrive (if at bottom)
  useEffect(() => {
    if (!isFloating || !floatingScrollRef.current) return;

    const el = floatingScrollRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    const hasNewMessages = messages.length > prevMessageCountRef.current;

    if (hasNewMessages) {
      if (isAtBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      } else {
        // Viewer is scrolled up, increment new message counter
        setNewMessageCount(
          (prev) => prev + (messages.length - prevMessageCountRef.current),
        );
      }
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, isFloating]);

  const ViewerListPanel = () => {
    if (!showViewerList) return null;

    return (
      <div className="absolute bottom-20 right-3 w-48 bg-neutral-900/95 backdrop-blur rounded-xl p-3 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">
            Viewers ({viewers.length})
          </span>
          <button
            onClick={() => setShowViewerList(false)}
            className="text-neutral-500 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {viewers.length === 0 ? (
          <p className="text-neutral-500 text-xs">No viewers yet</p>
        ) : (
          <div className="space-y-1">
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center gap-2 text-sm text-white/80"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {viewer.displayName}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isFloating) {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Connection Status */}
          {!isConnected && (
            <div className="absolute top-3 left-3 bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full">
              Connecting...
            </div>
          )}

          {/* Floating Messages with beautiful fading shadow */}
          <div className="absolute bottom-24 left-0 right-0 px-4 pointer-events-auto">
            <div
              ref={floatingScrollRef}
              className="max-h-48 overflow-y-auto scrollbar-hide"
              style={
                isScrolledUp
                  ? {}
                  : {
                      maskImage:
                        "linear-gradient(to bottom, transparent 0%, black 15%, black 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0%, black 15%, black 100%)",
                    }
              }
              onScroll={(e) => {
                const el = e.currentTarget;
                const isAtBottom =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 20;
                setIsScrolledUp(!isAtBottom);
                if (isAtBottom) setNewMessageCount(0);
              }}
            >
              <div className="flex flex-col gap-0.5">
                {messages
                  .filter((m) => m.type === "chat")
                  .map((msg, index, arr) => (
                    <div
                      key={msg.id}
                      style={{
                        // Full opacity when scrolled up, gradual fade when at bottom
                        opacity: isScrolledUp
                          ? 1
                          : 0.7 + (index / arr.length) * 0.3,
                      }}
                    >
                      <div
                        className="inline-block rounded-xl px-2.5 py-1 max-w-[85%]"
                        style={{
                          background: "transparent",
                          textShadow:
                            "0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)",
                        }}
                      >
                        <span className="font-semibold text-white text-sm">
                          {msg.author}
                        </span>
                        <span className="text-white text-sm ml-2">
                          {stripHtml(msg.body)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            {/* Jump to latest / New messages - floating toast button */}
            {isScrolledUp && (
              <button
                onClick={() => {
                  floatingScrollRef.current?.scrollTo({
                    top: floatingScrollRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                  setNewMessageCount(0);
                  setIsScrolledUp(false);
                }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
              >
                {newMessageCount > 0 ? `${newMessageCount} new ↓` : "↓ Latest"}
              </button>
            )}
          </div>

          <ViewerListPanel />

          {/* Chat Input - inlined to prevent focus loss */}
          {!commenterName ? (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={onRequestSignIn}
                className="w-full py-3 bg-white/10 backdrop-blur rounded-full text-white text-sm font-medium"
              >
                Sign in to chat
              </button>
            </div>
          ) : (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              {/* Send error toast */}
              {sendError && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg animate-pulse">
                  {sendError}
                </div>
              )}
              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Show some love..."
                    className={`flex-1 bg-white/10 backdrop-blur text-white text-sm px-4 py-2.5 rounded-full focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/50 ${
                      sendError ? "ring-1 ring-red-500" : ""
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || !isConnected}
                    className={`p-2.5 rounded-full transition-colors ${
                      sendError ? "bg-red-500" : "bg-blue-500 hover:bg-blue-400"
                    } disabled:opacity-50 disabled:bg-white/10`}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>

                <button
                  onClick={() => setShowViewerList(!showViewerList)}
                  className={`p-2 rounded-full ${showViewerList ? "bg-white/20" : "bg-white/10"}`}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sidebar style (for desktop)
  return (
    <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900">
      <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <span className="font-semibold text-sm">Chat</span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          ) : (
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          )}
          <button
            onClick={() => setShowViewerList(!showViewerList)}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {showViewerList && (
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-200/50 dark:bg-neutral-800/50">
          <p className="text-xs text-neutral-500 mb-2">
            Viewers ({viewers.length})
          </p>
          {viewers.length === 0 ? (
            <p className="text-neutral-500 text-xs">No viewers yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {viewers.map((viewer) => (
                <span
                  key={viewer.id}
                  className="text-xs bg-neutral-300 dark:bg-neutral-700 px-2 py-0.5 rounded-full"
                >
                  {viewer.displayName}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-neutral-500 text-center text-sm">
            No messages yet
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "system" ? (
                <p className="text-neutral-500 text-xs text-center italic">
                  {msg.body}
                </p>
              ) : (
                <div className="text-sm">
                  <span className="font-semibold text-neutral-900 dark:text-white/90">
                    {msg.author}
                  </span>
                  <span className="text-neutral-700 dark:text-white/70 ml-2">
                    {stripHtml(msg.body)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {commenterName ? (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Show some love..."
              className="flex-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || !isConnected}
              className="px-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 rounded-lg"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onRequestSignIn}
            className="w-full py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium"
          >
            Sign in to chat
          </button>
        </div>
      )}
    </div>
  );
}
