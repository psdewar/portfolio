import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listen", "/shop", "/hire", "/fund"],
        disallow: ["/api/", "/_next/", "/admin/", "*.json"],
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
