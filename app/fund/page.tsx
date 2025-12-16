import projectsData from "../../data/projects.json";
import { redirect } from "next/navigation";

/**
 * /fund currently redirects to the first available project slug.
 * Future enhancement ideas:
 *  - Replace redirect with a FundList component showing all campaigns.
 *  - Add filtering or categories using project.category
 *  - Show progress summaries.
 */

export default function FundIndex() {
  const first = Object.values(projectsData)[0] as any;
  if (!first) {
    // If no projects yet, could render placeholder instead.
    return null;
  }
  redirect(`/fund/${first.slug}`);
}
