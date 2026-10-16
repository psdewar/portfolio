"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Device } from "./platform";
import dynamic from "next/dynamic";
import { flushSync } from "react-dom";
import { FUND_COPY } from "../lib/fund-copy";
import CheckinPayRails from "./CheckinPayRails";
import { TierPicker } from "../components/SupportModal";
import UploadList from "../moments/UploadList";
import UploadSurface from "../moments/UploadSurface";
import { useBackToClose } from "../lib/useBackToClose";
import { useMomentsUpload } from "../moments/useMomentsUpload";
import { HandHeartIcon } from "@phosphor-icons/react";
import TicketThumb from "./TicketThumb";
import { DoneText, DownloadIcon, Lead, StepShell, PhotosIcon, PlayIcon, UploadIcon, reducedMotion } from "./RoadParts";
import TeeStep from "./TeeStep";
import TipRow from "./TipRow";
import type { CheckinStep } from "./steps";
import { useRoadGaps } from "./useRoadGaps";
import { isCheckedIn, type Stored } from "./useCheckinState";

const ContributeCardModal = dynamic(() => import("../support/ContributeCardModal"), { ssr: false });

type Open = 0 | 1 | 3 | 4 | 5;
type Mode = "once" | "monthly";

const STEP_OF = { 2: "save", 3: "tee", 4: "support", 5: "upload" } as const;
const VENMO = "https://venmo.com/u/psdewar";

