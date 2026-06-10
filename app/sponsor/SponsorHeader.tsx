"use client";

import { usePathname } from "next/navigation";
import SponsorAvatar from "./SponsorAvatar";

export default function SponsorHeader() {
  if (usePathname()?.startsWith("/sponsor/confirm")) return null;
  return (
    <div className="flex items-center gap-4 sm:gap-6 mb-5 sm:mb-6 lg:mb-6">
      <SponsorAvatar />
      <div>
        <h1 className="text-2xl sm:text-[40px] lg:text-5xl font-medium leading-tight tracking-tight">
          Concert Sponsor Application
        </h1>
        <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-2">
          Peyt Spencer / Rapper, Software Engineer at Microsoft
        </p>
      </div>
    </div>
  );
}
