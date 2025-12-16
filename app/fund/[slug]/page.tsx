import projectsData from "../../../data/projects.json";
import { notFound } from "next/navigation";
import { ProjectView } from "../ProjectView";
import { getFundingStats } from "../../lib/funding";
import type { Metadata } from "next";

// Use ISR with 60s revalidation instead of force-dynamic for better performance
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const projects = projectsData as Record<string, any>;
  const project = projects[params.slug];

  if (!project) {
    return { title: "Project Not Found" };
  }

  const title = project.title;
  const description =
    project.tagline || `Support ${project.title} - an independent project by Peyt Spencer`;
  const ogImage = `https://peytspencer.com/api/og/fund/${params.slug}`;

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
  params: { slug: string };
  searchParams: { success?: string; session_id?: string };
}) {
  const projects = projectsData as Record<string, any>;
  const project = projects[params.slug];
  if (!project) {
    notFound();
  }
  // Use cached stats with 60s TTL for better performance
  const stats = await getFundingStats(project.slug);
  const success = searchParams?.success === "1" || searchParams?.success === "true";
  const sessionId = searchParams?.session_id || null;
  return <ProjectView project={project} stats={stats} success={success} sessionId={sessionId} />;
}

// Pre-generate all project slugs (SSG) so future additions are simple.
export function generateStaticParams() {
  return Object.values(projectsData).map((p: any) => ({ slug: p.slug }));
}
