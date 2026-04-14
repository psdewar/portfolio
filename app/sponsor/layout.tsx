import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import SponsorAvatar from "./SponsorAvatar";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

const title = "Concert Sponsor Application";
const description =
  "Sponsor a free, family-friendly hip-hop concert in your community with Peyt Spencer.";
const ogImage = "https://peytspencer.com/api/og/sponsor";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sponsor" },
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    images: [{ url: ogImage, width: 1440, height: 2340 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrumentSans.variable} font-[family-name:var(--font-instrument)]`}>
      <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        <div className="max-w-[900px] mx-auto px-5 py-6 sm:px-10 sm:py-8 lg:py-7">
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
          {children}
        </div>
      </div>
    </div>
  );
}
