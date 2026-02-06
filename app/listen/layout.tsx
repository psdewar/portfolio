import type { Metadata } from "next";
import { TRACK_DATA } from "../data/tracks";

export const metadata: Metadata = {
  alternates: { canonical: "/listen" },
  title: "Listen",
  description:
    "Stream Peyt Spencer's hip-hop singles. Patience, Safe, Right One, Where I Wanna Be, and more. Bellevue rapper since 2018.",
  openGraph: {
    title: "Listen | Peyt Spencer",
    description:
      "Stream hip-hop singles by Peyt Spencer. Patience, Safe, Right One, Where I Wanna Be, and more.",
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
    description:
      "Stream hip-hop singles by Peyt Spencer. Patience, Safe, Right One, Where I Wanna Be, and more.",
    images: ["https://peytspencer.com/api/og/listen"],
  },
};

const artistRef = {
  "@type": "MusicGroup",
  name: "Peyt Spencer",
  "@id": "https://peytspencer.com/#artist",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

const publicSingles = TRACK_DATA.filter((t) => t.releaseDate && t.isrc);

// Tracks with full distribution data — generated from TRACK_DATA
const generatedTracks = publicSingles.map((t) => ({
  "@type": "MusicRecording" as const,
  name: t.title,
  byArtist: artistRef,
  ...(t.duration ? { duration: formatDuration(t.duration) } : {}),
  datePublished: t.releaseDate,
  isrcCode: t.isrc,
  inAlbum: {
    "@type": "MusicAlbum",
    name: t.title,
    albumReleaseType: "SingleRelease",
    byArtist: artistRef,
    ...(t.label ? { recordLabel: { "@type": "Organization", name: t.label } } : {}),
  },
  ...(t.streamUrl ? { url: t.streamUrl } : {}),
}));

// Older singles not in TRACK_DATA (no audio hosted on site)
const legacyTracks = [
  {
    "@type": "MusicRecording" as const,
    name: "Critical Race Theory",
    byArtist: artistRef,
    datePublished: "2020-09-11",
    isrcCode: "QZK6J2099169",
    inAlbum: {
      "@type": "MusicAlbum",
      name: "Critical Race Theory",
      albumReleaseType: "SingleRelease",
      byArtist: artistRef,
    },
  },
  {
    "@type": "MusicRecording" as const,
    name: "Better Days",
    byArtist: artistRef,
    datePublished: "2019-12-12",
    isrcCode: "QZK6P1951673",
    inAlbum: {
      "@type": "MusicAlbum",
      name: "Better Days",
      albumReleaseType: "SingleRelease",
      byArtist: artistRef,
    },
  },
  {
    "@type": "MusicRecording" as const,
    name: "Baha'i",
    byArtist: artistRef,
    datePublished: "2018-03-20",
    isrcCode: "QZBRF1896081",
    inAlbum: {
      "@type": "MusicAlbum",
      name: "Baha'i",
      albumReleaseType: "SingleRelease",
      byArtist: artistRef,
    },
  },
];

const allTracks = [...generatedTracks, ...legacyTracks];

const musicRecordingSchema = {
  "@context": "https://schema.org",
  "@type": "MusicPlaylist",
  name: "Peyt Spencer Discography",
  description: "Complete discography of hip-hop singles by Peyt Spencer",
  numTracks: allTracks.length,
  track: allTracks,
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
