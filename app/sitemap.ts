import type { MetadataRoute } from "next";

const pages = [{ path: "/" }, { path: "/music" }, { path: "/idea" }];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://peytspencer.com";
  return pages.map((p) => ({ url: `${base}${p.path}` }));
}
