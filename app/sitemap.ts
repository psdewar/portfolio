export default async function sitemap() {
  const media = [
    {
      url: "https://bahaiteachings.org/relationship-hip-hop-bahai-faith",
      lastModified: new Date("03/26/2018").toISOString().split("T")[0],
    },
    {
      url: "https://youtube.com/peytspencer",
      lastModified: new Date().toISOString().split("T")[0],
    },
    {
      url: "https://youtu.be/es609on1vZI",
      lastModified: new Date("02/04/2024").toISOString().split("T")[0],
    },
    {
      url: "https://youtu.be/N5zx3JVXFwM",
      lastModified: new Date("02/04/2024").toISOString().split("T")[0],
    },
    {
      url: "https://youtu.be/tZrm30Qk6xI",
      lastModified: new Date("04/24/2020").toISOString().split("T")[0],
    },
    {
      url: "https://www.instagram.com/peytspencer",
      lastModified: new Date().toISOString().split("T")[0],
    },
    {
      url: "https://www.instagram.com/p/B_NZXQsF-Vo",
      lastModified: new Date("04/20/2020").toISOString().split("T")[0],
    },
    {
      url: "https://www.instagram.com/p/Cx0f3j0L2Fq",
      lastModified: new Date("09/30/2023").toISOString().split("T")[0],
    },
    {
      url: "https://www.instagram.com/p/CiL0YH2OVkn",
      lastModified: new Date("09/06/2022").toISOString().split("T")[0],
    },
  ];

  const routes = ["", "/idea", "/music"].map((route) => ({
    url: `https://peytspencer.${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...media];
}
