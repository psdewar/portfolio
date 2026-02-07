"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PatronContent } from "../components/PatronContent";
import { activatePatronStatus } from "../lib/patron";

export default function PatronPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initialViewMode, setInitialViewMode] = useState<"patron" | "journey">("patron");

  // Check URL params for initial view mode and success state
  useEffect(() => {
    if (searchParams.get("view") === "journey") {
      setInitialViewMode("journey");
    }

    if (searchParams.get("thanks") === "1") {
      const sid = searchParams.get("session_id");
      activatePatronStatus();

      // Fetch and store patron email, then redirect to /listen
      if (sid) {
        fetch(`/api/checkout-session?session_id=${sid}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.email) localStorage.setItem("patronEmail", data.email);
          })
          .catch(console.error)
          .finally(() => router.replace("/listen?patron_welcome=1"));
      } else {
        router.replace("/listen?patron_welcome=1");
      }
    }
  }, [searchParams, router]);

  // Prevent body scroll on patron page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="h-[calc(100dvh-4rem)]">
      <PatronContent initialViewMode={initialViewMode} />
    </div>
  );
}
