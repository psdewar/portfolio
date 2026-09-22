"use client";

import { useState } from "react";
import {
  activatePatronStatus,
  storePatronEmail,
  storePatronTier,
} from "../lib/patron";

export default function PatronSignInForm({
  onCancel,
  onVerified,
}: {
  onCancel: () => void;
  onVerified: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-patron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const normalized = email.trim().toLowerCase();
        activatePatronStatus();
        storePatronEmail(normalized);
        storePatronTier(data.tier ?? null);
        onVerified(normalized);
      } else {
        setError(
          data.error === "No subscription found" ||
            data.error === "No active subscription"
            ? "No active subscription found for this email"
            : "Verification failed",
        );
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="email"
        autoFocus
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && verify()}
        className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      {error && <p className="text-red-500 text-base">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base"
        >
          Cancel
        </button>
        <button
          onClick={verify}
          disabled={loading || !email.trim()}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-base rounded-lg font-medium"
        >
          {loading ? "Checking..." : "Verify"}
        </button>
      </div>
    </div>
  );
}
