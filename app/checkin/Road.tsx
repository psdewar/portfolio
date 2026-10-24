"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Device } from "./platform";
import type { StoryParagraph } from "../data/story";
import dynamic from "next/dynamic";
import { flushSync } from "react-dom";
import FundBody from "./FundBody";
import type { TripExpensesData } from "../fund/TripExpenses";
import UploadList from "../moments/UploadList";
import UploadSurface from "../moments/UploadSurface";
import { useBackToClose } from "../lib/useBackToClose";
import { useMomentsUpload } from "../moments/useMomentsUpload";
import { DoneText, DownloadIcon, Lead, StepShell, PlayIcon, UploadIcon, reducedMotion, useRowMotion } from "./RoadParts";
import FundArt from "./FundArt";
import { PhotoArt, PinArt, StubArt } from "./RowArt";
import TeeStep from "./TeeStep";
import MonthlyStep from "./MonthlyStep";
import SocialsStep, { type SocialTarget } from "./SocialsStep";
import type { CheckinStep } from "./steps";
import { lineCount, shrinkToFit, useFontFit } from "../components/fitText";
import { useRoadGaps } from "./useRoadGaps";
import { FUND_COPY } from "../data/supporter-config";
import { isCheckedIn, type Stored } from "./useCheckinState";
import { createContributionSecret } from "../lib/contribution-checkout";
import { errorMessage } from "../lib/network-error";

const ContributeCardModal = dynamic(() => import("../components/ContributeCardModal"), { ssr: false });

type Open = 0 | 1 | 3 | 4 | 5 | 6 | 7;

const STEP_OF = { 2: "save", 3: "follow", 4: "upload", 5: "tee", 6: "support", 7: "monthly" } as const;

const SAVE_BEFORE = "Proof you attended";

const SAVE_DONE: Record<Device, string> = {
  ios: "Saved in your Photos",
  samsung: "Saved in Gallery, under Albums",
  pixel: "Saved in Photos, under Collections",
  desktop: "Saved on your computer",
};

