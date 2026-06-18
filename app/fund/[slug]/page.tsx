import projectsData from "../../../data/projects.json";
import { notFound } from "next/navigation";
import { ProjectView } from "../ProjectView";
import { FundFunnel } from "../FundFunnel";
import ArtistIntro from "../../components/ArtistIntro";
import { getFundLeg, FUND_LEGS } from "../legs";
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

  const leg = getFundLeg(slug);
  if (leg) {
    const title = `Go in with me · ${leg.destination} · From the Ground Up`;
    const description = `A Microsoft engineer who raps, bringing a live concert-conversation to ${leg.destination}. Here is what I am putting in, and the pieces still open.`;
    const url = `https://peytspencer.com/fund/${leg.slug}`;
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
            url: `https://peytspencer.com/api/og/fund/${leg.slug}`,
            width: 900,
            height: 1600,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        images: [`https://peytspencer.com/api/og/fund/${leg.slug}`],
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
  searchParams: Promise<{ success?: string }>;
}) {
  const { slug } = await params;

  const leg = getFundLeg(slug);
  if (leg) {
    return <FundFunnel leg={leg} intro={<ArtistIntro />} />;
  }

  const resolvedSearchParams = await searchParams;
  const projects = projectsData as Record<string, any>;
  const project = projects[slug];
  if (!project) {
    notFound();
  }
  // Use cached stats with 60s TTL for better performance
  const stats = await getFundingStats(project.slug);
  const success = resolvedSearchParams?.success === "1" || resolvedSearchParams?.success === "true";
  return <ProjectView project={project} stats={stats} success={success} />;
}

// Pre-generate tour-leg and project slugs (SSG) so future additions are simple.
export function generateStaticParams() {
  const legParams = Object.keys(FUND_LEGS).map((slug) => ({ slug }));
  const projectParams = Object.values(projectsData).map((p: any) => ({ slug: p.slug }));
  return [...legParams, ...projectParams];
}
