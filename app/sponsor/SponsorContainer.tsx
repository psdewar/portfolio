"use client";

import { usePathname } from "next/navigation";

export default function SponsorContainer({ children }: { children: React.ReactNode }) {
  const wide = usePathname()?.startsWith("/sponsor/approve");
  return (
    <div
      className={`mx-auto px-5 py-6 sm:px-10 sm:py-8 lg:py-7 ${wide ? "max-w-7xl" : "max-w-[900px]"}`}
    >
      {children}
    </div>
  );
}
