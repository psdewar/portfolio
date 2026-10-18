export type TourCounts = { shows: number; cities: number };

export type StoryPhoto = { src: string; alt: string; width: number; height: number; blur?: string };
export type StoryHeadword = { name: string; pronunciation: string };
export type StoryParagraph = { text: string; headword?: StoryHeadword; photo?: StoryPhoto };

export const storyFullText = ({ text, headword }: StoryParagraph) =>
  headword ? `${headword.name} (${headword.pronunciation}) ${text}` : text;

export function storyParagraphs({ shows, cities }: TourCounts): StoryParagraph[] {
  return [
    {
      headword: { name: "Peyt Spencer", pronunciation: "peyt rhymes with heat" },
      text: `is a rapper and software engineer from Bellevue, Washington, often praised for an East Coast cadence reminiscent of Jay-Z. He was raised on 2000s hip-hop, from New York's Ja Rule, 50 Cent, and LL Cool J to the Midwest's Nelly, Eminem, and Kanye to the South's Ludacris, T.I., and Lil Wayne, mastering the craft as both beatmaker and wordsmith.`,
    },
    {
      text: "Much of his songwriting is inspired by the Baha'i Faith, the same Faith that took him to Veraguas, Panama, for a year of service after high school. In Santiago he lived alongside local families and helped introduce the Ruhi Institute, a community education program open to everyone.",
      photo: {
        src: "/images/story/panama.webp",
        alt: "Peyt with a local family in Veraguas, Panama",
        width: 720,
        height: 540,
        blur: "data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAAAwAgCdASoQAAwAA4BaJbACdAEU3eDvRqQknAD+9++DLNR1mJ33U49Qk9T5Ft6LqcSSpApqwBdE3dJUyVQP8hukxUaoHGONCsVeta/+KQO8bxl5lCu5Il4N4M2iwlUzhHSgAA==",
      },
    },
    {
      text: "He taught children virtues, mentored young teens, led study circles for youth and adults, and tutored reading and math. In his downtime he recorded raps on his laptop over mainstream beats.",
    },
    { text: "The first rap he ever performed was at a neighborhood gathering, in Spanish." },
    {
      text: "At the University of Florida, he threw himself into Gainesville's scene, handing out mixtape CDs, selling shirts, and performing solo, with a live band, with UF's Hip-Hop Collective, and with the theater troupe Signs of Life.",
      photo: {
        src: "/images/story/signs-of-life.webp",
        alt: "Peyt with the Signs of Life theater troupe at the University of Florida",
        width: 640,
        height: 640,
        blur: "data:image/webp;base64,UklGRnQAAABXRUJQVlA4IGgAAAAwAgCdASoQABAAA4BaJYwCdAYtf21fiLAnAAD+qeDjhqJ5Lz6FYQYeAI17iKW0UKM6hCGeLhBsz7HLxE5maznJ4Pv857M+3vPurG+AOx2RQ6s/W+yUAmO+FTvhkm3B9eEuKim7cZAAAA==",
      },
    },
    { text: "Senior year, he became a regular in NBA star Damian Lillard's weekly #4BarFriday Instagram rap challenge, and his bars caught the attention of Dame D.O.L.L.A., who reposted his videos." },
    {
      text: "After graduation he stayed in Gainesville another year testing corporate training software, then moved west to join Microsoft, where he spent the next decade as a software engineer. He kept writing bars, and turned how he writes into Lyrist, an app for songwriters to find beats and beat writer's block. During Covid, Dame brought him onto the #4BarFriday IG Cypher live.",
      photo: {
        src: "/images/story/cypher.webp",
        alt: "Peyt on the #4BarFriday IG Cypher live in 2020",
        width: 480,
        height: 480,
        blur: "data:image/webp;base64,UklGRmwAAABXRUJQVlA4IGAAAADwAQCdASoQABAAA4BaJQBOgBjROnf1+0AA/gjtoxY9X/ixFKPDrMAf4/tYX6WabK19gJGL0bi28pYpF4XxX2vB9TkCbpe67I+Hu+zrRairq0azhkHoHk228swNwFjAAAA==",
      },
    },
    { text: "Then he released one last single and stepped away from music to get married." },
    {
      text: `Four years later, he picked the mic back up, dropping new music and creating content for a couple of years. In March 2026, he launched his first solo tour, From The Ground Up, part concert and part conversation about his path of growth and the unifying principles he puts into practice. Since then he has presented ${shows} times in ${cities} cities across the US and Canada.`,
    },
    {
      text: "A year into fatherhood, he left Microsoft to go all in on his music.",
    },
  ];
}
