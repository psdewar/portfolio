import { Metadata } from "next";
import { getShowHistory } from "../lib/shows";

export const metadata: Metadata = {
  alternates: { canonical: "/live" },
  title: "Live",
  description:
    "Watch rapper and Microsoft alum Peyt Spencer live. From The Ground Up north American tour.",
  openGraph: {
    title: "Live | Peyt Spencer",
    description:
      "Watch rapper and Microsoft alum Peyt Spencer live. From The Ground Up north American tour.",
    images: [
      {
        url: "https://peytspencer.com/api/og/live",
        width: 1290,
        height: 2796,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live | Peyt Spencer",
    description:
      "Watch rapper and Microsoft alum Peyt Spencer live. From The Ground Up north American tour.",
    images: ["https://peytspencer.com/api/og/live"],
  },
};

const performer = {
  "@type": "MusicGroup",
  name: "Peyt Spencer",
  "@id": "https://peytspencer.com/#artist",
};

export default async function LiveLayout({ children }: { children: React.ReactNode }) {
  const shows = (await getShowHistory()).filter((e) => e.description && e.location);

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
