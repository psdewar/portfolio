import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live",
  description:
    "Watch Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
  openGraph: {
    title: "Live | Peyt Spencer",
    description:
      "Watch Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
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
      "Watch Peyt Spencer live. Upcoming shows in Bellevue, Seattle, and the Pacific Northwest.",
    images: ["https://peytspencer.com/api/og/live"],
  },
};

const performer = {
  "@type": "MusicGroup",
  name: "Peyt Spencer",
  "@id": "https://peytspencer.com/#artist",
};

const eventsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Peyt Spencer Live Shows",
  itemListElement: [
    {
      "@type": "MusicEvent",
      name: "Open Mic Night",
      startDate: "2026-01-23",
      location: {
        "@type": "Place",
        name: "Third Culture Coffee",
        address: { "@type": "PostalAddress", addressLocality: "Bellevue", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert Tour w/ Colby Jeffers",
      startDate: "2026-01-19",
      location: {
        "@type": "Place",
        name: "Cowlitz County Historical Museum",
        address: { "@type": "PostalAddress", addressLocality: "Kelso", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert Tour w/ Colby Jeffers",
      startDate: "2026-01-18",
      location: {
        "@type": "Place",
        name: "Hayes Residence",
        address: { "@type": "PostalAddress", addressLocality: "Edmonds", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert Tour w/ Colby Jeffers",
      startDate: "2026-01-17",
      location: {
        "@type": "Place",
        name: "Eastside Baha'i Center",
        address: { "@type": "PostalAddress", addressLocality: "Bellevue", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert Tour w/ Colby Jeffers",
      startDate: "2026-01-16",
      location: {
        "@type": "Place",
        name: "Fourth Plain Community Commons",
        address: { "@type": "PostalAddress", addressLocality: "Vancouver", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Wedding Performance",
      startDate: "2025-12-13",
      location: {
        "@type": "Place",
        name: "Casey Key Resort",
        address: { "@type": "PostalAddress", addressLocality: "Nokomis", addressRegion: "FL" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Open Mic Night",
      startDate: "2025-06-27",
      location: {
        "@type": "Place",
        name: "Third Culture Coffee",
        address: { "@type": "PostalAddress", addressLocality: "Bellevue", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Canvas of Hope Hip-Hop Showcase",
      startDate: "2025-06-21",
      location: {
        "@type": "Place",
        name: "Seattle Armory",
        address: { "@type": "PostalAddress", addressLocality: "Seattle", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Open Mic Night",
      startDate: "2025-05-30",
      location: {
        "@type": "Place",
        name: "Third Culture Coffee",
        address: { "@type": "PostalAddress", addressLocality: "Bellevue", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert w/ Colby Jeffers",
      startDate: "2025-05-24",
      location: {
        "@type": "Place",
        name: "Windstock Youth Retreat",
        address: { "@type": "PostalAddress", addressLocality: "Lyle", addressRegion: "WA" },
      },
      performer,
    },
    {
      "@type": "MusicEvent",
      name: "Better World Concert w/ Colby Jeffers",
      startDate: "2025-05-21",
      location: {
        "@type": "Place",
        name: "Beaverton Baha'i Center",
        address: { "@type": "PostalAddress", addressLocality: "Beaverton", addressRegion: "OR" },
      },
      performer,
    },
  ],
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
