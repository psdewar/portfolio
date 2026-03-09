import Image from "next/image";
import SponsorForm from "../../components/SponsorForm";

export default async function SponsorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const isPdfMode = params.og === "true";

  return (
    <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
      <div className="max-w-[900px] mx-auto px-5 py-6 sm:px-10 sm:py-8 lg:py-7">
        <div className="flex items-center gap-4 sm:gap-6 mb-5 sm:mb-6 lg:mb-6">
          <div className="w-[80px] h-[80px] sm:w-[112px] sm:h-[112px] lg:w-[132px] lg:h-[132px] rounded-lg overflow-hidden flex-shrink-0 relative">
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
            <h1 className="text-2xl sm:text-[40px] lg:text-5xl font-medium leading-tight tracking-tight">
              Concert Sponsor Application
            </h1>
            <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-2">
              Peyt Spencer / Rapper, Software Engineer at Microsoft
            </p>
          </div>
        </div>

        <SponsorForm
          isPdfMode={isPdfMode}
          city={params.city}
          region={params.region}
          country={params.country}
          date={params.date}
          doorTime={params.doorTime}
          initialName={params.name}
          initialPhone={params.phone}
          initialEmail={params.email}
          initialItems={params.items ? params.items.split("|") : undefined}
        />
      </div>
    </div>
  );
}
