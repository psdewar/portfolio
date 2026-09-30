"use client";

import { useState } from "react";
import type { InstagramKind } from "../../lib/livestream";
import {
  InstagramMark,
  audienceSlotClass,
  destRowClass,
  textBody,
  textHelper,
  Notice,
  helperClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sendJson,
  type Message,
} from "./ui";

const TTL_MINUTES = 5 * 60;

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const minutes = total % 60;
  return minutes ? `${Math.floor(total / 60)}h ${minutes} min` : `${Math.floor(total / 60)}h`;
}

function savedLabel(savedAt: string | null, now: number) {
  if (!savedAt) return "Not saved";
  const age = Math.max(0, Math.floor((now - new Date(savedAt).getTime()) / 60000));
  const left = TTL_MINUTES - age;
  const expiry =
    left <= 0 ? "expired" : `expires in about ${Math.max(1, Math.round(left / 60))}h`;
  return `Saved ${formatMinutes(age)} ago, ${expiry}`;
}

export default function InstagramBlock({
  kind,
  savedAt,
  now,
  onSaved,
}: {
  kind: InstagramKind;
  savedAt: string | null;
  now: number;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const run = async (action: () => Promise<unknown>, failure: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      after?.();
      onSaved();
    } catch (error) {
      setMessage({
        type: "error",
        text: `${failure}: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => sendJson("/api/admin/livestream/instagram", "POST", { kind, url, key }),
      "Failed to save",
      () => {
        setUrl("");
        setKey("");
      },
    );
  };

  const audience = kind === "public" ? "Public" : "Practice";

  const clear = () =>
    run(
      () => sendJson(`/api/admin/livestream/instagram?kind=${kind}`, "DELETE"),
      "Failed to clear",
    );

  return (
    <form onSubmit={save} className="space-y-3">
      <div className={destRowClass}>
        <InstagramMark />
        <div className={audienceSlotClass}>
          <p className={`${textBody} text-neutral-900 dark:text-white`}>{audience}</p>
        </div>
        <p className={`${textHelper} flex-1 min-w-0 truncate text-neutral-600 dark:text-neutral-400`}>
          {savedLabel(savedAt, now)}
        </p>
      </div>
      <div>
        <label htmlFor={`ig-url-${kind}`} className={labelClass}>
          Stream URL
        </label>
        <input
          id={`ig-url-${kind}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="rtmps://"
          autoComplete="off"
          required
          className={inputClass}
        />
        <p className={`${helperClass} mt-1`}>
          Choose {audience} in Live Producer before copying the key
        </p>
      </div>
      <div>
        <label htmlFor={`ig-key-${kind}`} className={labelClass}>
          Stream key
        </label>
        <input
          id={`ig-key-${kind}`}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          required
          className={inputClass}
        />
      </div>
      {message && <Notice message={message} />}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !url || !key} className={`flex-1 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-none ${primaryButtonClass}`}>
          Save
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={busy || !savedAt}
          className={secondaryButtonClass}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
