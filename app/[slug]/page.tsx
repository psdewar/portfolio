import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TRACK_DATA } from "../data/tracks";
import singles from "../../data/singles.json";
import TrackRedirect from "./TrackRedirect";

export const dynamicParams = false;

export function generateStaticParams() {
  return (singles as string[]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const track = TRACK_DATA.find((t) => t.id === slug);
  if (!track) return {};

  const title = `${track.title} by ${track.artist}`;
  const description = `Listen to ${track.title} by ${track.artist}`;
  const url = `https://peytspencer.com/${slug}`;
  const image = `https://peytspencer.com/api/og/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Peyt Spencer",
      type: "music.song",
      ...(track.duration ? { duration: track.duration } : {}),
      musicians: ["https://peytspencer.com/#artist"],
      images: [{ url: image, width: 800, height: 800, alt: `${track.title} cover` }],
    },
    twitter: {
      // 'summary' is square; 'summary_large_image' would crop the 1:1 album art.
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}

function formatDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const track = TRACK_DATA.find((t) => t.id === slug);
  if (!track) notFound();

  const isoDuration = formatDuration(track.duration);
  const artistRef = {
    "@type": "MusicGroup",
    name: "Peyt Spencer",
    "@id": "https://peytspencer.com/#artist",
  };
  const recording = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: track.title,
    byArtist: artistRef,
    url: `https://peytspencer.com/${slug}`,
    image: `https://peytspencer.com/api/og/${slug}`,
    ...(isoDuration ? { duration: isoDuration } : {}),
    ...(track.releaseDate ? { datePublished: track.releaseDate } : {}),
    ...(track.isrc ? { isrcCode: track.isrc } : {}),
    inAlbum: {
      "@type": "MusicAlbum",
      name: track.title,
      albumReleaseType: "SingleRelease",
      byArtist: artistRef,
      ...(track.label
        ? { recordLabel: { "@type": "Organization", name: track.label } }
        : {}),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recording) }}
      />
      <TrackRedirect slug={slug} title={track.title} artist={track.artist} />
    </>
  );
}
