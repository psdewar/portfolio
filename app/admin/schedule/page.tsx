"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SchedulePage() {
  const [nextStream, setNextStream] = useState("");
  const [currentSchedule, setCurrentSchedule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        if (data.nextStream) {
          setCurrentSchedule(data.nextStream);
          // Convert ISO to datetime-local format
          const date = new Date(data.nextStream);
          const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setNextStream(local);
        }
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load current schedule" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStream: new Date(nextStream).toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setCurrentSchedule(data.nextStream || new Date(nextStream).toISOString());
      setMessage({ type: "success", text: "Schedule updated!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save schedule" });
    } finally {
      setSaving(false);
    }
  };

  const formatDisplay = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Link
          href="/admin"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4 inline-block"
        >
          ← Back to Admin
        </Link>

        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Livestream Schedule
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Set your next scheduled livestream.
        </p>

        {loading ? (
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <div className="animate-pulse h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm space-y-4">
            {currentSchedule && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Currently Scheduled
                </p>
                <p className="text-neutral-900 dark:text-white font-medium">
                  {formatDisplay(currentSchedule)}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="nextStream"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Next Stream Date & Time
              </label>
              <input
                type="datetime-local"
                id="nextStream"
                value={nextStream}
                onChange={(e) => setNextStream(e.target.value)}
                required
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !nextStream}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Update Schedule"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
