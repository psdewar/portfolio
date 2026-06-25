import projectsData from "../../../data/projects.json";
import { notFound } from "next/navigation";
import { ProjectView } from "../ProjectView";
import { FundFunnel } from "../FundFunnel";
import PrivateNudgeToast from "../PrivateNudgeToast";
import HashScroll from "../HashScroll";
import ArtistIntro from "../../components/ArtistIntro";
import { getLeg, toFundView, FUND_LEGS, type FundBooked } from "../legs";
import { getShows, isShowListable, getVenueLabel, isResidence } from "../../lib/shows";
import { getFundingStats } from "../../lib/funding";
import type { Metadata } from "next";

// Use ISR with 1 hour TTL + on-demand revalidation from webhooks
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const fund = toFundView(await getLeg(slug));
  if (fund) {
    const title = `Help fund my concert-conversation in ${fund.destination}`;
    const description = `From The Ground Up: My Path of Growth and the Principles that Connect Us by Microsoft engineer Peyt Spencer`;
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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; nudge?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const fund = toFundView(await getLeg(slug));
  if (fund) {
    // Date and venue come from the real shows tagged into this leg; the leg's
    // authored `booked` is only a fallback until shows are linked. Private
    // shows are fine here (the page is unlisted) — listable excludes drafts.
    const shows = await getShows();
    const legShows = shows
      .filter((s) => s.leg === slug && isShowListable(s))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const derived: FundBooked[] = legShows.map((s) => ({
      slug: s.slug,
      venue: isResidence(s) ? s.venueLabel || `${s.city}, ${s.region}` : getVenueLabel(s) ?? s.city,
      date: s.date,
      doorTime: s.doorTime,
      private: s.visibility === "private",
    }));
    const booked = derived.length ? derived : fund.booked;
    return (
      <>
        {sp?.nudge === "private" && <PrivateNudgeToast destination={fund.destination} />}
        <HashScroll />
        <FundFunnel leg={{ ...fund, booked }} intro={<ArtistIntro />} />
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
