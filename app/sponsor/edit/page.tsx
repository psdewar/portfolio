"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import SponsorForm from "../../components/SponsorForm";

export default function SponsorPage() {
  const searchParams = useSearchParams();
  const isPdfMode = searchParams.get("og") === "true";

  const initialItems = searchParams.get("items");

  return (
    <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <div className="max-w-[820px] mx-auto px-5 py-6 sm:px-12 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 sm:gap-6 mb-5 sm:mb-8">
          <div className="w-[80px] h-[80px] sm:w-[112px] sm:h-[112px] rounded-lg overflow-hidden flex-shrink-0 relative">
            <Image
              src="/images/home/bio.jpeg"
              alt="Peyt Spencer"
              fill
              className="object-cover"
              sizes="192px"
              priority
              quality={95}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[40px] font-medium leading-tight tracking-tight">
              Concert Host Application
            </h1>
            <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-2">
              Peyt Spencer / Rapper, Software Engineer at Microsoft
            </p>
          </div>
        </div>

        <SponsorForm
          city={searchParams.get("city") || undefined}
          date={searchParams.get("date") || undefined}
          isPdfMode={isPdfMode}
          initialItems={initialItems ? initialItems.split("|") : undefined}
          initialHost={searchParams.get("host") || undefined}
          initialPhone={searchParams.get("phone") || undefined}
          initialEmail={searchParams.get("email") || undefined}
        />
      </div>
    </div>
  );
}
