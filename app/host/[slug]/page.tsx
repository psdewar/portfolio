import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Poster from "../../components/Poster";
import { getShowBySlug, isShowDraft, isResidence, needsHostLocation } from "../../lib/shows";
import { getHostForShow } from "../../lib/sponsors";
import { posterLineForShow } from "../../fund/legs";
import { verifySlug } from "../../lib/confirm";
import { PAY_WHAT_YOU_WANT_TAG } from "../../lib/poster-defaults";
import ConfirmForm from "./ConfirmForm";
import ArtistIntro from "../../components/ArtistIntro";
import ScrollToConfirm from "./ScrollToConfirm";
import PosterScrollOverlay from "./PosterScrollOverlay";
import HostAvatar from "../HostAvatar";
import { posterAspect } from "../../lib/poster-formats";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const robots = { index: false, follow: false };
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) return { robots };

  const title = needsHostLocation(show)
    ? "Host My All-Ages Rap Concert-Conversation"
    : `All-Ages Rap Concert-Conversation in ${show.city}, ${show.region}`;
  const description =
    "Tap to hear my energy, play a single from my set, and confirm your interest.";
  const image = `https://peytspencer.com/api/og/rsvp/${slug}`;

  return {
    title,
    description,
    robots,
    openGraph: { title, description, images: [{ url: image, width: 1920, height: 1004 }] },
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

  // A press-kit invite is created without a location; the host supplies it here.
  const needsLocation = needsHostLocation(show);
  const posterLine = await posterLineForShow(show);

  const posterEl = (
    <Poster
      date={show.date}
      city={show.city}
      region={show.region}
      venue={show.venue}
      venueLabel={show.venueLabel}
      posterLine={posterLine}
      doorTime={show.doorTime}
      doorLabel={show.doorLabel}
      address={show.address}
      taglineSuffix={show.taglineSuffix ?? undefined}
      tags={show.tags || PAY_WHAT_YOU_WANT_TAG}
      posterImg={show.posterImg ?? undefined}
      bgImg={show.bgImg ?? undefined}
      venueImg={show.venueImg ?? undefined}
      venueImgWidth={show.venueImgWidth ?? undefined}
      venueImgOffsetY={show.venueImgOffsetY ?? undefined}
      scale={show.locationScale ?? undefined}
      centerLogo={show.centerLogo ?? undefined}
      taglineAlign={show.taglineAlign ?? undefined}
      slug={slug}
      showQr
      invite={needsLocation}
      hideDetails={show.visibility === "private"}
    />
  );

  const hostRecord = await getHostForShow(slug);
  const host = {
    name: hostRecord?.name || "",
    email: hostRecord?.email || "",
    phone: hostRecord?.phone || "",
    items: hostRecord?.items || [],
  };
  // An email on file means this host already signed (the confirm POST requires one),
  // so the booking is done; a show I created for the leg still needs its host.
  if (!isShowDraft(show) && host.email.trim()) {
    redirect(show.visibility === "private" ? "/rsvp" : `/rsvp/${slug}`);
  }

  const location = needsLocation
    ? ""
    : isResidence(show)
      ? "your home"
      : show.venue || `${show.city}, ${show.region}`;
  // The publish note only holds while the show is still a draft.
  const showsPublishNote = isShowDraft(show) && show.visibility !== "private";
  const hasSplit = host.items.includes("50/50 donation split");

  return (
    <div>
      <div className="mb-6 lg:flex lg:items-center lg:gap-6">
        <div className="hidden lg:block shrink-0">
          <HostAvatar />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
            Let&apos;s put on a show{location ? ` at ${location}` : ""}
          </h2>
          <div className="flex items-center gap-4 mt-3 lg:mt-2">
            <div className="lg:hidden shrink-0">
              <HostAvatar />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 min-w-0">
              {needsLocation
                ? "Tell me where and when, pick what you can contribute, and drop your contact below. Scroll down for clips of me live, a single from my set, and my story."
                : "Pick what you can contribute, add your contact, and confirm the date below. Scroll down for clips of me live, a single from my set, and my story."}
            </p>
          </div>
        </div>
      </div>

      <div data-balance-columns className="flex flex-col lg:flex-row gap-8 lg:items-start">
        <div className="lg:w-1/2 lg:shrink-0 space-y-6">
          <div
            className="relative -mx-5 w-[calc(100%+2.5rem)] max-w-none sm:mx-auto sm:w-full sm:max-w-[320px] lg:mx-0 lg:max-w-none"
            style={{ aspectRatio: posterAspect() }}
          >
            {posterEl}
            {show.visibility === "private" && !show.posterImg && (
              <PosterScrollOverlay
                note={show.privateNote ?? undefined}
                inPromo={!show.hidePrivateNote}
              />
            )}
          </div>

          <div
            id="confirm-form"
            className="scroll-mt-6 rounded-lg bg-neutral-100 p-5 sm:p-6 dark:bg-neutral-900"
          >
            <ConfirmForm
              slug={slug}
              sig={sig!}
              host={host}
              isPrivate={show.visibility === "private"}
              needsLocation={needsLocation}
              date={show.date}
              doorTime={show.doorTime}
            />
            {(showsPublishNote || hasSplit) && (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {(hasSplit ? "I'll split all donations received after the show 50/50. " : "") +
                  (showsPublishNote
                    ? "Confirming publishes the concert on my RSVP page and Eventbrite. Until then, it stays hidden."
                    : "")}
              </p>
            )}
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
