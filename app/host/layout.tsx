import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import HostHeader from "./HostHeader";
import HostFAQ from "./HostFAQ";
import HostContainer from "./HostContainer";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

const title = "Host a Concert";
const description =
  "Sponsor Peyt Spencer's rap concert-conversation for all ages in your community.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/host" },
  robots: { index: false, follow: false },
};

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrumentSans.variable} font-[family-name:var(--font-instrument)]`}>
      <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        <HostContainer>
          <HostHeader />
          {children}
          <HostFAQ />
        </HostContainer>
      </div>
    </div>
  );
}
