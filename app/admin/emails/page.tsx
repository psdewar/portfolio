"use client";

import { useEffect, useMemo, useState } from "react";
import { type Show } from "../../lib/shows";
import { isDatePast, formatMonthDay } from "../../lib/dates";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type EmailImage,
} from "../../../lib/email-image";

type AudienceDetail = Record<string, Array<{ name: string; email: string }>>;

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "peyt2024";
const DRAFT_STORAGE_KEY = "peyt-admin-emails-draft";
const IMAGE_STORAGE_KEY = "peyt-admin-emails-image";

export default function EmailsAdminPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [audience, setAudience] = useState<AudienceDetail>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [image, setImage] = useState<EmailImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const imagePreviewUrl = useMemo(
    () => (image ? `data:${image.type};base64,${image.base64}` : null),
    [image],
  );
  const [status, setStatus] = useState<SendStatus>({ kind: "idle" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.subject === "string") setSubject(draft.subject);
        if (typeof draft.body === "string") setBody(draft.body);
        if (typeof draft.testEmail === "string") setTestEmail(draft.testEmail);
        if (typeof draft.scheduleAt === "string")
          setScheduleAt(draft.scheduleAt);
        if (Array.isArray(draft.selected)) setSelected(new Set(draft.selected));
      }
      const rawImage = localStorage.getItem(IMAGE_STORAGE_KEY);
      if (rawImage) setImage(JSON.parse(rawImage));
    } catch {
      // corrupted draft; start fresh
    }

    Promise.all([
      fetch("/api/shows").then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("shows")),
      ),
      fetch("/api/admin/audience", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`audience ${r.status}`)),
      ),
    ])
      .then(([showsData, audienceData]) => {
        setShows(Array.isArray(showsData) ? showsData : []);
        setAudience(
          audienceData && typeof audienceData === "object" ? audienceData : {},
        );
      })
      .catch((err) => {
        setShows([]);
        setAudience({});
        setStatus({
          kind: "error",
          message: `Failed to load: ${err instanceof Error ? err.message : "unknown"}`,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const draft = {
        subject,
        body,
        testEmail,
        scheduleAt,
        selected: Array.from(selected),
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // skip
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [loading, subject, body, testEmail, scheduleAt, selected]);

  useEffect(() => {
    if (loading) return;
    try {
      if (image) localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(image));
      else localStorage.removeItem(IMAGE_STORAGE_KEY);
    } catch {
      // image too large for localStorage; in-memory only
    }
  }, [loading, image]);

  const pastShows = useMemo(
    () =>
      shows
        .filter((s) => isDatePast(s.date))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [shows],
  );

  const locationGroups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; shows: Show[]; slugs: string[] }
    >();
    for (const show of pastShows) {
      const key = `${show.city}, ${show.region}`;
      if (!map.has(key)) {
        map.set(key, { label: key, shows: [], slugs: [] });
      }
      const group = map.get(key)!;
      group.shows.push(show);
      group.slugs.push(show.slug);
    }
    return Array.from(map.values());
  }, [pastShows]);

  const recipientsBySlug = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const slug of Object.keys(audience)) {
      const set = new Set<string>();
      for (const r of audience[slug] || []) set.add(r.email);
      result.set(slug, set);
    }
    return result;
  }, [audience]);

  function countForSlugs(slugs: string[]): number {
    const seen = new Set<string>();
    for (const slug of slugs) {
      const set = recipientsBySlug.get(slug);
      if (!set) continue;
      for (const email of set) seen.add(email);
    }
    return seen.size;
  }

  const uniqueRecipients = useMemo(
    () => countForSlugs(Array.from(selected)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, recipientsBySlug],
  );

  const selectedLocationCount = useMemo(
    () =>
      locationGroups.filter((g) => g.slugs.every((s) => selected.has(s)))
        .length,
    [locationGroups, selected],
  );

  function isLocationSelected(slugs: string[]): boolean {
    return slugs.length > 0 && slugs.every((s) => selected.has(s));
  }

  function toggleLocation(slugs: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = slugs.every((s) => next.has(s));
      if (allSelected) {
        for (const s of slugs) next.delete(s);
      } else {
        for (const s of slugs) next.add(s);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(pastShows.map((s) => s.slug)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function send(opts: { testOnly: boolean }) {
    if (!subject.trim() || !body.trim()) {
      setStatus({ kind: "error", message: "Subject and body are required." });
      return;
    }
    if (!opts.testOnly && selected.size === 0) {
      setStatus({ kind: "error", message: "Select at least one location." });
      return;
    }

    let sendAtUnix: number | undefined;
    if (scheduleAt) {
      const ms = new Date(scheduleAt).getTime();
      if (Number.isNaN(ms)) {
        setStatus({ kind: "error", message: "Invalid schedule time." });
        return;
      }
      sendAtUnix = Math.floor(ms / 1000);
    }

    if (!opts.testOnly) {
      const when = sendAtUnix
        ? `scheduled for ${new Date(sendAtUnix * 1000).toLocaleString()}`
        : "sent now";
      const ok = window.confirm(
        `Send to ${pluralize(uniqueRecipients, "recipient")} across ${pluralize(selectedLocationCount, "location")}, ${when}?`,
      );
      if (!ok) return;
    }

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": ADMIN_PASSWORD,
        },
        body: JSON.stringify({
          showSlugs: Array.from(selected),
          subject,
          body,
          testOnly: opts.testOnly,
          testEmail: testEmail.trim() || undefined,
          sendAt: sendAtUnix,
          image: image
            ? { ...image, alt: image.alt?.trim() || undefined }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error || "Send failed" });
        return;
      }
      if (data.failed && data.failed > 0) {
        setStatus({
          kind: "error",
          message: `SendGrid rejected: ${data.error || "unknown error"}`,
        });
        return;
      }
      const target = data.test
        ? `test to ${data.target}`
        : `${data.sent} of ${data.count}`;
      const schedule = data.scheduledAt
        ? ` for ${new Date(data.scheduledAt * 1000).toLocaleString()}`
        : "";
      setStatus({
        kind: "success",
        message: `${data.scheduledAt ? "Scheduled" : "Sent"} ${target}${schedule}.`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  async function handleFile(file: File) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setStatus({ kind: "error", message: `Unsupported type: ${file.type}` });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus({ kind: "error", message: "File too large (max 8 MB)." });
      return;
    }

    setUploading(true);
    setStatus({ kind: "idle" });
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",", 2)[1] || "";
      setImage({ base64, type: file.type, filename: file.name, alt: "" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to read file",
      });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 text-sm text-neutral-500">
        Loading shows and recipients...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 pb-96 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Post-concert email
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Compose once, send to attendees of one stop, a leg, or everyone.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Audience
          </h2>
          <div className="flex gap-3 text-xs">
            <button
              onClick={selectAll}
              className="text-[#d4a553] hover:underline"
            >
              Select all
            </button>
            <button
              onClick={selectNone}
              className="text-neutral-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        {locationGroups.length === 0 ? (
          <p className="text-sm text-neutral-500">No past shows yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            {locationGroups.map((group) => {
              const count = countForSlugs(group.slugs);
              const checked = isLocationSelected(group.slugs);
              const dates = group.shows
                .map((s) => formatMonthDay(s.date))
                .join(", ");
              return (
                <li key={group.label}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLocation(group.slugs)}
                      className="accent-[#d4a553]"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{group.label}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 text-sm ml-2">
                        {pluralize(group.shows.length, "show")} · {dates}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {count} contacts
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {selected.size === 0
            ? "No locations selected."
            : `${pluralize(uniqueRecipients, "unique recipient")} across ${pluralize(selectedLocationCount, "location")}.`}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Message
        </h2>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body. Use blank lines to separate paragraphs."
          rows={10}
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553] font-mono text-sm"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Hero image (optional)
        </h2>

        {image && imagePreviewUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
              <img
                src={imagePreviewUrl}
                alt={image.alt || "Preview"}
                className="block w-full max-w-[432px] h-auto mx-auto"
              />
            </div>
            <input
              type="text"
              value={image.alt || ""}
              onChange={(e) => setImage({ ...image, alt: e.target.value })}
              placeholder="Alt text (for accessibility + image-blocked clients)"
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553] text-sm"
            />
            <button
              onClick={() => setImage(null)}
              className="text-xs text-neutral-500 hover:underline"
            >
              Remove image
            </button>
            <p className="text-xs text-neutral-500">
              Type{" "}
              <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                [image]
              </code>{" "}
              anywhere in the body to place the image inline. Without the
              marker, it goes at the top. Renders in Gmail and Apple Mail; some
              Outlook clients show it as a separate attachment.
            </p>
          </div>
        ) : (
          <label className="flex items-center gap-3 px-4 py-6 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-[#d4a553] cursor-pointer text-sm text-neutral-500 dark:text-neutral-400">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
              className="hidden"
            />
            <span>
              {uploading
                ? "Reading file..."
                : "Click to upload an image (JPG, PNG, WebP, GIF — max 8 MB)"}
            </span>
          </label>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Send
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Test email (defaults to psd@lyrist.app)"
            className="flex-1 min-w-[240px] px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553] text-sm"
          />
          <button
            onClick={() => send({ testOnly: true })}
            disabled={status.kind === "sending" || uploading}
            className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm hover:border-[#d4a553] disabled:opacity-50"
          >
            Send test
          </button>
          <button
            onClick={() => send({ testOnly: false })}
            disabled={
              status.kind === "sending" || uploading || selected.size === 0
            }
            className="px-4 py-2 rounded-lg text-[#0a0a0a] font-medium text-sm disabled:opacity-50"
            style={{
              background: "linear-gradient(to right, #d4a553, #e0b860)",
            }}
          >
            {status.kind === "sending"
              ? "Sending..."
              : scheduleAt
                ? "Schedule"
                : "Send for real"}
          </button>
        </div>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Schedule (optional, up to 72h)
          </span>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553] text-sm"
          />
        </label>
        <p className="text-xs text-neutral-500">
          Leave the schedule blank to send immediately. SendGrid caps scheduled
          sends at 72 hours out.
        </p>

        {status.kind === "success" && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {status.message}
          </p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
}
