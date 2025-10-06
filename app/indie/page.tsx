import projectsData from "../../data/projects.json";
import { redirect } from "next/navigation";

/**
 * /indie currently redirects to the first available project slug.
 * Future enhancement ideas:
 *  - Replace redirect with an IndieList component showing all campaigns.
 *  - Add filtering or categories using project.category
 *  - Show progress summaries.
 */

export default function IndieIndex() {
  const first = Object.values(projectsData)[0] as any;
  if (!first) {
    // If no projects yet, could render placeholder instead.
    return null;
  }
  redirect(`/indie/${first.slug}`);
}
