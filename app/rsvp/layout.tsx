import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RSVP",
  description:
    "RSVP for From The Ground Up — a free concert by Peyt Spencer. Friday, February 20, 2026. Richmond, BC.",
  openGraph: {
    title: "RSVP | From The Ground Up",
    description:
      "RSVP for From The Ground Up — a free concert by Peyt Spencer. Friday, February 20, 2026. Richmond, BC.",
    images: [
      {
        url: "https://peytspencer.com/api/og/rsvp",
        width: 430,
        height: 932,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RSVP | From The Ground Up",
    description:
      "RSVP for From The Ground Up — a free concert by Peyt Spencer. Friday, February 20, 2026. Richmond, BC.",
    images: ["https://peytspencer.com/api/og/rsvp"],
  },
};

export default function RSVPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
