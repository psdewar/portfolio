import type { Metadata } from "next";
import MomentsClient from "./MomentsClient";

const title = "Moments from the concert";
const description =
  "Send your photos and videos from From The Ground Up. Private link, passcode required.";
const url = "https://peytspencer.com/moments";
const ogImage = "https://peytspencer.com/api/og";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/moments" },
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    url,
    siteName: "Peyt Spencer",
    type: "website",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "From The Ground Up" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    creator: "@peytspencer",
  },
};

export default function MomentsPage() {
  return <MomentsClient />;
}
