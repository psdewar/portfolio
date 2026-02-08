import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Concert Host Application",
  description:
    "Host a free, family-friendly hip-hop concert in your community with Peyt Spencer.",
  alternates: { canonical: "/sponsor/edit" },
  robots: { index: false, follow: false },
};

export default function SponsorEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${instrumentSans.variable} font-[family-name:var(--font-instrument)]`}>
      {children}
    </div>
  );
}
