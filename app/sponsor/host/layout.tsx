import type { Metadata } from "next";

const title = "Host a Concert | Peyt Spencer";
const description =
  "Book a date and location for Peyt Spencer's all-ages rap concert-conversation in your community.";
const ogImage = "https://peytspencer.com/api/og/sponsor/host";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/sponsor/host" },
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

export default function SponsorHostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
