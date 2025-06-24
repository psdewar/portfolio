import Image from "next/image";
import concert from "public/images/home/concert.jpg";
import happy from "public/images/home/happy.jpg";
import hike from "public/images/home/hike.jpg";
import lunch from "public/images/home/lunch.jpg";
import summer from "public/images/home/summer.jpg";
import tennis from "public/images/home/tennis.jpg";
import { EmbedLillard, EmbedTroglodyte } from "./Embed";
import { Badge } from "./Badge";
import { PageLink } from "./PageLink";
import { Footer } from "./Footer";

function LyristIcon() {
  return (
    <span className="not-prose">
      <Badge href="https://lyrist.app">
        <svg width="13" height="11" role="img" aria-label="Lyrist logo" className="mr-0.5">
          <use href="/sprite.svg#lyrist" />
        </svg>
        Lyrist
      </Badge>
    </span>
  );
}

export default function Page() {
  return (
    <>
      <section className="mb-40">
        <h1 className="mb-4 text-2xl font-medium">
          {`What's up! 🤓`}
          <p className="text-base text-neutral-400">peyt rhymes with heat</p>
        </h1>
        <p className="prose-neutral dark:prose-invert mb-4">
          {`Friends call me Peyt. Family calls me Peyt Spencer. I'm a full-stack software engineer, hip-hop artist, and Baha'i. I founded `}
          <LyristIcon />
          {`, a smart toolkit for songwriters to find beats, get suggestions, and overcome writer's block. I also work at Microsoft on the Azure team helping revamp our web and mobile on-call platform.`}
        </p>
        <PageLink
          newTab
          name={"💻 '25Resume.pdf"}
          slug="https://1drv.ms/b/s!AoIPBhqDp9yHmA9fBA23hBAHNHv-"
        />
        <div className="grid grid-cols-2 grid-rows-4 sm:grid-rows-3 sm:grid-cols-3 gap-4 my-4">
          <div className="relative row-span-2">
            <Image
              alt="My tennis racquet"
              src={tennis}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover sm:object-center"
            />
          </div>
          <div className="relative h-40">
            <Image
              alt="Me sitting with a smile at a conference"
              src={happy}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover"
            />
          </div>
          <div className="relative row-span-2">
            <Image
              alt="Me wearing an oversized white hat in New York"
              src={summer}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover"
            />
          </div>
          <div className="relative sm:row-span-2 row-span-1">
            <Image
              alt="Me wearing sunglasses at lunch"
              src={lunch}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover object-bottom sm:object-top"
            />
          </div>
          <div className="relative">
            <Image
              alt="Me rapping on stage at the Eastside Baha'i Center"
              src={concert}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover"
            />
          </div>
          <div className="relative h-40">
            <Image
              alt="Me on a hike"
              src={hike}
              fill
              sizes="(max-width: 768px) 213px, 33vw"
              priority
              className="rounded-lg object-cover"
            />
          </div>
        </div>
        <div className="prose-neutral dark:prose-invert mb-4">
          <p>
            {`I have been able to blend my love for music with my skills in app development as founder of Lyrist, which I conceived while crafting verses to instrumentals on YouTube and saw that people were commenting their lyrics for entire songs. This was when I participated in #4BarFridays, a weekly Instagram rap challenge hosted by Damian Lillard who was still playing for the Portland Trail Blazers:`}
          </p>
        </div>
        <EmbedLillard />
        <PageLink name="🎵 Check out my music" slug="music" />
        <div className="prose-neutral dark:prose-invert my-4">
          <p>
            {`I wanted to support iOS and Android without writing separate code for each platform and found React Native as a cross-platform solution, the evolution of which I have observed and experienced. Expo has become the standard React Native framework for creating new apps. Upgrading to newer versions of React Native is less of a pain. Its collaborative and innovative ecosystem has made building apps like Lyrist enjoyable. Sharing that same joy with others is fun and impactful.`}
          </p>
        </div>
        <PageLink name="💡 Tell me your idea" slug="idea" />
        <div className="prose-neutral dark:prose-invert my-4">
          <p>
            {`Drawing from a lifetime of coding and musical experience, I am pursuing solopreneurship to help others bring their vision to life. If you create content, manage social media, make music, or build apps, `}
            <a className="email" href="mailto:psdewar2@gmail.com">
              {`let's connect`}
            </a>
            {` and innovate! Before you leave, here are some vulnerable thoughts from a modern man:`}
          </p>
        </div>
        <EmbedTroglodyte />
      </section>
      <Footer />
    </>
  );
}
