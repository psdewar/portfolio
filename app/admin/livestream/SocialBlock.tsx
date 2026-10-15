"use client";

import { useState } from "react";
import {
  SOCIAL_TTL_MS,
  isSocialFresh,
  type SocialDestinationState,
  type SocialKind,
  type SocialPlatform,
} from "../../lib/social-destinations";
import { FACEBOOK_AUTO_STEPS, MANUAL_STEPS } from "./steps";
import {
  FacebookMark,
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

const MARKS = { instagram: InstagramMark, facebook: FacebookMark };

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const minutes = total % 60;
  return minutes ? `${Math.floor(total / 60)}h ${minutes} min` : `${Math.floor(total / 60)}h`;
}

function savedLabel(platform: SocialPlatform, saved: SocialDestinationState | null, now: number) {
  if (!saved) return "Not saved";
  const age = Math.max(0, Math.floor((now - new Date(saved.savedAt).getTime()) / 60000));
  const ttl = SOCIAL_TTL_MS[platform];
  const tail = `key ending ${saved.tail}`;
  if (ttl === null) return `Saved ${formatMinutes(age)} ago, ${tail}`;
  const left = ttl / 60000 - age;
  const expiry = left <= 0 ? "expired" : `expires in about ${Math.max(1, Math.round(left / 60))}h`;
  return `Saved ${formatMinutes(age)} ago, ${tail}, ${expiry}`;
}

export default function SocialBlock({
  platform,
  kind,
  saved,
  now,
  autoCreated,
  onSaved,
}: {
  platform: SocialPlatform;
  autoCreated: boolean;
  kind: SocialKind;
  saved: SocialDestinationState | null;
  now: number;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const Mark = MARKS[platform];
  const manualUrl = platform === "instagram";
  const [editing, setEditing] = useState(false);
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
      () => sendJson("/api/admin/livestream/social", "POST", { platform, kind, url, key }),
      "Failed to save",
      () => {
        setUrl("");
        setKey("");
        setEditing(false);
      },
    );
  };

  const fresh = saved !== null && isSocialFresh(platform, saved.savedAt, now);
  const showInputs = !fresh || editing;
  const audience = kind === "public" ? "Public" : "Practice";

  const clear = () =>
    run(
      () => sendJson(`/api/admin/livestream/social?platform=${platform}&kind=${kind}`, "DELETE"),
      "Failed to clear",
    );

  return (
    <form onSubmit={save} className="space-y-3">
      <div className={destRowClass}>
        <Mark />
        <div className={audienceSlotClass}>
          <p className={`${textBody} text-neutral-900 dark:text-white`}>{audience}</p>
        </div>
        <p className={`${textHelper} flex-1 min-w-0 truncate text-neutral-600 dark:text-neutral-400`}>
          {savedLabel(platform, saved, now)}
        </p>
      </div>
      <p className={helperClass}>{autoCreated ? FACEBOOK_AUTO_STEPS[kind] : MANUAL_STEPS[platform][kind]}</p>
      {showInputs && (
        <>
        {manualUrl && (
          <div>
            <label htmlFor={`${platform}-url-${kind}`} className={labelClass}>
              Stream URL
            </label>
            <input
              id={`${platform}-url-${kind}`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="rtmps://"
              autoComplete="off"
              required
              autoFocus={editing}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor={`${platform}-key-${kind}`} className={labelClass}>
            {manualUrl ? "Stream key" : "Stream key or ingest URL"}
          </label>
          <input
            id={`${platform}-key-${kind}`}
            type="password"
            placeholder={manualUrl ? undefined : "FB-..."}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            required
            autoFocus={editing && !manualUrl}
            className={inputClass}
          />
        </div>
        </>
      )}
      {message && <Notice message={message} />}
      <div className="flex gap-2">
        {showInputs ? (
          <button key="save" type="submit" disabled={busy || (manualUrl && !url) || !key} className={`flex-1 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-none ${primaryButtonClass}`}>
            Save
          </button>
        ) : (
          <button key="replace" type="button" onClick={() => setEditing(true)} className={`flex-1 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-none ${primaryButtonClass}`}>
            Replace key
          </button>
        )}
        {showInputs && fresh ? (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setUrl("");
              setKey("");
            }}
            disabled={busy}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={clear}
            disabled={busy || !saved}
            className={secondaryButtonClass}
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
