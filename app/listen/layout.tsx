import type { Metadata } from "next";

export const metadata: Metadata = {
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

const musicRecordingSchema = {
  "@context": "https://schema.org",
  "@type": "MusicPlaylist",
  name: "Peyt Spencer Discography",
  description: "Complete discography of hip-hop singles by Peyt Spencer",
  numTracks: 7,
  track: [
    {
      "@type": "MusicRecording",
      name: "Patience",
      byArtist: artistRef,
      duration: "PT3M0S",
      datePublished: "2025-09-05",
      isrcCode: "QZTAU2580674",
      inAlbum: {
        "@type": "MusicAlbum",
        name: "Patience",
        albumReleaseType: "SingleRelease",
        byArtist: artistRef,
        recordLabel: { "@type": "Organization", name: "Lyrist Records" },
      },
      url: "https://distrokid.com/hyperfollow/peytspencer/patience",
    },
    {
      "@type": "MusicRecording",
      name: "Safe",
      byArtist: artistRef,
      duration: "PT3M15S",
      datePublished: "2025-08-08",
      isrcCode: "QZWFN2526887",
      inAlbum: {
        "@type": "MusicAlbum",
        name: "Safe",
        albumReleaseType: "SingleRelease",
        byArtist: artistRef,
        recordLabel: { "@type": "Organization", name: "Lyrist Records" },
      },
      url: "https://distrokid.com/hyperfollow/peytspencer/safe",
    },
    {
      "@type": "MusicRecording",
      name: "Right One",
      byArtist: artistRef,
      duration: "PT3M30S",
      datePublished: "2025-06-20",
      isrcCode: "QZTB42525064",
      inAlbum: {
        "@type": "MusicAlbum",
        name: "Right One",
        albumReleaseType: "SingleRelease",
        byArtist: artistRef,
        recordLabel: { "@type": "Organization", name: "Lyrist Records" },
      },
      url: "https://distrokid.com/hyperfollow/peytspencer/right-one",
    },
    {
      "@type": "MusicRecording",
      name: "Where I Wanna Be",
      byArtist: artistRef,
      duration: "PT3M8S",
      datePublished: "2024-11-08",
      isrcCode: "QZWFW2494826",
      inAlbum: {
        "@type": "MusicAlbum",
        name: "Where I Wanna Be",
        albumReleaseType: "SingleRelease",
        byArtist: artistRef,
        recordLabel: { "@type": "Organization", name: "Lyrist Records" },
      },
      url: "https://distrokid.com/hyperfollow/peytspencer/where-i-wanna-be",
    },
    {
      "@type": "MusicRecording",
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
      "@type": "MusicRecording",
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
      "@type": "MusicRecording",
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
