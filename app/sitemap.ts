import type { MetadataRoute } from "next";
import projectsData from "../data/projects.json";
import singles from "../data/singles.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://peytspencer.com";

  const staticPages = [
    { path: "/", priority: 1.0 },
    { path: "/listen", priority: 0.9 },
    { path: "/live", priority: 0.8 },
    { path: "/support", priority: 0.8 },
    { path: "/rsvp", priority: 0.8 },
    { path: "/hire", priority: 0.6 },
  ];

  const trackSlugs = (singles as string[]).map((slug) => ({
    path: `/${slug}`,
    priority: 0.7,
  }));

  const projectSlugs = Object.values(projectsData).map((p: any) => ({
    path: `/fund/${p.slug}`,
    priority: 0.7,
  }));

  return [...staticPages, ...trackSlugs, ...projectSlugs].map((p) => ({
    url: `${base}${p.path}`,
    changeFrequency: "weekly" as const,
    priority: p.priority,
  }));
}
