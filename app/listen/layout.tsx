import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listen",
  description: "Stream Peyt Spencer's music. Singles: Right One, Safe, Patience. Exclusive tracks for patrons: So Good (2026), CRG Freestyle (2026).",
  openGraph: {
    title: "Listen | Peyt Spencer",
    description: "Stream singles and exclusive patron tracks. Right One, Safe, Patience, and more.",
    images: [
      {
        url: "https://peytspencer.com/api/og/listen",
        width: 1200,
        height: 630,
        alt: "Peyt Spencer Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Listen | Peyt Spencer",
    description: "Stream singles and exclusive patron tracks. Right One, Safe, Patience, and more.",
    images: ["https://peytspencer.com/api/og/listen"],
  },
};

const musicRecordingSchema = {
  "@context": "https://schema.org",
  "@type": "MusicPlaylist",
  name: "Peyt Spencer Singles",
  description: "Hip-hop singles and freestyles by Peyt Spencer",
  numTracks: 7,
  track: [
    {
      "@type": "MusicRecording",
      name: "Right One",
      byArtist: { "@type": "Person", name: "Peyt Spencer" },
      duration: "PT2M15S",
      url: "https://peytspencer.com/listen",
    },
    {
      "@type": "MusicRecording",
      name: "Safe",
      byArtist: { "@type": "Person", name: "Peyt Spencer" },
      duration: "PT2M17S",
      url: "https://peytspencer.com/listen",
    },
    {
      "@type": "MusicRecording",
      name: "Patience",
      byArtist: { "@type": "Person", name: "Peyt Spencer" },
      duration: "PT2M21S",
      url: "https://peytspencer.com/listen",
    },
  ],
};

export default function ListenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicRecordingSchema) }}
      />
      {children}
    </>
  );
}
