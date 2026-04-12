"use client";

import { useEffect, useMemo, useState } from "react";
import { type Show } from "../../lib/shows";
import { isDatePast, formatMonthDay } from "../../lib/dates";

type RsvpDetail = Record<string, Array<{ name: string; email: string; guests: number }>>;

type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "peyt2024";

export default function EmailsAdminPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [rsvps, setRsvps] = useState<RsvpDetail>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [status, setStatus] = useState<SendStatus>({ kind: "idle" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/shows").then((r) => r.json()),
      fetch("/api/rsvp?detail=emails").then((r) => r.json()),
    ])
      .then(([showsData, rsvpData]) => {
        setShows(Array.isArray(showsData) ? showsData : []);
        setRsvps(rsvpData || {});
      })
      .catch(() => {
        setShows([]);
        setRsvps({});
      })
      .finally(() => setLoading(false));
  }, []);

  const pastShows = useMemo(
    () => shows.filter((s) => isDatePast(s.date)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [shows],
  );

  const uniqueRecipients = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    for (const slug of selected) {
      for (const r of rsvps[slug] || []) {
        if (!seen.has(r.email)) {
          seen.add(r.email);
          count++;
        }
      }
    }
    return count;
  }, [selected, rsvps]);

  function toggleSlug(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
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
      setStatus({ kind: "error", message: "Select at least one show." });
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
        `Send to ${uniqueRecipients} recipients across ${selected.size} show${selected.size === 1 ? "" : "s"}, ${when}?`,
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error || "Send failed" });
        return;
      }
      const target = data.test ? `test to ${data.target}` : `${data.sent} of ${data.count}`;
      const schedule = data.scheduledAt
        ? ` for ${new Date(data.scheduledAt * 1000).toLocaleString()}`
        : "";
      setStatus({
        kind: "success",
        message: `${data.scheduledAt ? "Scheduled" : "Sent"} ${target}${schedule}.${data.failed ? ` ${data.failed} failed.` : ""}`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Send failed",
      });
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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Post-concert email</h1>
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
            <button onClick={selectAll} className="text-[#d4a553] hover:underline">
              Select all
            </button>
            <button onClick={selectNone} className="text-neutral-500 hover:underline">
              Clear
            </button>
          </div>
        </div>

        {pastShows.length === 0 ? (
          <p className="text-sm text-neutral-500">No past shows yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            {pastShows.map((show) => {
              const count = (rsvps[show.slug] || []).length;
              const isSelected = selected.has(show.slug);
              return (
                <li key={show.slug}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSlug(show.slug)}
                      className="accent-[#d4a553]"
                    />
                    <span className="flex-1">
                      <span className="font-medium">
                        {show.city}, {show.region}
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400 text-sm ml-2">
                        {formatMonthDay(show.date)}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {count} RSVPs
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {selected.size === 0
            ? "No shows selected."
            : `${uniqueRecipients} unique recipient${uniqueRecipients === 1 ? "" : "s"} across ${selected.size} show${selected.size === 1 ? "" : "s"}.`}
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
            disabled={status.kind === "sending"}
            className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm hover:border-[#d4a553] disabled:opacity-50"
          >
            Send test
          </button>
          <button
            onClick={() => send({ testOnly: false })}
            disabled={status.kind === "sending" || selected.size === 0}
            className="px-4 py-2 rounded-lg text-[#0a0a0a] font-medium text-sm disabled:opacity-50"
            style={{
              background: "linear-gradient(to right, #d4a553, #e8c474)",
            }}
          >
            {status.kind === "sending" ? "Sending..." : scheduleAt ? "Schedule" : "Send for real"}
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
          Leave the schedule blank to send immediately. SendGrid caps scheduled sends at 72 hours
          out.
        </p>

        {status.kind === "success" && (
          <p className="text-sm text-green-600 dark:text-green-400">{status.message}</p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </section>
    </div>
  );
}
