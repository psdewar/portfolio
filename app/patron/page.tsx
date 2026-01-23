"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PatronContent } from "../components/PatronContent";
import { SuccessModal } from "../components/SuccessModal";

export default function PatronPage() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialViewMode, setInitialViewMode] = useState<"patron" | "journey">("patron");

  // Check URL params for initial view mode and success state
  useEffect(() => {
    if (searchParams.get("view") === "journey") {
      setInitialViewMode("journey");
    }

    if (searchParams.get("thanks") === "1") {
      const sid = searchParams.get("session_id");
      localStorage.setItem("patronStatus", "active");
      // Set patron cookie for server-side verification (1 year expiry)
      document.cookie = "patronToken=active; path=/; max-age=31536000; secure; samesite=strict";
      setShowSuccess(true);
      setSessionId(sid);
      window.history.replaceState({}, "", "/patron");

      // Fetch and store patron email from checkout session
      if (sid) {
        fetch(`/api/checkout-session?session_id=${sid}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.email) {
              localStorage.setItem("patronEmail", data.email);
            }
          })
          .catch(console.error);
      }
    }
  }, [searchParams]);

  // Prevent body scroll on patron page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <div className="h-[calc(100dvh-4rem)]">
        <PatronContent initialViewMode={initialViewMode} />
      </div>

      <SuccessModal
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        sessionId={sessionId}
      />
    </>
  );
}
