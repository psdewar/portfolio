const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const BASE = "https://distrokid.com/hyperfollow/peytspencer";
const singles = require("./data/singles.json");
const customUrls = {
  bahai: "cWLQ",
};

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "distrokid.com" },
      { protocol: "https", hostname: "distrokid.imgix.net" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
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

    const pdfRedirects = [
      {
        source: "/resume",
        destination: "/resume.pdf",
        permanent: false,
      },
      {
        source: "/peer-reviews",
        destination: "/peer-reviews.pdf",
        permanent: false,
      },
    ];

    return [...singlesRedirects, ...pdfRedirects];
  },
  async rewrites() {
    return [
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
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac|rtf|doc|docx)$$/,
      use: {
        loader: "file-loader",
        options: {
          name: "static/media/[name].[hash].[ext]",
          publicPath: "/_next/",
        },
      },
    });
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
