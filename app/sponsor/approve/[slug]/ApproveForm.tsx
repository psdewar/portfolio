"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isEmailValid } from "../../../lib/email";

export default function ApproveForm({
  slug,
  sig,
  host,
}: {
  slug: string;
  sig: string;
  host: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(host.name);
  const [email, setEmail] = useState(host.email);
  const [phone, setPhone] = useState(host.phone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    if (!name.trim() || !isEmailValid(email)) {
      setError("Add your name and a valid email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, sig, name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't publish. Try again in a moment.");
        setLoading(false);
        return;
      }
      router.push(`/rsvp?submitted=${slug}`);
    } catch {
      setError("Couldn't publish. Try again in a moment.");
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-neutral-900 dark:focus:border-white pb-1.5 text-base";

  return (
    <div>
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name or organization"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="sm:flex-1 min-w-0">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="abc@email.com"
            className={fieldClass}
          />
        </div>
          <div className="sm:shrink-0 sm:w-[15ch]">
            <label className="block text-xs text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(206) 555-0100"
            className={fieldClass}
          />
        </div>
        </div>
      </div>
      <button
        onClick={approve}
        disabled={loading}
        className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-lg py-3 lg:py-4 text-sm lg:text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? "Publishing…" : "Approve and publish to /rsvp"}
      </button>
      {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
    </div>
  );
}
