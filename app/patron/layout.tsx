import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/patron" },
  title: "Patron",
  description: "Support rapper and Microsoft engineer Peyt Spencer. Get early access to unreleased tracks, exclusive downloads, and follow along as the story unfolds.",
  openGraph: {
    title: "Become a Patron | Peyt Spencer",
    description: "Support rapper and Microsoft engineer Peyt Spencer. Early access to unreleased tracks, exclusive downloads, and a front-row seat to the journey.",
    images: [
      {
        url: "https://peytspencer.com/api/og/patron",
        width: 1200,
        height: 630,
        alt: "Support Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Become a Patron | Peyt Spencer",
    description: "Support rapper and Microsoft engineer Peyt Spencer. Early access to unreleased tracks, exclusive downloads, and a front-row seat to the journey.",
    images: ["https://peytspencer.com/api/og/patron"],
  },
};

export default function PatronLayout({ children }: { children: React.ReactNode }) {
  return children;
}
