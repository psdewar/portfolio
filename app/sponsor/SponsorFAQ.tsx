"use client";

import { usePathname } from "next/navigation";
import HostFAQ from "../components/HostFAQ";

// The confirmation page is a private, single-purpose view — no host FAQ there.
export default function SponsorFAQ() {
  const pathname = usePathname();
  if (pathname?.startsWith("/sponsor/confirm")) return null;
  return <HostFAQ />;
}
