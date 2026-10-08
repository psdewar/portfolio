import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUpcomingShows } from "../lib/shows";
import { withPosterLines } from "../fund/legs";
import { toRsvpShow } from "../lib/rsvp-show";
import { readUtmFrom } from "../lib/utm";
import { RSVP_INTRO } from "../lib/videos.config";
import RSVPShell from "./RSVPShell";

const title = "RSVP | From The Ground Up";
const description =
  "RSVP for From The Ground Up - a rap concert and a conversation by Microsoft alum Peyt Spencer. Pay what you want.";

// SoCal intro texts get a video-frame preview; every other /rsvp request keeps the layout's poster.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  if (params.intro !== "1" || params.utm_campaign !== "socal") return {};

  return {
    openGraph: {
      title,
      description,
      images: [{ url: RSVP_INTRO.ogSocal, width: 1080, height: 1920 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [RSVP_INTRO.ogSocal],
    },
  };
}

export default async function RSVPPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const shows = await withPosterLines(await getUpcomingShows());

  if (shows.length === 0) {
    redirect("/support?success=no_shows");
  }

  const rsvpable = shows.filter((s) => s.visibility !== "private");

  if (!params.submitted && rsvpable.length === 1) {
    const qs = new URLSearchParams(readUtmFrom(new URLSearchParams(params as Record<string, string>)) as Record<string, string>).toString();
    redirect(`/rsvp/${rsvpable[0].slug}${qs ? `?${qs}` : ""}`);
  }

  return <RSVPShell shows={shows.map(toRsvpShow)} slug={params.submitted} />;
}
