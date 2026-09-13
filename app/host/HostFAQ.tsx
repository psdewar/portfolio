"use client";

import { usePathname } from "next/navigation";
import HostFAQContent from "../components/HostFAQ";

// The confirmation page is a private, single-purpose view — no host FAQ there.
export default function HostFAQ() {
  const pathname = usePathname();
  if (pathname?.startsWith("/host/")) return null;
  return <HostFAQContent />;
}
