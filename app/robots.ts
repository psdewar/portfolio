import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listen", "/live", "/patron", "/hire", "/fund", "/rsvp"],
        disallow: ["/api/", "/_next/", "/admin/", "/shop/", "/journey", "/support", "*.json"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"], // Prevent AI training on personal content
      },
    ],
    sitemap: "https://peytspencer.com/sitemap.xml",
    host: "https://peytspencer.com",
  };
}