export default function Road({
  stored,
  simulateUpload,
  markStep,
  inlineForm,
  stubRef,
  sheetRef,
  onSave,
  platform,
  sheetOpen,
  rendering,
  onNeedCheckin,
  onPlainCheckin,
  onNudge,
  saveError,
  past,
  city,
  storyParagraphs,
  expenses,
  slug,
  track,
}: {
  stored: Stored;
  simulateUpload: boolean;
  markStep: (step: CheckinStep) => void;
  inlineForm: React.ReactNode;
  stubRef: React.Ref<HTMLSpanElement>;
  sheetRef: React.RefObject<HTMLDivElement>;
  onSave: () => void;
  platform: Device;
  sheetOpen: boolean;
  rendering: boolean;
  onNeedCheckin: (formOpen: boolean) => void;
  onPlainCheckin: () => void;
  onNudge: () => void;
  saveError: string;
  past: boolean;
  city: string;
  storyParagraphs: StoryParagraph[];
  expenses: TripExpensesData | null;
  slug: string;
  track: (event: string, props?: Record<string, unknown>) => void;
}) {
  const checkedIn = isCheckedIn(stored);
  const first = checkedIn ? (stored.name.trim().split(/\s+/)[0] ?? "") : "";
  const engaged = checkedIn || stored.skipped;
  const [open, setOpen] = useState<Open>(engaged ? (stored.steps.follow ? 0 : 3) : 1);
  const [gated, setGated] = useState(false);
  const [missed, setMissed] = useState(false);
  const missedKey = `checkin-missed:${slug}`;
  useEffect(() => {
    try {
      setMissed(localStorage.getItem(missedKey) === "1");
    } catch {}
  }, [missedKey]);
  const updateMissed = (value: boolean) => {
    setMissed(value);
    try {
      if (value) localStorage.setItem(missedKey, "1");
      else localStorage.removeItem(missedKey);
    } catch {}
  };
  const missedView = past && !checkedIn && missed;
  const headline = missedView ? "I missed you this time" : past ? (checkedIn ? "Thank you for being there" : `Thank you, ${city}`) : "Thank you for being here";
  const [cardOpen, setCardOpen] = useState(false);
  const [cardSecret, setCardSecret] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  useBackToClose(cardOpen, () => setCardOpen(false));
  useEffect(() => {
    if (!cardOpen) setCardLoading(false);
  }, [cardOpen]);
  const [upThumb, setUpThumb] = useState<string | null | undefined>(undefined);
  const supRef = useRef<HTMLDivElement>(null);
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const fitThanks = useCallback(() => {
    const el = thanksRef.current;
    if (!el) return;
    el.style.fontSize = "";
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const base = parseFloat(getComputedStyle(el).fontSize) / root;
    const spans = Array.from(el.children) as HTMLElement[];
    const lines = () => Math.max(...spans.map(lineCount));
    shrinkToFit(el, base, base * 0.75, () => lines() <= 2, 0.02);
    if (lines() > 3) shrinkToFit(el, base * 0.75, base * 0.5, () => lines() <= 3, 0.02);
  }, []);
  useFontFit(fitThanks, [first, past, city]);
  useEffect(() => {
    const row = thanksRef.current?.parentElement;
    if (!row) return;
    const ro = new ResizeObserver(fitThanks);
    ro.observe(row);
    return () => ro.disconnect();
  }, [fitThanks]);
  useRoadGaps(supRef);
  const fileRef = useRef<HTMLInputElement>(null);
  const external = useRef<0 | 3 | 5 | 6>(0);
  const doneRef = useRef<boolean[]>([]);

  const upload = useMomentsUpload(`checkin:${stored.checkinId ?? ""}`, () => markStep("upload"), {
    simulate: simulateUpload,
  });
  const jobsRef = useRef(upload.jobs);
  jobsRef.current = upload.jobs;

  const done = [
    true,
    checkedIn,
    !!stored.steps.save,
    !!stored.steps.follow,
    !!stored.steps.upload,
    !!stored.steps.tee,
    !!stored.steps.support,
    !!stored.steps.monthly,
  ];
  doneRef.current = done;
  const hideMerch = past && !done[5];
  const isDone = (n: number) => (n === 5 && hideMerch) || (done[n] ?? true);
  const allDone = [1, 2, 3, 4, 5, 6, 7].every(isDone);

  let ok = true;
  const linked = [1, 2, 3, 4, 5, 6].map((i) => {
    ok = ok && isDone(i) && isDone(i + 1);
    return ok;
  });

  const openStep = useCallback((n: Open, force = false) => {
    const hold = n === 4 && !force && jobsRef.current.length === 0;
    setOpen(hold ? 0 : n);
  }, []);

  const toggle = (n: 1 | 3 | 5 | 6 | 7) => openStep(open === n ? 0 : n);

  const upRef = useRef<HTMLDivElement>(null);
  useRowMotion(upRef, open === 4);

  const advance = useCallback(
    (n: number) => {
      const d = doneRef.current;
      let next = 0;
      for (let i = n + 1; i <= 7 && !next; i++) if (!(d[i] ?? true)) next = i;
      for (let i = 3; i < n && !next; i++) if (!(d[i] ?? true)) next = i;
      if (next) openStep(next as Open);
    },
    [openStep],
  );

  const complete = useCallback(
    (n: 3 | 5 | 6 | 7) => {
      markStep(STEP_OF[n]);
      doneRef.current = doneRef.current.map((v, i) => (i === n ? true : v));
      setTimeout(() => advance(n), reducedMotion() ? 0 : 450);
    },
    [markStep, advance],
  );

  useEffect(() => {
    let away = false;
    const back = () => {
      if (!away || !external.current) return;
      const n = external.current;
      away = false;
      external.current = 0;
      complete(n);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") away = true;
      else back();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) back();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [complete]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("open") !== "fund") return;
    setOpen(6);
  }, []);

  useEffect(() => {
    if (engaged) setOpen((o) => (o === 0 || o === 1 ? (doneRef.current[3] ? 0 : 3) : o));
  }, [engaged]);

  useEffect(() => {
    if (upThumb !== undefined) return;
    const first = upload.jobs.find((j) => j.status === "done");
    if (first) setUpThumb(first.thumb ?? null);
  }, [upload.jobs, upThumb]);

  const focusCheckin = (gate = false) => {
    flushSync(() => {
      setGated(gate);
      setOpen(1);
    });
    const field = ["name", "email"]
      .map((n) => document.querySelector<HTMLInputElement>(`#st-1 input[name="${n}"]`))
      .find((el) => el && !el.value.trim());
    const target = field ?? document.querySelector<HTMLInputElement>('#st-1 input[name="email"]');
    if (!target) return;
    target.focus({ preventScroll: true });
    const reveal = () => {
      const bottom = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
      const r = target.getBoundingClientRect();
      if (r.top < 0 || r.bottom > bottom) target.scrollIntoView({ block: "nearest" });
    };
    if (reducedMotion()) {
      reveal();
      return;
    }
    const body = target.closest(".body");
    const done = (e: Event) => {
      if ((e as TransitionEvent).propertyName !== "grid-template-rows") return;
      body?.removeEventListener("transitionend", done);
      reveal();
    };
    body?.addEventListener("transitionend", done);
  };

  const pickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    upload.handleFiles(files);
    openStep(4, true);
  };

  const uploadDone = !!stored.steps.upload;
  const showUpThumb = uploadDone || upThumb !== undefined;

  return (
    <div className="ci-sheet" ref={sheetRef}>
      <div className="sup" ref={supRef}>
        <div className="thanks-row">
          <img className="avatar" src="/images/checkin/peyt.webp" alt="Peyt Spencer" width={150} height={150} />
          <p ref={thanksRef} className={`thanks${allDone ? " all" : ""}`}>
            <span className="a" aria-hidden={allDone}>
              {headline}{first ? `, ${first}` : ""}
            </span>
            <span className="b" aria-hidden={!allDone}>
              Thank you for everything{first ? `, ${first}` : ""}
            </span>
          </p>
        </div>

        {checkedIn ? (
          <div className={`st${linked[0] ? " linked" : ""}`} data-n="1" id="st-1">
            <div className="srow two">
              <Lead done pop={stored.skipped}>
                <PinArt />
              </Lead>
              <span className="t muted">Checked in</span>
            </div>
          </div>
        ) : missedView ? (
          <div className="st" data-n="1" id="st-1">
            <button
              type="button"
              className="srow two"
              onClick={() => {
                track("checkin_row_tap", { row: "checkin" });
                updateMissed(false);
                onPlainCheckin();
                focusCheckin();
              }}
            >
              <Lead done={false}>
                <PinArt />
              </Lead>
              <span className="t muted">Missed this one</span>
            </button>
          </div>
        ) : (
          <StepShell
            n={1}
            id="st-1"
            open={open === 1}
            linked={linked[0]}
            onToggle={() => {
              if (open === 1) {
                setGated(false);
                setOpen(0);
                return;
              }
              track("checkin_row_tap", { row: "checkin" });
              onPlainCheckin();
              focusCheckin();
            }}
            lead={
              <Lead done={checkedIn} pop>
                <PinArt />
              </Lead>
            }
            title={gated && open === 1 ? "Check in first" : past ? "Were you there?" : "Check in"}
          >
            <div className="pad inl">
              {inlineForm}
              {past && (
                <button
                  type="button"
                  className="missed-btn"
                  onClick={() => {
                    track("checkin_missed");
                    updateMissed(true);
                    setGated(false);
                    setOpen(0);
                  }}
                >
                  I missed this one
                </button>
              )}
            </div>
          </StepShell>
        )}

        {!missedView && (
          <div className={`st${linked[1] ? " linked" : ""}`} data-n="2" id="st-2">
            <button
              type="button"
              className="srow two"
              aria-busy={rendering ? "true" : undefined}
              onClick={() => {
                track("checkin_row_tap", { row: "save" });
                if (!checkedIn) {
                  focusCheckin(true);
                  onNeedCheckin(open === 1);
                  return;
                }
                if (rendering && platform === "ios") return;
                onSave();
              }}
            >
              <Lead done={done[2]} pop>
                <span className="stubthumb" ref={stubRef} aria-hidden="true">
                  <StubArt />
                </span>
              </Lead>
              <span className="t">
                Tap here to keep your ticket
                <span className="m">
                  {sheetOpen ? (
                    <>
                      Tap Save Image{" "}
                      <svg
                        viewBox="0 0 24 24"
                        width="1.1em"
                        height="1.1em"
                        aria-hidden="true"
                        style={{ display: "inline-block", verticalAlign: "-0.2em" }}
                        {...{ fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}
                      >
                        <path d="M12 3v10M8 9.5l4 4 4-4" />
                        <path d="M5 13v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13" />
                      </svg>
                    </>
                  ) : done[2] ? (
                    SAVE_DONE[platform]
                  ) : (
                    SAVE_BEFORE
                  )}
                </span>
              </span>
              <DownloadIcon />
              <DoneText done={done[2]} />
            </button>
            {saveError && (
              <p className="ferr" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}

        <SocialsStep
          open={open === 3}
          onToggle={() => {
            if (open !== 3) track("checkin_row_tap", { row: "follow" });
            toggle(3);
          }}
          linked={linked[2]}
          done={done[3]}
          onTap={(target: SocialTarget) => {
            track("checkin_row_tap", { row: "follow", target });
            if (!doneRef.current[3]) external.current = 3;
          }}
        />

        {!missedView && (
          <div ref={upRef} className={`st${open === 4 ? " open" : ""}${linked[3] ? " linked" : ""}`} data-n="4" id="st-4">
            <button
              type="button"
              className="srow two"
              onClick={(e) => {
                if ((e.target as Element).closest(".lnk")) return;
                track("checkin_row_tap", { row: "upload" });
                if (!stored.checkinId) {
                  focusCheckin(true);
                  onNudge();
                  return;
                }
                fileRef.current?.click();
              }}
            >
              <Lead done={done[4]} pop>
                <span className={`upthumb${showUpThumb ? "" : " empty"}`} aria-hidden={upThumb ? undefined : true}>
                  {!showUpThumb ? <PhotoArt /> : upThumb ? <img src={upThumb} alt="Your upload" /> : <PlayIcon />}
                </span>
              </Lead>
              <span className="t">
                Send me your best photo
                <span className="m">
                  I pick some for <span className="lnk">/moments</span>
                </span>
              </span>
              <UploadIcon />
              <DoneText done={done[4]} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,image/heic,image/heif"
              multiple
              hidden
              aria-label="Choose photos"
              onChange={(e) => {
                pickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="body">
              <div className="inner">
                {upload.jobs.length > 0 && (
                  <UploadSurface className="ups">
                    <UploadList upload={upload} bannerPad="px-4" gridClass="grid-cols-3" />
                  </UploadSurface>
                )}
              </div>
            </div>
          </div>
        )}

        {!hideMerch && (
          <TeeStep
            open={open === 5}
            linked={linked[4]}
            done={done[5]}
            checkinId={stored.checkinId}
            onToggle={() => {
              if (open !== 5) track("checkin_row_tap", { row: "tee" });
              openStep(open === 5 ? 0 : 5);
            }}
            onDone={() => complete(5)}
            onExternal={() => {
              external.current = 5;
            }}
          />
        )}

        <StepShell
          n={6}
          id="st-6"
          done={done[6]}
          open={open === 6}
          linked={linked[5]}
          onToggle={() => {
            if (open !== 6) track("checkin_row_tap", { row: "support" });
            toggle(6);
          }}
          lead={
            <Lead done={done[6]} pop>
              <FundArt open={open === 6} />
            </Lead>
          }
          title={FUND_COPY.title}
          sub={
            <span className="swap">
              <span className={open === 6 ? undefined : "on"}>{FUND_COPY.sub}</span>
              <span className={open === 6 ? "on" : undefined}>{FUND_COPY.costsSub}</span>
            </span>
          }
        >
          <FundBody
            expenses={expenses}
            cash={!past}
            cardLoading={cardLoading}
            cardError={cardError}
            onCard={async (amount) => {
              setCardError("");
              if (amount === null) {
                setCardSecret(null);
                setCardOpen(true);
                return;
              }
              setCardLoading(true);
              try {
                const [secret] = await Promise.all([
                  createContributionSecret(Math.round(amount * 100), stored.checkinId),
                  import("../components/ContributeCardModal"),
                ]);
                setCardSecret(secret);
                setCardOpen(true);
              } catch (e) {
                setCardError(errorMessage(e, "Checkout couldn't open. Try again."));
                setCardLoading(false);
              }
            }}
            onTap={(target) => track("checkin_row_tap", { row: "support", target })}
            onExternal={() => {
              external.current = 6;
            }}
          />
        </StepShell>

        <p className="stnote">OR</p>

        <MonthlyStep
          done={done[7]}
          linked={linked[5]}
          checkinId={stored.checkinId}
          storyParagraphs={storyParagraphs}
          onDone={() => complete(7)}
          open={open === 7}
          onToggle={() => {
            if (open !== 7) track("checkin_row_tap", { row: "monthly" });
            toggle(7);
          }}
        />
      </div>
      {cardOpen && (
        <ContributeCardModal
          checkinId={stored.checkinId}
          presetSecret={cardSecret}
          onClose={() => setCardOpen(false)}
          onComplete={() => complete(6)}
        />
      )}
    </div>
  );
}
