import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { FUND_COPY } from "../data/supporter-config";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  alternates: { canonical: "/fund" },
  title: "Fund",
  description: FUND_COPY.metaDescription,
  openGraph: {
    title: "Fund Peyt Spencer | Music",
    description: FUND_COPY.metaDescription,
    images: [
      {
        url: "https://peytspencer.com/api/og/fund",
        width: 1080,
        height: 1920,
        alt: "Fund Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fund Peyt Spencer | Music",
    description: FUND_COPY.metaDescription,
    images: ["https://peytspencer.com/api/og/fund"],
  },
};

export default function FundLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${outfit.variable}`}>
      {children}
    </div>
  );
}
