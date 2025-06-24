export default async function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const media = [
    {
      url: "https://bahaiteachings.org/relationship-hip-hop-bahai-faith",
      lastModified: new Date("03/26/2018").toISOString().slice(0, 10),
    },
    {
      url: "https://youtube.com/peytspencer",
      lastModified: today,
    },
    {
      url: "https://youtu.be/es609on1vZI",
      lastModified: new Date("02/04/2024").toISOString().slice(0, 10),
    },
    {
      url: "https://youtu.be/N5zx3JVXFwM",
      lastModified: new Date("02/04/2024").toISOString().slice(0, 10),
    },
    {
      url: "https://youtu.be/tZrm30Qk6xI",
      lastModified: new Date("04/24/2020").toISOString().slice(0, 10),
    },
    {
      url: "https://www.instagram.com/peytspencer",
      lastModified: today,
    },
    {
      url: "https://www.instagram.com/p/B_NZXQsF-Vo",
      lastModified: new Date("04/20/2020").toISOString().slice(0, 10),
    },
    {
      url: "https://www.instagram.com/p/Cx0f3j0L2Fq",
      lastModified: new Date("09/30/2023").toISOString().slice(0, 10),
    },
    {
      url: "https://www.instagram.com/p/CiL0YH2OVkn",
      lastModified: new Date("09/06/2022").toISOString().slice(0, 10),
    },
  ];

  const routes = ["", "idea", "music"].map((route) => ({
    url: `https://peytspencer.com/${route}`,
    lastModified: today,
  }));

  return [...routes, ...media];
}
