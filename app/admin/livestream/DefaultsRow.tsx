"use client";

import { useState } from "react";
import type { AdminState } from "../../lib/livestream";
import {
  Notice,
  YouTubeMark,
  brandRowClass,
  checkRowClass,
  checkboxClass,
  defaultsChecksClass,
  defaultsRowClass,
  textBody,
  helperClass,
  sectionLabel,
  sendJson,
  type Message,
} from "./ui";

const DEFAULTS = [
  { id: "embeddable", label: "Allow embedding" },
  { id: "dvr", label: "Enable DVR" },
  { id: "madeForKids", label: "Made for kids" },
] as const;

export default function DefaultsRow({
  settings,
  onSaved,
}: {
  settings: AdminState["settings"];
  onSaved: () => void;
}) {
  const [message, setMessage] = useState<Message | null>(null);

  const toggle = async (id: (typeof DEFAULTS)[number]["id"], value: boolean) => {
    setMessage(null);
    try {
      await sendJson("/api/admin/livestream/defaults", "POST", {
        [id]: value,
      });
      onSaved();
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to save defaults: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  };

  return (
    <div className={defaultsRowClass}>
      <div className={brandRowClass}>
        <YouTubeMark />
        <p className={sectionLabel}>Defaults for both broadcasts</p>
      </div>
      <div className={defaultsChecksClass}>
        {DEFAULTS.map(({ id, label }) => (
          <label key={id} className={checkRowClass}>
            <input
              type="checkbox"
              checked={settings[id]}
              onChange={(e) => toggle(id, e.target.checked)}
              className={checkboxClass}
            />
            <span className={`${textBody} text-neutral-900 dark:text-white`}>{label}</span>
          </label>
        ))}
      </div>
      <p className={helperClass}>Apply to Live and Rehearsal.</p>
      {message && <Notice message={message} />}
    </div>
  );
}
