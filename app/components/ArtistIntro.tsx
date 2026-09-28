import SingleCard from "../host/[slug]/SingleCard";
import StoryReadMore from "./StoryReadMore";
import TourStops from "./TourStops";
import { getShows, listableShows } from "../lib/shows";
import EnergyVideos from "./EnergyVideos";
import { ENERGY_VIDEO_IDS } from "../lib/videos.config";
import { STORY } from "../data/story";

export default async function ArtistIntro({ tourStops = true }: { tourStops?: boolean }) {
  const tourShows = listableShows(await getShows());

  return (
    <>
      <section>
        <EnergyVideos title="My Energy" videoIds={ENERGY_VIDEO_IDS} />
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
          <StoryReadMore paragraphs={STORY} />
        </div>
      </section>

      {tourStops && tourShows.length > 0 && (
        <section className="max-w-md">
          <TourStops shows={tourShows} variant="label" />
        </section>
      )}
    </>
  );
}
