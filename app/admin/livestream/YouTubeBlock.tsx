"use client";

import { useState } from "react";
import type { AdminState } from "../../lib/livestream";
import {
  Notice,
  YouTubeMark,
  audienceSlotClass,
  destRowClass,
  inputClass,
  secondaryButtonClass,
  sendJson,
  textBody,
  textHelper,
  type Message,
} from "./ui";

export default function YouTubeBlock({
  account,
  channel,
  settings,
  onSaved,
}: {
  account: keyof AdminState["channels"];
  channel: string | null;
  settings: AdminState["settings"];
  onSaved: () => void;
}) {
  const [privacy, setPrivacy] = useState(settings.privacy);
  const [message, setMessage] = useState<Message | null>(null);

  const changePrivacy = async (value: typeof privacy) => {
    const previous = privacy;
    setPrivacy(value);
    setMessage(null);
    try {
      await sendJson("/api/admin/livestream/defaults", "POST", {
        privacy: value,
      });
      onSaved();
    } catch (error) {
      setPrivacy(previous);
      setMessage({
        type: "error",
        text: `Failed to save privacy: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className={destRowClass}>
        <YouTubeMark />
        <div className={audienceSlotClass}>
          {account === "main" ? (
            <select
              aria-label="YouTube privacy"
              value={privacy}
              onChange={(e) => changePrivacy(e.target.value as typeof privacy)}
              className={inputClass}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          ) : (
            <p className={`${textBody} text-neutral-900 dark:text-white`}>Private</p>
          )}
        </div>
        <p className={`${textHelper} flex-1 min-w-0 truncate text-neutral-600 dark:text-neutral-400`}>
          {channel ?? "Not connected"}
        </p>
        {account === "main" && (
          <a href="/api/admin/youtube/connect" className={`shrink-0 ${secondaryButtonClass}`}>
            {channel ? "Switch account" : "Connect"}
          </a>
        )}
      </div>
      {message && <Notice message={message} />}
    </div>
  );
}
