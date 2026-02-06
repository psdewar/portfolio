import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/fund" },
  title: "Fund",
  description: "Back my next music project. Get early access, exclusive tracks, and limited merch.",
  openGraph: {
    title: "Fund Peyt Spencer | Music",
    description: "Back my next project. Early access, exclusive tracks, limited merch.",
    images: [
      {
        url: "https://peytspencer.com/api/og/fund",
        width: 1200,
        height: 630,
        alt: "Fund Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fund Peyt Spencer | Music",
    description: "Back my next project. Early access, exclusive tracks, limited merch.",
    images: ["https://peytspencer.com/api/og/fund"],
  },
};

export default function FundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