const SAVE_BEFORE = "Proof you were here";

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
  onNeedCheckin,
  onPlainCheckin,
  onNudge,
  saveError,
  past,
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
  onNeedCheckin: (formOpen: boolean) => void;
  onPlainCheckin: () => void;
  onNudge: () => void;
  saveError: string;
  past: boolean;
}) {
  const checkedIn = isCheckedIn(stored);
  const first = checkedIn ? (stored.name.trim().split(/\s+/)[0] ?? "") : "";
  const [open, setOpen] = useState<Open>(0);
  const [mode, setMode] = useState<Mode>("once");
  const [cardOpen, setCardOpen] = useState(false);
  useBackToClose(cardOpen, () => setCardOpen(false));
  const [upThumb, setUpThumb] = useState<string | null | undefined>(undefined);
  const supRef = useRef<HTMLDivElement>(null);
  useRoadGaps(supRef);
  const fileRef = useRef<HTMLInputElement>(null);
  const external = useRef<0 | 3 | 4>(0);
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
    !!stored.steps.tee,
    !!stored.steps.support,
    !!stored.steps.upload,
  ];
  doneRef.current = done;
  const isDone = (n: number) => done[n] ?? true;
  const allDone = [1, 2, 3, 4, 5].every(isDone);

  let ok = true;
  const linked = [1, 2, 3, 4].map((i) => {
    ok = ok && isDone(i) && isDone(i + 1);
    return ok;
  });

  const scrollTo = useCallback(
    (n: number) => {
      requestAnimationFrame(() => {
        const st = document.getElementById(`st-${n}`);
        if (st) {
          sheetRef.current?.scrollTo({
            top: Math.max(0, st.offsetTop),
            behavior: reducedMotion() ? "auto" : "smooth",
          });
        }
      });
    },
    [sheetRef],
  );

  const openStep = useCallback(
    (n: Open, scroll: boolean, force = false) => {
      const hold = n === 5 && !force && jobsRef.current.length === 0;
      setOpen(hold ? 0 : n);
      if (scroll && n) scrollTo(n);
    },
    [scrollTo],
  );

  const toggle = (n: 1 | 3 | 4) => openStep(open === n ? 0 : n, true);

  const advance = useCallback(
    (n: number) => {
      const d = doneRef.current;
      let next = 0;
      for (let i = n + 1; i <= 5 && !next; i++) if (!(d[i] ?? true)) next = i;
      for (let i = 3; i < n && !next; i++) if (!(d[i] ?? true)) next = i;
      if (next) openStep(next as Open, true);
    },
    [openStep],
  );

  const complete = useCallback(
    (n: 3 | 4) => {
      markStep(STEP_OF[n]);
      doneRef.current = doneRef.current.map((v, i) => (i === n ? true : v));
      setTimeout(() => advance(n), reducedMotion() ? 0 : 450);
    },
    [markStep, advance],
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && external.current) {
        const n = external.current;
        external.current = 0;
        complete(n);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [complete]);

  useEffect(() => {
    if (checkedIn) setOpen((o) => (o === 1 ? 0 : o));
  }, [checkedIn]);

  useEffect(() => {
    if (upThumb !== undefined) return;
    const first = upload.jobs.find((j) => j.status === "done");
    if (first) setUpThumb(first.thumb ?? null);
  }, [upload.jobs, upThumb]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const sup = supRef.current;
    const last = sup?.lastElementChild as HTMLElement | null;
    if (!sheet || !sup || !last) return;
    const fit = () => {
      if (sheet.clientHeight) {
        sup.style.paddingBottom = `${Math.max(24, sheet.clientHeight - last.offsetHeight - 8)}px`;
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(sheet);
    ro.observe(last);
    fit();
    return () => ro.disconnect();
  }, [sheetRef]);

  const focusCheckin = () => {
    flushSync(() => setOpen(1));
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
    openStep(5, true, true);
  };

  const shown = open === 4 ? mode : null;
  const uploadDone = !!stored.steps.upload;
  const showUpThumb = uploadDone || upThumb !== undefined;

  return (
    <div className="ci-sheet" ref={sheetRef}>
      <div className="sup" ref={supRef}>
        <p className={`thanks${allDone ? " all" : ""}`}>
          <span className="a" aria-hidden={allDone}>
            Thank you for being {past ? "there" : "here"}{first ? `, ${first}` : ""}.
          </span>
          <span className="b" aria-hidden={!allDone}>
            Thank you for everything{first ? `, ${first}` : ""}.
          </span>
        </p>

        {checkedIn ? (
          <div className={`st${linked[0] ? " linked" : ""}`} data-n="1" id="st-1">
            <div className="srow">
              <Lead done pop={stored.skipped} />
              <span className="t muted">Checked in</span>
            </div>
          </div>
        ) : (
          <StepShell
            n={1}
            id="st-1"
            two={false}
            open={open === 1}
            linked={linked[0]}
            onToggle={() => {
              if (open === 1) {
                setOpen(0);
                return;
              }
              onPlainCheckin();
              focusCheckin();
            }}
            lead={<Lead empty />}
            title="Check in"
          >
            <div className="pad inl">{inlineForm}</div>
          </StepShell>
        )}

        <div className={`st${linked[1] ? " linked" : ""}`} data-n="2" id="st-2">
          <button
            type="button"
            className="srow two"
            onClick={() => {
              if (!checkedIn) {
                focusCheckin();
                onNeedCheckin(open === 1);
                return;
              }
              onSave();
            }}
          >
            <Lead done={done[2]} pop>
              <span className="stubthumb" ref={stubRef} aria-hidden="true">
                <TicketThumb stamped={checkedIn} />
              </span>
            </Lead>
            <span className="t">
              Keep your ticket
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
                ) : (
                  done[2] ? SAVE_DONE[platform] : SAVE_BEFORE
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

        <TipRow linked={linked[1]} />

        <TeeStep
          open={open === 3}
          linked={linked[2]}
          done={done[3]}
          checkinId={stored.checkinId}
          onToggle={() => openStep(open === 3 ? 0 : 3, false)}
          onDone={() => complete(3)}
          onExternal={() => {
            external.current = 3;
          }}
        />

        <StepShell
          n={4}
          id="st-4"
          done={done[4]}
          open={open === 4}
          linked={linked[3]}
          onToggle={() => toggle(4)}
          lead={
            <Lead done={done[4]} pop>
              <span className="tiptile" aria-hidden="true">
                <HandHeartIcon />
              </span>
            </Lead>
          }
          title="Support me"
          sub="Fund my tour or get new songs early"
        >
              {shown && (
                <div className="gut">
                  <span className="modes" role="radiogroup" aria-label="Support type">
                    {(["once", "monthly"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="segb"
                        data-mode={m}
                        role="radio"
                        aria-checked={shown === m}
                        onClick={() => setMode(m)}
                      >
                        {m === "once" ? "Once" : "Monthly"}
                      </button>
                    ))}
                  </span>
                </div>
              )}
              {shown === "once" && (
                <>
                  <div className="pad">
                    <p className="muted-line">{FUND_COPY}</p>
                  </div>
                  <CheckinPayRails
                    venmoUrl={VENMO}
                    onCard={() => setCardOpen(true)}
                    onExternal={() => {
                      external.current = 4;
                    }}
                  />
                </>
              )}
              {shown === "monthly" && (
                <>
                  <div className="pad">
                    <p className="muted-line">
                      All supporters get every new song a month before anyone else and access to
                      behind the scenes! Think Patreon, but the only cut is your card fee, added so
                      I receive 100%. Cancel anytime.
                    </p>
                  </div>
                  <div className="tier-wrap" style={{ "--tp-x": "var(--gut)" } as React.CSSProperties}>
                    <TierPicker
                      preview={null}
                      source="checkin"
                      showImage={false}
                      descriptionOnOwnLine
                      panelClassName="relative overflow-hidden px-[var(--tp-x)] pb-6"
                      checkinId={stored.checkinId}
                      onCheckoutComplete={() => complete(4)}
                    />
                  </div>
                </>
              )}
        </StepShell>

        <div className={`st${open === 5 ? " open" : ""}`} data-n="5" id="st-5">
          <button
            type="button"
            className="srow two"
            onClick={(e) => {
              if ((e.target as Element).closest(".lnk")) return;
              if (!stored.checkinId) {
                focusCheckin();
                onNudge();
                return;
              }
              fileRef.current?.click();
            }}
          >
            <Lead done={done[5]} pop>
              <span className={`upthumb${showUpThumb ? "" : " empty"}`} aria-hidden={upThumb ? undefined : true}>
                {!showUpThumb ? <PhotosIcon /> : upThumb ? <img src={upThumb} alt="Your upload" /> : <PlayIcon />}
              </span>
            </Lead>
            <span className="t">
              Upload your best photos and videos
              <span className="m">
                I will choose some for <span className="lnk">/moments</span>
              </span>
            </span>
            <UploadIcon />
            <DoneText done={done[5]} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,image/heic,image/heif,video/*"
            multiple
            hidden
            aria-label="Choose photos and videos"
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
      </div>
      {cardOpen && (
        <ContributeCardModal
          sheet
          checkinId={stored.checkinId}
          onClose={() => setCardOpen(false)}
          onComplete={() => complete(4)}
        />
      )}
    </div>
  );
}
