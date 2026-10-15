"use client";

import { useState } from "react";
import type { AdminState } from "../../lib/livestream";
import {
  Notice,
  helperClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sendJson,
  type Message,
} from "./ui";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function FacebookConnect({
  facebook,
  onSaved,
}: {
  facebook: AdminState["facebook"];
  onSaved: () => void;
}) {
  const [token, setToken] = useState("");
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
      () => sendJson("/api/admin/livestream/facebook", "POST", { token }),
      "Failed to connect",
      () => {
        setToken("");
        setEditing(false);
      },
    );
  };

  const disconnect = () =>
    run(() => sendJson("/api/admin/livestream/facebook", "DELETE"), "Failed to disconnect");

  const showInput = !facebook || editing;

  return (
    <form onSubmit={save} className="space-y-3">
      {facebook ? (
        <p className={helperClass}>
          Connected as {facebook.userName}
          {facebook.expiresAt ? `, token expires ${formatDate(facebook.expiresAt)}` : ""}
        </p>
      ) : (
        <p className={helperClass}>Graph API Explorer, app social-mcp, permission publish_video.</p>
      )}
      {showInput && (
        <div>
          <label htmlFor="facebook-token" className={labelClass}>
            Access token
          </label>
          <input
            id="facebook-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            required
            autoFocus={editing}
            className={inputClass}
          />
        </div>
      )}
      {message && <Notice message={message} />}
      <div className="flex gap-2">
        {showInput ? (
          <button key="save" type="submit" disabled={busy || !token} className={primaryButtonClass}>
            Save
          </button>
        ) : (
          <button key="replace" type="button" onClick={() => setEditing(true)} className={primaryButtonClass}>
            Replace token
          </button>
        )}
        {showInput && facebook ? (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setToken("");
            }}
            disabled={busy}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        ) : facebook ? (
          <button type="button" onClick={disconnect} disabled={busy} className={secondaryButtonClass}>
            Disconnect
          </button>
        ) : null}
      </div>
    </form>
  );
}
