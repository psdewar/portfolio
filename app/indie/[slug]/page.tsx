import projectsData from "../../../data/projects.json";
import { notFound } from "next/navigation";
import { ProjectView } from "../ProjectView";
import { getFundingStats, clearFundingCache } from "../../lib/funding";

export const dynamic = "force-dynamic";

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
  // Clear cached stats each render (short-term approach for immediate freshness)
  clearFundingCache(project.slug);
  const stats = await getFundingStats(project.slug);
  const success = searchParams?.success === "1" || searchParams?.success === "true";
  const sessionId = searchParams?.session_id || null;
  return <ProjectView project={project} stats={stats} success={success} sessionId={sessionId} />;
}

// Pre-generate all project slugs (SSG) so future additions are simple.
export function generateStaticParams() {
  return Object.values(projectsData).map((p: any) => ({ slug: p.slug }));
}
