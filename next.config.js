/** @type {import('next').NextConfig} */
const BASE = "https://distrokid.com/hyperfollow/peytspencer";
const slugs = ["where-i-wanna-be", "right-one", "safe", "patience"];

const nextConfig = {
  redirects() {
    return slugs.map((slug) => ({
      source: `/${slug}`,
      destination: `${BASE}/${slug}`,
      permanent: false,
      basePath: false,
    }));
  },
};

module.exports = nextConfig;
