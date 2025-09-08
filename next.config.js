/** @type {import('next').NextConfig} */
const BASE = "https://distrokid.com/hyperfollow/peytspencer";
const slugs = ["where-i-wanna-be", "right-one", "safe", "patience"];

const nextConfig = {
  redirects() {
    const others = [
      {
        source: "/resume",
        destination: "https://1drv.ms/b/s!AoIPBhqDp9yHmA9fBA23hBAHNHv-",
        permanent: false,
        basePath: false,
      },
    ];
    const slugRedirects = slugs.map((slug) => ({
      source: `/${slug}`,
      destination: `${BASE}/${slug}`,
      permanent: false,
      basePath: false,
    }));

    return [...others, ...slugRedirects];
  },
};

module.exports = nextConfig;
