import projectsData from "../../../data/projects.json";
import { notFound } from "next/navigation";
import { ProjectView } from "../ProjectView";
import { TripFund } from "../TripFund";
import PrivateNudgeToast from "../PrivateNudgeToast";
import HashScroll from "../HashScroll";
import ArtistIntro from "../../components/ArtistIntro";
import { getLeg, getLegs, toFundView, FUND_LEGS, type FundBooked } from "../legs";
import {
  getShows,
  isShowOnTrip,
  isShowListable,
  isShowDraft,
  needsHostLocation,
  getVenueLabel,
  isResidence,
} from "../../lib/shows";
import { confirmPath } from "../../lib/confirm";
import { getFundingStats } from "../../lib/funding";
import { doorTimeMinutes, isDatePast, parseLocalDate } from "../../lib/dates";
import { getFeaturedGalleryItems } from "../../api/shared/moments";
import type { Metadata, Viewport } from "next";

// Use ISR with 1 hour TTL + on-demand revalidation from webhooks
export const revalidate = 3600;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const fund = toFundView(await getLeg(slug));
  if (fund) {
    const title = `Support my rap concert tour for all ages in ${fund.destination}`;
    const description = `From The Ground Up: My Path of Growth and the Principles that Connect Us by rapper and software engineer Peyt Spencer`;
    const url = `https://peytspencer.com/fund/${fund.slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        url,
        title,
        description,
        images: [
          {
            url: `https://peytspencer.com/api/og/fund/${fund.slug}`,
            width: 900,
            height: 1600,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [`https://peytspencer.com/api/og/fund/${fund.slug}`],
      },
    };
  }

  const projects = projectsData as Record<string, any>;
  const project = projects[slug];

  if (!project) {
    return { title: "Project Not Found" };
  }

  const title = project.title;
  const description =
    project.tagline || `Support ${project.title} - an independent project by Peyt Spencer`;
  const ogImage = `https://peytspencer.com/api/og/fund/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

function lastCluster(dates: string[]): string[] {
  if (dates.length === 0) return [];
  const cluster = [dates[dates.length - 1]];
  for (let i = dates.length - 2; i >= 0; i--) {
    const gapDays =
      (parseLocalDate(cluster[0]).getTime() - parseLocalDate(dates[i]).getTime()) / 86400000;
    if (gapDays > 14) break;
    cluster.unshift(dates[i]);
  }
  return cluster;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; nudge?: string; og?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const fund = toFundView(await getLeg(slug));
  if (fund) {
    // Date and venue come from the real shows tagged into this leg; the leg's
    // authored `booked` is only a fallback until shows are linked. Private
    // shows are fine here (the page is unlisted), and so are unlisted bookings:
    // isShowOnTrip keeps every real stop and only drops drafts and cancellations.
    const shows = await getShows();
    const galleryItems = await getFeaturedGalleryItems(slug);
    const today = new Date().toISOString().slice(0, 10);
    const legShows = shows
      .filter((s) => s.leg === slug && isShowOnTrip(s))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime() ||
          doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime),
      );
    const toBooked = (s: (typeof shows)[number]): FundBooked => {
      const venue = isResidence(s)
        ? s.venueLabel || `${s.city}, ${s.region}`
        : (getVenueLabel(s) ?? s.venue ?? s.city);
      return {
        slug: s.slug,
        venue,
        eventName: s.eventName ?? null,
        place: [s.city, s.region].filter(Boolean).join(", "),
        date: s.date,
        doorTime: s.doorTime,
        private: s.visibility === "private",
      };
    };
    const legShowDates = new Set(legShows.map((s) => s.date));
    const openInvites: FundBooked[] = shows
      .filter(
        (s) =>
          s.leg === slug &&
          isShowDraft(s) &&
          needsHostLocation(s) &&
          s.status !== "cancelled" &&
          s.date >= today &&
          !legShowDates.has(s.date),
      )
      .map((s) => ({ venue: "Open", date: s.date, hostHref: confirmPath(s.slug) }));
    const derived: FundBooked[] = [...legShows.map(toBooked), ...openInvites].sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") ||
        doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime),
    );
    const booked = derived.length ? derived : fund.booked;

    const legs = await getLegs();
    const legRanges = new Map<string, { start: string; end: string; destination: string }>();
    for (const l of legs) {
      if (!l.fund) continue;
      const dates = shows
        .filter((s) => s.leg === l.slug && isShowOnTrip(s))
        .map((s) => s.date)
        .sort();
      const cluster = lastCluster(dates);
      if (cluster.length) {
        legRanges.set(l.slug, {
          start: cluster[0],
          end: cluster[cluster.length - 1],
          destination: l.fund.destination,
        });
      }
    }
    const page = legRanges.get(slug);
    const pageDone = Boolean(page && page.end < today);
    const otherRanges = [...legRanges.entries()].filter(([s]) => s !== slug);
    const byStart = (a: (typeof otherRanges)[number], b: (typeof otherRanges)[number]) =>
      a[1].start.localeCompare(b[1].start);
    const nextCandidate = pageDone
      ? otherRanges.filter(([, r]) => r.end >= today).sort(byStart)[0]
      : page
        ? otherRanges.filter(([, r]) => r.start > page.end).sort(byStart)[0]
        : undefined;
    const nextLabel: "Up next" | "After this" = pageDone ? "Up next" : "After this";
    const pageStart = page?.start ?? "9999-12-31";
    const prevCandidate = otherRanges
      .filter(([, r]) => r.start < pageStart)
      .sort((a, b) => byStart(b, a))[0];
    const prevStops = prevCandidate
      ? shows
          .filter((s) => s.leg === prevCandidate[0] && isShowOnTrip(s))
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .map(toBooked)
      : [];
    const prevTrip =
      prevCandidate && prevStops.some((b) => b.date && isDatePast(b.date))
        ? { slug: prevCandidate[0], destination: prevCandidate[1].destination, stops: prevStops }
        : undefined;
    const tripCard = nextCandidate
      ? { slug: nextCandidate[0], destination: nextCandidate[1].destination, label: nextLabel }
      : prevTrip
        ? { slug: prevTrip.slug, destination: prevTrip.destination, label: "Before this" as const }
        : undefined;
    return (
      <>
        {sp?.nudge === "private" && <PrivateNudgeToast destination={fund.destination} />}
        <HashScroll />
        <TripFund
          leg={{ ...fund, booked }}
          intro={<ArtistIntro tourStops={false} />}
          og={sp?.og === "true"}
          nextTrip={tripCard}
          prevTrip={prevTrip}
          concertsSoFar={shows.filter((s) => isShowListable(s) && isDatePast(s.date)).length}
          galleryItems={galleryItems}
        />
      </>
    );
  }

  const projects = projectsData as Record<string, any>;
  const project = projects[slug];
  if (!project) {
    notFound();
  }
  // Use cached stats with 60s TTL for better performance
  const stats = await getFundingStats(project.slug);
  const success = sp?.success === "1" || sp?.success === "true";
  return <ProjectView project={project} stats={stats} success={success} />;
}

// Pre-generate seed leg and project slugs (SSG); chorus-created legs render
// on demand via dynamicParams (Next default).
export function generateStaticParams() {
  const legParams = Object.keys(FUND_LEGS).map((slug) => ({ slug }));
  const projectParams = Object.values(projectsData).map((p: any) => ({ slug: p.slug }));
  return [...legParams, ...projectParams];
}
