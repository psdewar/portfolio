import type { Metadata } from "next";
import { SUPPORTER_COPY } from "../data/supporter-config";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support",
  description:
    SUPPORTER_COPY.metaDescription,
  openGraph: {
    title: "Support Peyt Spencer",
    description:
      SUPPORTER_COPY.metaDescription,
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
      SUPPORTER_COPY.metaDescription,
    images: ["https://peytspencer.com/api/og/support"],
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
