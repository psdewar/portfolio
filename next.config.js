const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const BASE = "https://distrokid.com/hyperfollow/peytspencer";
const slugs = require("./data/slugs.json");
const customUrls = {
  bahai: "cWLQ",
};

const nextConfig = {
  images: {
    domains: ["distrokid.com", "distrokid.imgix.net"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
  redirects() {
    return slugs.map((slug) => ({
      source: `/${slug}`,
      destination: `${BASE}/${customUrls[slug] || slug}`,
      permanent: false,
      basePath: false,
    }));
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg|mp3|wav|flac|aac|rtf|doc|docx)$/,
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
