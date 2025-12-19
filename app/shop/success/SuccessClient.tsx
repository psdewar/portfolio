"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  sessionId: string;
  productName: string;
  customerEmail: string;
  hasDigital: boolean;
  assets: string[];
};

export function SuccessClient({
  sessionId,
  productName,
  customerEmail,
  hasDigital,
  assets,
}: Props) {
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  const handleSendEmail = async () => {
    setEmailStatus("sending");

    try {
      const res = await fetch("/api/send-download-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailStatus("sent");
        setEmailMessage(data.message);
      } else {
        setEmailStatus("error");
        setEmailMessage(data.error || "Failed to send email");
      }
    } catch {
      setEmailStatus("error");
      setEmailMessage("Network error. Try again.");
    }
  };

  const handleDownload = async (assetId: string) => {
    // Download via API which validates the session
    window.location.href = `/api/download/${assetId}?session_id=${sessionId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold mb-2">Thank You!</h1>
          <p className="text-neutral-400">{productName}</p>
        </div>

        {/* Digital Downloads */}
        {hasDigital && assets.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 mb-6">
            <div className="space-y-3 mb-6">
              <p className="text-sm text-neutral-400 mb-3">I'm on my own device.</p>
              {assets.map((asset) => (
                <button
                  key={asset}
                  onClick={() => handleDownload(asset)}
                  className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-400 hover:via-red-400 hover:to-pink-400 text-white font-medium py-4 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                  Download{" "}
                  {asset.includes("zip") || asset.includes("bundle") ? "All Files (.zip)" : asset}
                </button>
              ))}
            </div>

            {/* Email Option */}
            {customerEmail && (
              <div className="border-t border-neutral-800 pt-5">
                <p className="text-sm text-neutral-400 mb-3">
                  This is not my device. Send download link to my email:
                </p>
                <p className="text-white font-medium mb-3">{customerEmail}</p>

                {emailStatus === "idle" && (
                  <button
                    onClick={handleSendEmail}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Send download link to my email
                  </button>
                )}

                {emailStatus === "sending" && (
                  <div className="text-center py-3 text-neutral-400">Sending...</div>
                )}

                {emailStatus === "sent" && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl py-3 px-4 text-center text-green-400">
                    ✓ {emailMessage}
                  </div>
                )}

                {emailStatus === "error" && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl py-3 px-4 text-center text-red-400">
                    {emailMessage}
                    <button
                      onClick={() => setEmailStatus("idle")}
                      className="block mx-auto mt-2 text-sm underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Receipt Note */}
        <p className="text-center text-sm text-neutral-500 mb-8">
          A receipt has been sent to {customerEmail || "your email"}.
        </p>

        {/* Back to Shop */}
        <div className="text-center">
          <Link
            href="/shop"
            className="text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
          >
            ← Back to shop
          </Link>
        </div>
      </div>
    </div>
  );
}
