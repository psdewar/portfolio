import SingleCard from "../sponsor/confirm/[slug]/SingleCard";
import TourStops from "./TourStops";
import { getShows, isShowListable } from "../lib/shows";
import EnergyClips, { type EnergyClip } from "./EnergyClips";

// Newest first. Each caption highlights a different facet of the act.
const ENERGY_CLIPS: EnergyClip[] = [
  {
    label: "Bringing people together",
    src: "https://assets.peytspencer.com/videos/concert-fulton-md.mp4",
    poster: "https://assets.peytspencer.com/videos/concert-fulton-md-poster.jpg",
  },
  {
    label: "Celebrating life's milestones",
    src: "https://assets.peytspencer.com/videos/concert-so-gone-mexico-30sec.mp4",
    poster: "https://assets.peytspencer.com/videos/concert-so-gone-mexico-30sec-poster.jpg",
  },
  {
    label: "Uplifting every generation",
    src: "https://assets.peytspencer.com/videos/concert-ftgu-intro-2-15sec.mp4",
    poster: "/images/covers/intro-video-cover.jpg",
  },
];

export default async function ArtistIntro() {
  const tourShows = (await getShows())
    .filter(isShowListable)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <>
      <section>
        <EnergyClips title="My Energy" clips={ENERGY_CLIPS} />
      </section>

      <section>
        <h3 className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
          A single from my set
        </h3>
        <SingleCard />
      </section>

      <section>
        <h3 className="text-xs text-neutral-400 uppercase tracking-wider mb-2">My story</h3>
        <div className="space-y-3 text-base leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-prose">
          <p>
            {"Peyt Spencer (peyt rhymes with heat) is a rapper and software engineer from Bellevue, Washington, often praised for his East Coast cadence reminiscent of Jay-Z. Raised on 2000s hip-hop from Ja Rule and LL Cool J to Ludacris and T.I., he mastered the craft while changing the subject. He's now taking his From The Ground Up tour across North America: part concert, part conversation about his path of growth, applying universal principles for a well-rounded life."}
          </p>
          <p>
            {"Much of his songwriting is inspired by the Baha'i Faith, the same Faith that guided him on a year of service in Veraguas, Panama, after high school. He lived alongside families in Santiago, teaching virtues to children, animating peer-led groups of early adolescents, facilitating study circles for youth and adults, and tutoring reading and math. During his downtime, he recorded raps on his laptop over mainstream beats. His first performed rap ever was in Spanish, at a community gathering."}
          </p>
          <p>
            {"After completing his year of service, he attended the University of Florida, where he immersed himself in Gainesville's local scene, handing out mixtape CDs, selling shirts, and performing solo, with a live band, and as a member of both UF's Hip-Hop Collective and the theater troupe Signs of Life."}
          </p>
          <p>
            {"During his senior year, he became a regular participant in NBA star Damian Lillard's weekly #4BarFriday Instagram rap challenge. After graduation, he landed a software testing job in Gainesville and stayed another year before moving to the West Coast to join Microsoft, where he's spent the last decade as a software engineer. His bars eventually caught the attention of Dame D.O.L.L.A., who reposted his videos and featured him live on the #4BarFriday IG Cypher during Covid. Soon after, he released one last single before stepping away from music to focus on family and his tech career."}
          </p>
          <p>
            {"Four years later, he returned with the maturity to wear every hat his independence demands. Music and code are his life's work. He founded Lyrist to help other songwriters find beats and beat writer's block, and is the entire team behind his own catalog, tour, merch, and live streams."}
          </p>
        </div>
      </section>

      {tourShows.length > 0 && (
        <section className="max-w-lg">
          <TourStops shows={tourShows} variant="label" />
        </section>
      )}
    </>
  );
}
