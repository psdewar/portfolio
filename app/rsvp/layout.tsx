import { Metadata } from "next";
import { musicEventSchema } from "../lib/schema";

export const metadata: Metadata = {
  alternates: { canonical: "/rsvp" },
  title: "RSVP",
  description:
    "RSVP for From The Ground Up - a rap concert and a conversation on my path of growth and the principles that connect us. A free event by Microsoft engineer Peyt Spencer. February 20, 2026. Richmond, BC.",
  openGraph: {
    title: "RSVP | From The Ground Up",
    description:
      "RSVP for From The Ground Up - a rap concert and a conversation on my path of growth and the principles that connect us. A free event by Microsoft engineer Peyt Spencer. February 20, 2026. Richmond, BC.",
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
      "RSVP for From The Ground Up - a rap concert and a conversation on my path of growth and the principles that connect us. A free event by Microsoft engineer Peyt Spencer. February 20, 2026. Richmond, BC.",
    images: ["https://peytspencer.com/api/og/rsvp"],
  },
};

const eventJsonLd = musicEventSchema({
  name: "From The Ground Up - A Concert by Peyt Spencer",
  date: "2026-02-20T19:00:00-08:00",
  doorTime: "2026-02-20T19:00:00-08:00",
  venueName: "Richmond, BC",
  city: "Richmond",
  region: "BC",
  country: "CA",
  description: "A rap concert and a conversation on my path of growth and the principles that connect us. A free event by Microsoft engineer Peyt Spencer.",
  url: "https://peytspencer.com/rsvp",
  isAccessibleForFree: true,
});

export default function RSVPLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {children}
    </>
  );
}
