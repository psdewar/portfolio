"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Show } from "../../lib/shows";
import { isDatePast, formatMonthDay } from "../../lib/dates";
import { AudienceEmailer } from "./AudienceEmailer";

interface AddedContact {
  name: string;
  email: string;
  phone: string;
  shows: string[];
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

const INPUT_CLASS =
  "px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:border-[#d4a553] text-sm";

export default function AudienceAdminPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shows, setShows] = useState<Show[]>([]);
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<AddedContact[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/shows")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setShows(Array.isArray(data) ? data : []))
      .catch(() => setShows([]));
  }, []);

  const pastShows = useMemo(
    () =>
      shows
        .filter((s) => isDatePast(s.date))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [shows],
  );

  const showLabel = (slug: string) => {
    const s = pastShows.find((p) => p.slug === slug);
    return s ? `${s.city} · ${formatMonthDay(s.date)}` : slug;
  };

  function toggleShow(slug: string) {
    setAttended((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    const attendedSlugs = Array.from(attended);
    const contact = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      attended: attendedSlugs,
    };
    if (!contact.name && !contact.email) {
      setStatus({ kind: "error", message: "Enter a name or an email." });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/admin/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error || "Failed to add." });
        return;
      }
      setAdded((prev) => [
        {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          shows: attendedSlugs.map(showLabel),
        },
        ...prev,
      ]);
      setName("");
      setEmail("");
      setPhone("");
      setStatus({ kind: "idle" });
      nameRef.current?.focus();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to add.",
      });
    }
  }

  return (
    <>
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Stay connected
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Drop people into stay-connected one at a time. Email is how they get
          reached and how duplicates are caught.
        </p>
      </header>

      <form onSubmit={addContact} className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus({ kind: "idle" });
            }}
            placeholder="Name"
            autoFocus
            className={`${INPUT_CLASS} flex-1 min-w-[160px]`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus({ kind: "idle" });
            }}
            placeholder="Email"
            className={`${INPUT_CLASS} flex-[2] min-w-[200px]`}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className={`${INPUT_CLASS} flex-1 min-w-[140px]`}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Attended (optional)
            </h2>
            {attended.size > 0 && (
              <button
                type="button"
                onClick={() => setAttended(new Set())}
                className="text-xs text-neutral-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {pastShows.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No past shows yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {pastShows.map((show) => {
                const selected = attended.has(show.slug);
                return (
                  <button
                    type="button"
                    key={show.slug}
                    onClick={() => toggleShow(show.slug)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      selected
                        ? "border-[#d4a553] bg-[#d4a553]/15 text-[#d4a553]"
                        : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-[#d4a553]"
                    }`}
                  >
                    {show.city} · {formatMonthDay(show.date)}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Stays selected between adds, so you can tag everyone from one show in
            a row.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status.kind === "saving"}
            className="px-5 py-2 rounded-lg text-[#0a0a0a] font-medium text-sm disabled:opacity-50"
            style={{ background: "linear-gradient(to right, #d4a553, #e0b860)" }}
          >
            {status.kind === "saving" ? "Adding..." : "Add contact"}
          </button>
          {status.kind === "error" && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {status.message}
            </span>
          )}
        </div>
      </form>

      {added.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Added this session
          </h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            {added.map((c, i) => (
              <li
                key={`${c.email}-${i}`}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium text-neutral-900 dark:text-white shrink-0">
                  {c.name || "—"}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 truncate min-w-0">
                  {c.email}
                </span>
                {c.shows.length > 0 && (
                  <span className="ml-auto shrink-0 text-xs text-[#d4a553]">
                    {c.shows.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
      <AudienceEmailer />
    </>
  );
}
