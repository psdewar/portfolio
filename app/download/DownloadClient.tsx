"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  sessionId: string;
  productName: string;
  customerEmail: string;
  assets: string[];
  imageUrl?: string;
};

const GREEN_REST = "linear-gradient(to right, rgba(58,92,58,0.75), rgba(74,107,71,0.75))";
const GREEN_HOVER = "linear-gradient(to right, rgba(58,92,58,0.9), rgba(74,107,71,0.9))";
const GREEN_ACTIVE = "linear-gradient(to right, #3a5c3a, #4a6b47)";

const COGNAC_REST = "linear-gradient(to right, rgba(160,101,58,0.7), rgba(184,122,74,0.7))";
const COGNAC_HOVER = "linear-gradient(to right, rgba(160,101,58,0.9), rgba(184,122,74,0.9))";
const COGNAC_ACTIVE = "linear-gradient(to right, #a0653a, #b87a4a)";

export function DownloadClient({ sessionId, productName, customerEmail, assets, imageUrl }: Props) {
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  const handleDownload = (assetId: string) => {
    window.location.href = `/api/download/${assetId}?session_id=${sessionId}`;
  };

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

  const emailLabel =
    emailStatus === "sending"
      ? "Sending..."
      : emailStatus === "sent"
        ? emailMessage
        : emailStatus === "error"
          ? emailMessage
          : null;

  const emailAction =
    emailStatus === "idle"
      ? handleSendEmail
      : emailStatus === "sent" || emailStatus === "error"
        ? () => setEmailStatus("idle")
        : undefined;

  return (
    <>
      {/* Mobile: scrollable, image spans width, buttons flow below */}
      <div className="md:hidden fixed left-0 right-0 top-14 bottom-0 overflow-y-auto">
        {imageUrl && (
          <button
            onClick={() => assets[0] && handleDownload(assets[0])}
            className="relative w-full cursor-pointer"
            style={{ aspectRatio: "8.5/11" }}
          >
            <Image
              src={imageUrl}
              alt={productName}
              fill
              className="object-contain object-top"
              sizes="100vw"
              priority
            />
          </button>
        )}

        <div className="px-[6%] py-4">
          {assets.map((asset) => (
            <button
              key={asset}
              onClick={() => handleDownload(asset)}
              className="w-full h-[4.5rem] text-white font-medium text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: GREEN_REST }}
              onMouseDown={(e) => (e.currentTarget.style.background = GREEN_ACTIVE)}
              onMouseUp={(e) => (e.currentTarget.style.background = GREEN_REST)}
              onMouseEnter={(e) => (e.currentTarget.style.background = GREEN_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.background = GREEN_REST)}
            >
              Download
            </button>
          ))}

          {customerEmail && (
            <button
              onClick={emailAction}
              disabled={emailStatus === "sending"}
              className="w-full h-14 mt-4 text-white font-medium text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: COGNAC_REST }}
              onMouseDown={(e) => (e.currentTarget.style.background = COGNAC_ACTIVE)}
              onMouseUp={(e) => (e.currentTarget.style.background = COGNAC_REST)}
              onMouseEnter={(e) => (e.currentTarget.style.background = COGNAC_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.background = COGNAC_REST)}
            >
              {emailLabel ?? (
                <span className="flex flex-col leading-tight">
                  <span>Email link</span>
                  <span className="text-sm opacity-70">{customerEmail}</span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop: image fills full height, buttons overlay at bottom */}
      <div className="hidden md:flex fixed left-0 right-0 top-14 bottom-0 overflow-hidden justify-center">
        <div className="relative h-full">
          {imageUrl && (
            <button
              onClick={() => assets[0] && handleDownload(assets[0])}
              className="block h-full cursor-pointer"
            >
              <Image
                src={imageUrl}
                alt={productName}
                width={850}
                height={1100}
                className="h-full w-auto"
                priority
              />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex items-stretch">
            {assets.map((asset) => (
              <button
                key={asset}
                onClick={() => handleDownload(asset)}
                className="flex-[2] h-28 text-white font-medium text-3xl lg:text-4xl transition-all"
                style={{ background: GREEN_REST }}
                onMouseDown={(e) => (e.currentTarget.style.background = GREEN_ACTIVE)}
                onMouseUp={(e) => (e.currentTarget.style.background = GREEN_REST)}
                onMouseEnter={(e) => (e.currentTarget.style.background = GREEN_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = GREEN_REST)}
              >
                Download
              </button>
            ))}
            {customerEmail && (
              <button
                onClick={emailAction}
                disabled={emailStatus === "sending"}
                className="flex-1 h-28 text-white font-medium text-lg lg:text-xl transition-all disabled:opacity-50"
                style={{ background: COGNAC_REST }}
                onMouseDown={(e) => (e.currentTarget.style.background = COGNAC_ACTIVE)}
                onMouseUp={(e) => (e.currentTarget.style.background = COGNAC_REST)}
                onMouseEnter={(e) => (e.currentTarget.style.background = COGNAC_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.background = COGNAC_REST)}
              >
                {emailLabel ?? (
                  <span className="flex flex-col leading-tight">
                    <span>Email link</span>
                    <span className="text-base lg:text-lg opacity-70">{customerEmail}</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
