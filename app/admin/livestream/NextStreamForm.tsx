"use client";

import { useState } from "react";
import type { AdminState } from "../../lib/livestream";
import {
  Card,
  Notice,
  inputClass,
  labelClass,
  stackGap,
  textBody,
  textHelper,
  helperClass,
  checkRowClass,
  checkboxClass,
  primaryButtonClass,
  sendJson,
  type Message,
} from "./ui";

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function toLocalInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDisplay(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function NextStreamForm({
  settings,
  schedule,
  onSaved,
}: {
  settings: AdminState["settings"];
  schedule: string | null;
  onSaved: () => void;
}) {
  const [currentSchedule, setCurrentSchedule] = useState(schedule);
  const [nextStream, setNextStream] = useState(schedule ? toLocalInput(schedule) : "");
  const [title, setTitle] = useState(settings.title);
  const [description, setDescription] = useState(settings.description);
  const [notify, setNotify] = useState(settings.notify);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const preview = thumbnail ?? settings.thumbnailUrl;

  const pickThumbnail = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMessage({ type: "error", text: "Thumbnail must be a JPG or PNG" });
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setMessage({ type: "error", text: "Thumbnail must be under 2 MB" });
      return;
    }
    setMessage(null);
    setThumbnail(await readDataUrl(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const iso = new Date(nextStream).toISOString();
      const schedulePost = await sendJson<{ nextStream?: string }>("/api/livestream", "POST", {
        nextStream: iso,
      });
      setCurrentSchedule(schedulePost.nextStream || iso);
      const result = await sendJson<{ youtube: boolean }>("/api/admin/livestream", "POST", {
        nextStream: iso,
        title,
        description,
        notify,
        thumbnail,
      });
      setThumbnail(null);
      onSaved();
      setMessage({
        type: "success",
        text: result.youtube
          ? "Schedule and YouTube broadcast updated!"
          : "Schedule updated! Connect YouTube main to create the broadcast.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to save: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Next stream">
      <form onSubmit={handleSubmit} className={`[container-type:inline-size] ${stackGap}`}>
        {currentSchedule && (
          <p className={`-mt-2 ${textHelper} text-neutral-500 dark:text-neutral-400`}>
            Scheduled for {formatDisplay(currentSchedule)}
          </p>
        )}

        <div>
          <label htmlFor="nextStream" className={labelClass}>
            Date and time
          </label>
          <input
            type="datetime-local"
            id="nextStream"
            value={nextStream}
            onChange={(e) => setNextStream(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="streamTitle" className={labelClass}>
            Title
          </label>
          <input
            id="streamTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Live"
            maxLength={100}
            className={inputClass}
          />
          <p className={`${helperClass} mt-1`}>Also names the Rehearsal broadcast.</p>
        </div>

        <div>
          <label htmlFor="streamDescription" className={labelClass}>
            Description
          </label>
          <textarea
            id="streamDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="streamThumbnail" className={labelClass}>
            Thumbnail
          </label>
          <div className="flex items-start gap-3">
            {preview && (
              <img
                src={preview}
                alt="Thumbnail preview"
                className="w-40 shrink-0 aspect-video object-cover rounded bg-neutral-100 dark:bg-neutral-800"
              />
            )}
            <div className="min-w-0 flex-1">
              <input
                id="streamThumbnail"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => pickThumbnail(e.target.files?.[0])}
                className="block w-full text-base [@media(min-width:1600px)_and_(min-height:900px)]:text-lg text-neutral-700 dark:text-neutral-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-neutral-300 dark:file:border-neutral-600 file:bg-transparent file:text-neutral-700 dark:file:text-neutral-300"
              />
              <p className={`${helperClass} mt-1`}>
                JPG or PNG, under 2 MB. Reused until you replace it.
              </p>
            </div>
          </div>
        </div>

        <label className={`${checkRowClass} items-start`}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className={`mt-1 ${checkboxClass}`}
          />
          <span>
            <span className={`block ${textBody} text-neutral-900 dark:text-white`}>
              Email subscribers when I go live
            </span>
            <span className={helperClass}>Sent once per stream, when the live path starts.</span>
          </span>
        </label>

        {message && <Notice message={message} />}

        <button
          type="submit"
          disabled={saving || !nextStream}
          className={`w-full [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:w-auto ${primaryButtonClass}`}
        >
          {saving ? "Saving..." : "Update schedule"}
        </button>
      </form>
    </Card>
  );
}
