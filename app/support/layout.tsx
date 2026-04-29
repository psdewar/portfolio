import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description:
    "Support rapper and Microsoft engineer Peyt Spencer. Tips, social links, monthly supporter tiers, and the full timeline.",
  openGraph: {
    title: "Support Peyt Spencer",
    description:
      "Support rapper and Microsoft engineer Peyt Spencer. Tips, social links, monthly supporter tiers, and the full timeline.",
    images: [
      {
        url: "https://peytspencer.com/api/og/support",
        width: 960,
        height: 1440,
        alt: "Support Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support Peyt Spencer",
    description:
      "Support rapper and Microsoft engineer Peyt Spencer. Tips, social links, monthly supporter tiers, and the full timeline.",
    images: ["https://peytspencer.com/api/og/support"],
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
