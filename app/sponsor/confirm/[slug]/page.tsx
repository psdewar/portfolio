import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import Poster from "../../../components/Poster";
import { getShowBySlug, isShowDraft, isResidence } from "../../../lib/shows";
import { getHostForShow } from "../../../lib/sponsors";
import { verifySlug } from "../../../lib/confirm";
import { PAY_WHAT_YOU_WANT_TAG } from "../../../lib/poster-defaults";
import { formatEventDate } from "../../../lib/dates";
import ConfirmForm from "./ConfirmForm";
import ArtistIntro from "../../../components/ArtistIntro";
import ScrollToConfirm from "./ScrollToConfirm";
import PosterScrollOverlay from "./PosterScrollOverlay";
import SponsorAvatar from "../../SponsorAvatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const robots = { index: false, follow: false };
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) return { robots };

  const title = `All-Ages Rap Concert-Conversation in ${show.city}, ${show.region}`;
  const description =
    "Tap to hear my energy, play a single from my set, and confirm your interest.";
  const image = `https://peytspencer.com/api/og/rsvp/${slug}`;

  return {
    title,
    description,
    robots,
    openGraph: { title, description, images: [{ url: image, width: 960, height: 1440 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sig?: string }>;
}) {
  const { slug } = await params;
  const { sig } = await searchParams;

  if (!verifySlug(slug, sig)) notFound();

  const show = await getShowBySlug(slug);
  if (!show) notFound();

  const posterEl = (
    <Poster
      date={show.date}
      city={show.city}
      region={show.region}
      venue={show.venue}
      venueLabel={show.venueLabel}
      doorTime={show.doorTime}
      doorLabel={show.doorLabel}
      address={show.address}
      taglineSuffix={show.taglineSuffix ?? undefined}
      tags={show.tags || PAY_WHAT_YOU_WANT_TAG}
      venueImg={show.venueImg ?? undefined}
      venueImgWidth={show.venueImgWidth ?? undefined}
      venueImgOffsetY={show.venueImgOffsetY ?? undefined}
      centerLogo={show.centerLogo ?? undefined}
      taglineAlign={show.taglineAlign ?? undefined}
      slug={slug}
      showQr
      hideDetails={show.visibility === "private"}
    />
  );

  // Already confirmed — send them to the live show (public) or the tour list (private),
  // where the show speaks for itself; no replayed "thank you".
  if (!isShowDraft(show)) {
    redirect(show.visibility === "private" ? "/rsvp" : `/rsvp/${slug}`);
  }

  const hostRecord = await getHostForShow(slug);
  const host = {
    name: hostRecord?.name || "",
    email: hostRecord?.email || "",
    phone: hostRecord?.phone || "",
    items: hostRecord?.items || [],
  };
  const location = isResidence(show) ? "your home" : show.venue || `${show.city}, ${show.region}`;
  const splitItem = "50/50 donation split";
  const contributeItems = host.items.filter((i) => i !== splitItem);
  const hasSplit = host.items.includes(splitItem);

  return (
    <div>
      <div className="mb-6 lg:flex lg:items-center lg:gap-6">
        <div className="hidden lg:block shrink-0">
          <SponsorAvatar />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
            I&apos;d love to present my live rap concert-conversation for all ages at {location}
          </h2>
          <div className="flex items-center gap-4 mt-3 lg:mt-2">
            <div className="lg:hidden shrink-0">
              <SponsorAvatar />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 min-w-0">
              You opened this from my email or text. If {formatEventDate(show.date)} works, add your
              contact and{" "}
              {show.visibility === "private"
                ? "confirm to lock in the date."
                : "confirm to publish the shareable RSVP page."}{" "}
              Scroll further down for more information.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
        <div className="lg:w-1/2 lg:shrink-0 space-y-6">
          <div
            className="relative -mx-5 w-[calc(100%+2.5rem)] max-w-none sm:mx-auto sm:w-full sm:max-w-[320px] lg:mx-0 lg:max-w-none"
            style={{ aspectRatio: "480 / 720" }}
          >
            {posterEl}
            {show.visibility === "private" && (
              <PosterScrollOverlay
                note={show.privateNote ?? undefined}
                inPromo={!show.hidePrivateNote}
              />
            )}
          </div>

          {contributeItems.length > 0 && (
            <div>
              <h3 className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                What you contribute
              </h3>
              <ul className="space-y-1.5">
                {contributeItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300"
                  >
                    <CheckIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-neutral-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(show.visibility !== "private" || hasSplit) && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-sm text-neutral-600 dark:text-neutral-400">
              {(hasSplit ? "I'll split all donations received after the show 50/50. " : "") +
                (show.visibility === "private"
                  ? ""
                  : "Confirming lists the concert publicly on my /rsvp page and creates its Eventbrite event. Until then, it stays hidden.")}
            </div>
          )}

          <div id="confirm-form" className="scroll-mt-6">
            <ConfirmForm
              slug={slug}
              sig={sig!}
              host={host}
              isPrivate={show.visibility === "private"}
              date={show.date}
              doorTime={show.doorTime}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-8">
          <ArtistIntro />
        </div>
      </div>
      <ScrollToConfirm />
    </div>
  );
}
