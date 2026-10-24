import type { Metadata } from "next";
import Image from "next/image";
import BeatPlayer from "./BeatPlayer";

const description =
  "Songwriting, beatmaking, and piano lessons with Peyt Spencer, a rapper and producer in Bellevue, WA. In person or online.";

export const metadata: Metadata = {
  title: "Music Lessons",
  description,
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Music Lessons | Peyt Spencer",
    description,
    url: "/learn",
    images: ["https://peytspencer.com/og/home.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Music Lessons | Peyt Spencer",
    description,
    images: ["https://peytspencer.com/og/home.jpeg"],
  },
};

const section = "py-10";
const h2 = "mb-5 text-[24px] font-semibold leading-[1.3] text-black dark:text-white";
const dt = "font-semibold text-black dark:text-white";
const dd = "mb-[18px] [@media(min-width:600px)]:mb-0";

export default function LearnPage() {
  return (
    <div className="pb-[max(56px,var(--player-h,0px))] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 text-[19px] leading-[1.6] text-neutral-700 dark:text-neutral-300">
      <div className="max-w-[640px]">
        <section className="pb-14 pt-10">
          <h1 className="text-[clamp(40px,6vw,64px)] font-bold leading-[1.05] tracking-[-0.02em] text-black [text-wrap:balance] dark:text-white">
            Learn to write songs, make beats, and play piano.
          </h1>
          <BeatPlayer />
        </section>

        <section className={section}>
          <h2 className={h2}>What I teach</h2>
          <dl className="grid grid-cols-1 [@media(min-width:600px)]:grid-cols-[130px_1fr] [@media(min-width:600px)]:gap-x-6 [@media(min-width:600px)]:gap-y-4">
            <dt className={dt}>Songwriting</dt>
            <dd className={dd}>Hooks, verses, and finishing what you start.</dd>
            <dt className={dt}>Beatmaking</dt>
            <dd className={dd}>Logic Pro, from drums and chords to a finished beat.</dd>
            <dt className={dt}>Piano</dt>
            <dd className={dd}>For beginners. Chords, reading, and songs you pick.</dd>
          </dl>
        </section>

        <section className={section}>
          <h2 className={h2}>About me</h2>
          <Image
            src="/images/learn-bio.jpg"
            width={120}
            height={120}
            alt="Peyt Spencer smiling"
            className="mb-6 block h-[120px] w-[120px] max-w-full rounded-[2px]"
          />
          <div className="flex flex-col gap-4">
            <p>
              I&apos;m Peyt Spencer Dewar, a rapper and producer from Bellevue. I spent ten years as a
              software engineer at Microsoft, then left to make music full time. I write, produce,
              and record my own songs, then release them on my label, Lyrist Records.
            </p>
            <p>
              I&apos;ve taught children and mentored teens since high school, including a year of
              service in Panama.{" "}
              <a
                href="/resume/music.pdf"
                target="_blank"
                rel="noopener"
                className="underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-black dark:focus-visible:outline-white"
              >
                See more in my resume
              </a>
              .
            </p>
          </div>
        </section>

        {process.env.NODE_ENV === "development" && (
          <section className={section}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                className="min-h-[48px] rounded-full bg-black px-6 font-semibold leading-none text-white dark:bg-white dark:text-black focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-black dark:focus-visible:outline-white"
              >
                Book a lesson
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
