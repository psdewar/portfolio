"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  productName: string;
  customerEmail: string;
  hasDigital: boolean;
  assets: string[];
  emailAlreadySent?: boolean;
};

export function SuccessClient({
  sessionId,
  productName,
  customerEmail,
  hasDigital,
  assets,
  emailAlreadySent = false,
}: Props) {
  const router = useRouter();
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">(
    emailAlreadySent ? "sent" : "idle"
  );
  const [countdown, setCountdown] = useState(5);
  const [emailMessage, setEmailMessage] = useState(
    emailAlreadySent ? `Download link sent to ${customerEmail}` : ""
  );

  // Auto-redirect countdown after email is sent
  useEffect(() => {
    if (emailStatus !== "sent") return;

    if (countdown <= 0) {
      router.push("/shop");
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailStatus, countdown, router]);

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
            {/* Email Option - Primary for POS flow */}
            {customerEmail && (
              <div className="mb-6">
                <p className="text-sm text-neutral-400 mb-3">
                  Send download link to:
                </p>
                <p className="text-white font-medium mb-4">{customerEmail}</p>

                {emailStatus === "idle" && (
                  <button
                    onClick={handleSendEmail}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-400 hover:via-red-400 hover:to-pink-400 text-white font-bold py-5 px-6 rounded-xl transition-all active:scale-[0.98] text-lg"
                  >
                    Send Download Link
                  </button>
                )}

                {emailStatus === "sending" && (
                  <div className="text-center py-5 text-neutral-400 text-lg">Sending...</div>
                )}

                {emailStatus === "sent" && (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl py-3 px-4 text-center text-green-400">
                      ✓ {emailMessage}
                    </div>
                    <button
                      onClick={() => router.push("/shop")}
                      className="w-full bg-white text-black font-bold py-5 px-6 rounded-xl transition-all active:scale-[0.98] text-xl"
                    >
                      Back to Shop ({countdown}s)
                    </button>
                    <button
                      onClick={() => setEmailStatus("idle")}
                      className="w-full text-neutral-400 hover:text-white text-sm transition-colors"
                    >
                      Didn't receive it? Resend email
                    </button>
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

            {/* Direct Download - Secondary option */}
            {emailStatus !== "sent" && (
              <div className={customerEmail ? "border-t border-neutral-800 pt-5" : ""}>
                <p className="text-sm text-neutral-400 mb-3">Or download directly:</p>
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <button
                      key={asset}
                      onClick={() => handleDownload(asset)}
                      className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                    >
                      Download{" "}
                      {asset.includes("zip") || asset.includes("bundle") ? "All Files (.zip)" : asset}
                    </button>
                  ))}
                </div>
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
