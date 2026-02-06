import { Metadata } from "next";
import { TIMELINE } from "../data/timeline";

export const metadata: Metadata = {
  alternates: { canonical: "/live" },
  title: "Live",
  description:
    "Watch rapper and Microsoft engineer Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
  openGraph: {
    title: "Live | Peyt Spencer",
    description:
      "Watch rapper and Microsoft engineer Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
    images: [
      {
        url: "https://peytspencer.com/api/og/live",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live | Peyt Spencer",
    description:
      "Watch rapper and Microsoft engineer Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
    images: ["https://peytspencer.com/api/og/live"],
  },
};

const performer = {
  "@type": "MusicGroup",
  name: "Peyt Spencer",
  "@id": "https://peytspencer.com/#artist",
};

const shows = TIMELINE.filter((e) => e.type === "show" && e.description && e.location);

const eventsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Peyt Spencer Live Shows",
  itemListElement: shows.map((show) => {
    const [city, region] = (show.location ?? "").split(", ");
    return {
      "@type": "MusicEvent",
      name: show.title,
      startDate: show.date,
      location: {
        "@type": "Place",
        name: show.description,
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressRegion: region,
        },
      },
      performer,
    };
  }),
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsSchema) }}
      />
      {children}
    </>
  );
}
