"use client";

import { useState } from "react";
import { notifySessionChange } from "../hooks/useSession";
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
  const [otpToken, setOtpToken] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const post = (url: string, body: object) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const claimPatron = async () => {
    const res = await post("/api/verify-patron", {});
    const data = await res.json();
    if (!res.ok) {
      setError(
        res.status === 404
          ? "No active subscription found for this email"
          : "Verification failed",
      );
      return;
    }
    const normalized = String(data.email).trim().toLowerCase();
    activatePatronStatus();
    storePatronEmail(normalized);
    storePatronTier(data.tier ?? null);
    onVerified(normalized);
  };

  const verify = async () => {
    const typed = email.trim().toLowerCase();
    if (!typed) return;
    setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/me");
      const session = me.ok ? await me.json() : null;
      if (session?.email?.toLowerCase() === typed) {
        await claimPatron();
        return;
      }
      const res = await post("/api/otp/request", { email: typed });
      const data = await res.json();
      if (res.ok) setOtpToken(data.token);
      else setError(res.status === 404 ? "No account found for this email" : "Could not send a code");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (code.trim().length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await post("/api/otp/verify", { token: otpToken, code: code.trim() });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid code");
        return;
      }
      notifySessionChange();
      await claimPatron();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {otpToken ? (
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={4}
          placeholder="4-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && confirmCode()}
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-base text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      ) : (
        <input
          type="email"
          autoFocus
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )}
      {error && <p className="text-red-500 text-base">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base"
        >
          Cancel
        </button>
        <button
          onClick={otpToken ? confirmCode : verify}
          disabled={loading || (otpToken ? code.trim().length !== 4 : !email.trim())}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-base rounded-lg font-medium"
        >
          {loading ? "Checking..." : otpToken ? "Confirm code" : "Send code"}
        </button>
      </div>
    </div>
  );
}
