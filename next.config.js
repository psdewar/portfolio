const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const BASE = "https://distrokid.com/hyperfollow/peytspencer";
const singles = require("./data/singles.json");
const customUrls = {
  bahai: "cWLQ",
};

const chromiumBin = ["node_modules/@sparticuz/chromium/bin/**"];
const posterAssets = [
  "public/Jan23OpenMicNight-08_Original.jpg",
  "public/lyrist-trademark-white.png",
  "public/images/home/**",
  "public/fonts/**",
];
const posterBundle = [...chromiumBin, ...posterAssets];

const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/og": posterBundle,
    "/api/og/listen": posterBundle,
    "/api/og/live": posterBundle,
    "/api/og/support": posterBundle,
    "/api/og/hire": posterBundle,
    "/api/og/shop": posterBundle,
    "/api/og/fund": chromiumBin,
    "/api/og/fund/*": chromiumBin,
    "/api/og/rsvp": posterBundle,
    "/api/og/rsvp/*": posterBundle,
    "/api/poster": posterBundle,
    "/api/poster/*": posterBundle,
    "/api/pamphlet": posterBundle,
    "/api/sponsor-pdf": chromiumBin,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "distrokid.com" },
      { protocol: "https", hostname: "distrokid.imgix.net" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "assets.peytspencer.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  redirects() {
    const singlesRedirects = singles.map((slug) => ({
      source: `/${slug}`,
      destination: `${BASE}/${customUrls[slug] || slug}`,
      permanent: false,
      basePath: false,
    }));

    const pressRedirect = {
      source: "/press",
      destination: "https://lyrist.app/records/peyt-spencer",
      permanent: true,
    };

    const aliasRedirects = [
      { source: "/music", destination: "/listen", permanent: true },
      { source: "/songs", destination: "/listen", permanent: true },
      { source: "/tracks", destination: "/listen", permanent: true },
      { source: "/patron", destination: "/support", permanent: true },
      { source: "/fund", destination: "/support", permanent: true },
      { source: "/journey", destination: "/support", permanent: true },
      { source: "/join", destination: "/support", permanent: true },
      { source: "/subscribe", destination: "/support", permanent: true },
      { source: "/membership", destination: "/support", permanent: true },
      { source: "/shows", destination: "/live", permanent: true },
      { source: "/events", destination: "/live", permanent: true },
      { source: "/concert", destination: "/live", permanent: true },
      { source: "/concerts", destination: "/live", permanent: true },
      {
        source: "/2025/singles-and-16s",
        destination: "/api/download/pack?file=singles-16s-2025",
        permanent: false,
      },
      // Sponsor OG serves a static cover image; other /api/og/* routes are screenshot handlers.
      {
        source: "/api/og/sponsor",
        destination: "/images/covers/intro-video-cover.jpg",
        permanent: false,
      },
      {
        source: "/api/og/sponsor/host",
        destination: "/images/covers/intro-video-cover.jpg",
        permanent: false,
      },
    ];

    return [...singlesRedirects, pressRedirect, ...aliasRedirects];
  },
  async rewrites() {
    return [
      {
        source: "/resume",
        destination: "/resume.pdf",
      },
      {
        source: "/peer-reviews",
        destination: "/peer-reviews.pdf",
      },
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  turbopack: {},
};

module.exports = withBundleAnalyzer(nextConfig);
