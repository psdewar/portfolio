import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import SponsorHeader from "./SponsorHeader";
import SponsorFAQ from "./SponsorFAQ";
import SponsorContainer from "./SponsorContainer";

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
    images: [{ url: ogImage, width: 2160, height: 3840 }],
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
        <SponsorContainer>
          <SponsorHeader />
          {children}
          <SponsorFAQ />
        </SponsorContainer>
      </div>
    </div>
  );
}
