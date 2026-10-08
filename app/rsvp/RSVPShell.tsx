"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal, flushSync } from "react-dom";
import type { RsvpShow } from "../lib/rsvp-show";
import CityList from "./CityList";
import { IntroInline, IntroModal } from "./IntroVideo";
import { useIntroAutoOpen } from "../hooks/useIntroAutoOpen";
import { captureUtm } from "../lib/utm";
import {
  SPLIT_QUERY,
  crossfadePoster,
  measureFlip,
  playFlip,
  playShift,
  prefersReducedMotion,
} from "./flip";
import ShowPoster from "./ShowPoster";
import RSVPForm from "./[slug]/RSVPForm";
import PosterSlot, { PosterHostContext } from "./PosterSlot";
import ZoneGrain from "./ZoneGrain";
import SubmittedToast from "./SubmittedToast";

const subscribeSplit = (cb: () => void) => {
  const mq = window.matchMedia(SPLIT_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function RSVPShell({
  shows,
  slug,
  initialSlug,
}: {
  shows: RsvpShow[];
  slug?: string;
  initialSlug?: string;
}) {
  const initial = initialSlug
    ? (shows.find((s) => s.slug === initialSlug) ?? null)
    : null;
  const [selected, setSelected] = useState<RsvpShow | null>(initial);
  const [toastDismissed, setToastDismissed] = useState(false);
  const [fromList, setFromList] = useState(false);
  const [hovered, setHovered] = useState<RsvpShow | null>(null);
  const [enter, setEnter] = useState<"morph" | "flap" | "none">(
    initial ? "flap" : "none",
  );
  const { autoOpen, clearIntro } = useIntroAutoOpen();
  // Intro video, only for ?intro=1 links (email/text landings); nothing renders without it.
  const [intro, setIntro] = useState(autoOpen && !initialSlug);
  const closeIntro = () => {
    setIntro(false);
    clearIntro();
  };
  const [noIntro, setNoIntro] = useState(false);
  const [extBack, setExtBack] = useState<{ href: string } | null>(null);

  const isSplit = useSyncExternalStore(
    subscribeSplit,
    () => window.matchMedia(SPLIT_QUERY).matches,
    () => true,
  );
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0;overflow:hidden";
    setHost(el);
  }, []);
  const measureHost = () =>
    host?.isConnected && host.offsetParent
      ? host.getBoundingClientRect()
      : null;

  useEffect(() => {
    captureUtm();
  }, []);

  useEffect(() => {
    [
      '400 1em "Space Mono"',
      '700 1em "Space Mono"',
      '500 1em "Fira Sans"',
    ].forEach((f) => document.fonts.load(f));
  }, []);

  useEffect(() => {
    if (!document.referrer) return;
    const ref = new URL(document.referrer);
    if (ref.origin !== window.location.origin) return;
    if (ref.pathname.startsWith("/rsvp")) return;
    setExtBack({ href: ref.pathname + ref.search + ref.hash });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const m = path.match(/^\/rsvp\/([^/]+)/);
      setSelected(m ? (shows.find((s) => s.slug === m[1]) ?? null) : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [shows]);

  const handleSelect = (show: RsvpShow) => {
    const reduce = prefersReducedMotion();
    const fromCity = measureFlip(
      document.querySelector(`[data-city="${show.slug}"]`),
    );
    const fromPoster = measureHost();
    const listPoster =
      document.querySelector<HTMLElement>("[data-list-poster]");
    const oldPoster = listPoster?.offsetParent
      ? (listPoster.firstElementChild as HTMLElement | null)
      : null;
    window.history.pushState(null, "", `/rsvp/${show.slug}`);
    flushSync(() => {
      setIntro(false);
      setFromList(true);
      setEnter(reduce ? "none" : "morph");
      setSelected(show);
    });
    if (reduce) return;
    playFlip(fromCity, document.querySelector<HTMLElement>("[data-flip-city]"));
    playShift(fromPoster, host);
    crossfadePoster(
      oldPoster,
      document.querySelector<HTMLElement>("[data-detail-poster]"),
    );
  };

  const contextBack = !fromList && extBack ? extBack : null;

  const handleBack = () => {
    if (contextBack) {
      window.location.href = contextBack.href;
      return;
    }
    const reduce = prefersReducedMotion();
    const slugBack = selected?.slug ?? "";
    const fromCity = measureFlip(document.querySelector("[data-flip-city]"));
    const fromPoster = measureHost();
    window.history.pushState(null, "", `/rsvp`);
    flushSync(() => {
      setNoIntro(true);
      setEnter("none");
      setSelected(null);
    });
    if (reduce) return;
    playFlip(
      fromCity,
      document.querySelector<HTMLElement>(`[data-city="${slugBack}"]`),
    );
    playShift(fromPoster, host);
  };

  const toast = slug && !toastDismissed && (
    <SubmittedToast slug={slug} onDismiss={() => setToastDismissed(true)} />
  );

  const defaultShow = shows.find((s) => s.visibility !== "private") ?? null;
  const posterShow = hovered ?? defaultShow;
  const mobilePosterShow = selected ?? posterShow;
  const mobilePoster =
    host && !isSplit && mobilePosterShow
      ? createPortal(<ShowPoster show={mobilePosterShow} />, host)
      : null;

  if (selected) {
    return (
      <PosterHostContext.Provider value={host}>
        {mobilePoster}
        {toast}
        <RSVPForm
          key={selected.slug}
          eventId={selected.slug}
          date={selected.date}
          isPast={selected.isPast}
          city={selected.city}
          region={selected.region}
          doorTime={selected.doorTime}
          doorLabel={selected.doorLabel}
          venue={selected.venue}
          venueLabel={selected.venueLabel}
          eventName={selected.eventName}
          address={selected.address}
          tags={selected.tags}
          fundDefault={selected.fundDefault}
          posterLine={selected.posterLine}
          posterImg={selected.posterImg}
          bgImg={selected.bgImg}
          enter={enter}
          onBack={handleBack}
        />
      </PosterHostContext.Provider>
    );
  }

  return (
    <PosterHostContext.Provider value={host}>
      {mobilePoster}
      {intro && !isSplit && <IntroModal onClose={closeIntro} />}
      <div className="rsvp-root fixed inset-x-0 top-[var(--header-h,65px)] bottom-0 overflow-hidden split:relative split:top-0 split:bottom-auto split:flex-1 split:overflow-visible">
        <ZoneGrain />
        {toast}
        <div className="relative h-full flex min-w-0 split:flex-row-reverse split:h-auto split:min-h-[calc(100dvh-var(--header-h,65px))] split:mx-auto split:max-w-7xl split:px-8">
          {posterShow && (
            <div
              data-list-poster
              className="hidden split:block split:sticky split:top-[var(--header-h,65px)] split:self-start h-full split:h-[calc(100dvh-var(--header-h,65px))] flex-1 min-w-0 overflow-hidden"
            >
              <ShowPoster key={posterShow.slug} show={posterShow} fill />
              {isSplit && intro && <IntroInline onClose={closeIntro} />}
            </div>
          )}
          <div className="flex-1 split:flex-none split:w-[calc(28rem+clamp(1.5rem,3vw,3rem))] min-w-0 h-full overflow-y-auto split:h-auto split:overflow-visible [container-type:inline-size]">
            <div
              className="mx-auto flex min-h-full w-full max-w-3xl flex-col split:block split:max-w-none min-w-0 pt-0 split:pb-[max(2rem,var(--player-h,0px))]"
            >
              <h1 className="sr-only">RSVP</h1>
              <CityList
                shows={shows}
                noIntro={noIntro}
                onSelect={handleSelect}
                onHover={setHovered}
              />
              <PosterSlot className="mt-auto" />
            </div>
          </div>
        </div>
      </div>
    </PosterHostContext.Provider>
  );
}
