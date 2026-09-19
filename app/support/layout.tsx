import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description:
    "Rapper and Microsoft alum. Think Patreon, but I receive 100% of your support. Monthly tiers unlock my unreleased songs.",
  openGraph: {
    title: "Support Peyt Spencer",
    description:
      "Rapper and Microsoft alum. Think Patreon, but I receive 100% of your support. Monthly tiers unlock my unreleased songs.",
    images: [
      {
        url: "https://peytspencer.com/api/og/support",
        width: 1440,
        height: 2340,
        alt: "Support Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support Peyt Spencer",
    description:
      "Rapper and Microsoft alum. Think Patreon, but I receive 100% of your support. Monthly tiers unlock my unreleased songs.",
    images: ["https://peytspencer.com/api/og/support"],
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
