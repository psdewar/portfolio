"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useDocumentReady } from "../hooks/useDocumentReady";
import { useScrollLock } from "../hooks/useScrollLock";
import StatusShield from "../components/StatusShield";
import TicketStub, { STAMP_TEXTURE } from "../components/TicketStub";
import CheckinForm, { type FormPhase } from "./CheckinForm";
import Road from "./Road";
import { detectDevice, resolveDevice, type Device } from "./platform";
import { isNetworkError, NO_CONNECTION } from "../lib/network-error";
import { reducedMotion } from "./RoadParts";
import { isCheckedIn, isValidCheckin, useCheckinState } from "./useCheckinState";
import "./checkin.css";

const TICKET_W = 300;
const FLY_MS = 600;
const SWAP_MS = 250;
const HOLD_MS = 1450;
const TITLE_PAD = 3;
const TITLE_FILL = 0.8;
const EASE = "cubic-bezier(.2,.8,.2,1)";
const FILENAME = "ground-up-ticket.png";
const SAVE_COOLDOWN_MS = 1000;

interface Props {
  slug: string;
  city: string;
  region?: string | null;
  date: string;
  preview?: boolean;
  capture?: boolean;
  ticketNoOverride?: number | null;
  rsvpdOverride?: boolean;
  past?: boolean;
}

const messageOf = (e: unknown) =>
  isNetworkError(e)
    ? `${NO_CONNECTION} Try again.`
    : e instanceof Error
      ? e.message
      : "Something went wrong. Try again.";

export default function CheckInClient({
  slug,
  city,
  region,
  date,
  preview = false,
  capture = false,
  ticketNoOverride = null,
  rsvpdOverride = false,
  past = false,
}: Props) {
  const { stored, setFields, hydrated, restored, submit, skip, markStep } = useCheckinState({
    slug,
    preview,
    capture,
    ticketNoOverride,
    rsvpdOverride,
  });
  const ready = useDocumentReady();
  const [view, setView] = useState<"ticket" | "road">("ticket");
  const [phase, setPhase] = useState<FormPhase>("idle");
  const [animate, setAnimate] = useState(false);
  const [error, setError] = useState("");
  const [inlinePhase, setInlinePhase] = useState<FormPhase>("idle");
  const [inlineError, setInlineError] = useState("");
  const [skipping, setSkipping] = useState(false);
  const [flying, setFlying] = useState(false);
  const [instant, setInstant] = useState(false);
  const [scale, setScale] = useState(1);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveIntent, setSaveIntent] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [platform, setPlatform] = useState<Device>("ios");
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    let live = true;
    setPlatform(detectDevice());
    resolveDevice().then((d) => live && setPlatform(d));
    return () => {
      live = false;
    };
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const restingScale = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const blob = useRef<Promise<Blob | null> | null>(null);
  const pendingSave = useRef(false);
  const replaying = useRef(false);
  const saving = useRef(false);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  const checkedIn = isCheckedIn(stored);
  const valid = isValidCheckin(stored);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useScrollLock();

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const fit = () => {
      const el = ticketRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      const vv = window.visualViewport;
      const visH = vv?.height ?? window.innerHeight;
      if (visH < window.innerHeight * 0.75) {
        setKeyboardOpen(true);
        setScale(restingScale.current);
        return;
      }
      setKeyboardOpen(false);
      const vw = vv?.width ?? window.innerWidth;
      const s = Math.min(Math.max(Math.min((vw - 32) / w, (visH - 32) / h), 0.5), 1.8);
      restingScale.current = s;
      setScale(s);
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    if (ticketRef.current) ro.observe(ticketRef.current);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [ready, skipping]);

  const offsetIn = (node: HTMLElement, root: HTMLElement) => {
    let x = 0;
    let y = 0;
    for (let n: HTMLElement | null = node; n && n !== root; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y };
  };

  const stubWindow = () => {
    const root = ticketRef.current!;
    const s = restingScale.current;
    const r = root.getBoundingClientRect();
    const h = root.offsetHeight;
    const title = root.querySelector<HTMLElement>("h1")!;
    const probe = title.cloneNode(true) as HTMLElement;
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", display: "inline-block", width: "auto", left: "0", top: "0" });
    title.parentElement!.appendChild(probe);
    const tw = probe.offsetWidth;
    const tht = probe.offsetHeight;
    probe.remove();
    const t = offsetIn(title, root);
    const x0 = t.x + (title.offsetWidth - tw) / 2;
    const y0 = t.y;
    const cx = x0 - TITLE_PAD;
    const cy = y0 - TITLE_PAD;
    const cw = tw + 2 * TITLE_PAD;
    const ch = tht + 2 * TITLE_PAD;
    const sz = Math.max(tw, tht) / TITLE_FILL;
    return {
      x: x0 + tw / 2 - sz / 2,
      y: y0 + tht / 2 - sz / 2,
      sz,
      s,
      left: r.left + r.width / 2 - (TICKET_W * s) / 2,
      top: r.top + r.height / 2 - (h * s) / 2,
      clip: `inset(${cy}px ${TICKET_W - cx - cw}px ${h - cy - ch}px ${cx}px)`,
    };
  };

  const ticketCopy = () => {
    const c = ticketRef.current!.cloneNode(true) as HTMLElement;
    c.querySelector(".stamp")?.setAttribute("hidden", "");
    c.classList.add("tkc");
    c.style.transformOrigin = "0 0";
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("inert", "");
    return c;
  };

  const flyStub = (back = false) => {
    const root = rootRef.current;
    const th = thumbRef.current;
    const sheet = sheetRef.current;
    if (!root || !th || !sheet) return;
    const rr = root.getBoundingClientRect();
    let from: DOMRect | undefined;
    if (back) {
      sheet.scrollTop = 0;
      from = th.getBoundingClientRect();
      flushSync(() => {
        setFlying(true);
        setView("ticket");
      });
    }
    const w = stubWindow();
    const K = th.offsetWidth / w.sz;
    const fl = ticketCopy();
    fl.classList.add("fly");
    const full = `translate(${w.left - rr.left}px, ${w.top - rr.top}px) scale(${w.s})`;
    fl.style.transform = full;
    root.appendChild(fl);
    flushSync(() => {
      setFlying(true);
      setView("road");
    });
    sheet.scrollTop = 0;
    const tr = from ?? th.getBoundingClientRect();
    const small = `translate(${tr.left - rr.left - w.x * K}px, ${tr.top - rr.top - w.y * K}px) scale(${K})`;
    const frames = [
      { transform: full, clipPath: "inset(0px 0px 0px 0px)" },
      { transform: small, clipPath: w.clip },
    ];
    if (back) frames.reverse();
    const finish = () => {
      if (back) {
        flushSync(() => setView("ticket"));
        void root.offsetWidth;
      }
      fl.remove();
      setFlying(false);
      if (back) {
        setAnimate(true);
        after(HOLD_MS, enterRoad);
        return;
      }
      th.classList.remove("wait");
      if (!reducedMotion()) {
        th.querySelector(".tstamp")?.animate(
          [{ opacity: 0, transform: "scale(0.85)" }, { opacity: 1, transform: "scale(1)" }],
          { duration: SWAP_MS, easing: "ease-out" },
        );
      }
      if (replaying.current) {
        replaying.current = false;
        if (pendingSave.current) {
          pendingSave.current = false;
          save();
        }
      }
    };
    fl.style.transform = frames[0].transform;
    const an = fl.animate(frames, { duration: FLY_MS, easing: EASE, fill: "forwards" });
    if (!back) {
      fl.querySelectorAll(".fade").forEach((e) =>
        e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }),
      );
    }
    an.onfinish = finish;
  };

  const enterRoad = () => {
    thumbRef.current?.classList.toggle("wait", !reducedMotion());
    if (reducedMotion()) {
      setView("road");
      if (sheetRef.current) sheetRef.current.scrollTop = 0;
      thumbRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    } else {
      flyStub();
    }
  };

  useEffect(() => {
    if (!hydrated || !restored) return;
    setInstant(true);
    setView("road");
    setPhase(isCheckedIn(storedRef.current) ? "stamped" : "idle");
    const t = setTimeout(() => setInstant(false), 80);
    return () => clearTimeout(t);
  }, [hydrated, restored]);

  const stampedBefore = useRef(checkedIn);
  useEffect(() => {
    const was = stampedBefore.current;
    stampedBefore.current = checkedIn;
    if (!checkedIn || was || view !== "road" || flying || replaying.current || reducedMotion()) return;
    thumbRef.current
      ?.querySelector(".tstamp")
      ?.animate([{ opacity: 0, transform: "scale(0.85)" }, { opacity: 1, transform: "scale(1)" }], {
        duration: SWAP_MS,
        easing: "ease-out",
      });
  }, [checkedIn, view, flying]);

  const fetchBlob = useCallback(() => {
    if (!blob.current) {
      const s = storedRef.current;
      blob.current = fetch("/api/ticket-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: s.name.trim(),
          email: s.email.trim(),
          ticketNo: s.ticketNo,
          rsvpd: s.rsvpd,
        }),
      })
        .then((res) => (res.ok ? res.blob() : null))
        .catch(() => null)
        .then((b) => {
          if (!b) blob.current = null;
          return b;
        });
    }
    return blob.current;
  }, [slug]);

  useEffect(() => {
    if (capture || !checkedIn) return;
    fetchBlob();
  }, [capture, checkedIn, fetchBlob]);

  const download = (b: Blob) => {
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const focusSaveRow = useCallback(() => {
    const row = document.getElementById("st-2");
    row?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    row?.querySelector<HTMLElement>("button.srow")?.focus({ preventScroll: true });
  }, []);

  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setSaveError("");
    try {
      const b = await fetchBlob();
      if (!b) {
        setSaveError("Couldn’t make your ticket. Try again.");
        return;
      }
      const file = new File([b], FILENAME, { type: "image/png" });
      if (platform === "ios" && navigator.canShare?.({ files: [file] })) {
        setSheetOpen(true);
        try {
          await navigator.share({ files: [file] });
        } catch (e) {
          const name = e instanceof DOMException ? e.name : "";
          if (name === "AbortError") return;
          if (name === "NotAllowedError") {
            focusSaveRow();
            return;
          }
          download(b);
        } finally {
          setSheetOpen(false);
        }
      } else {
        download(b);
      }
      markStep("save");
    } finally {
      setTimeout(() => {
        saving.current = false;
      }, SAVE_COOLDOWN_MS);
    }
  }, [fetchBlob, markStep, platform, focusSaveRow]);

  useEffect(() => {
    if (checkedIn && pendingSave.current && !replaying.current) {
      pendingSave.current = false;
      save();
    }
  }, [checkedIn, save]);

  const onSubmit = async (website: string) => {
    setError("");
    setPhase("loading");
    try {
      await Promise.all([
        submit(website),
        new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 600)),
      ]);
    } catch (e) {
      setError(messageOf(e));
      setPhase("idle");
      return;
    }
    setAnimate(true);
    setPhase("stamped");
    if (capture) return;
    after(reducedMotion() ? 300 : HOLD_MS, enterRoad);
  };

  const onSkip = async () => {
    setError("");
    setSkipping(true);
    try {
      await skip();
    } catch (e) {
      setError(messageOf(e));
      setSkipping(false);
      return;
    }
    setSkipping(false);
    enterRoad();
  };

  const onInline = async (website: string) => {
    setInlineError("");
    setInlinePhase("loading");
    const replay = !capture && !reducedMotion();
    replaying.current = replay;
    try {
      await submit(website);
    } catch (e) {
      replaying.current = false;
      setInlineError(messageOf(e));
      setInlinePhase("idle");
      return;
    }
    setInlinePhase("idle");
    setAnimate(false);
    setPhase("stamped");
    if (replay) flyStub(true);
  };

  const stamp = (
    <div className={`stamp${animate && phase === "stamped" ? " slam" : ""}`} hidden={phase !== "stamped"}>
      <span style={{ WebkitMaskImage: STAMP_TEXTURE, maskImage: STAMP_TEXTURE }}>Admitted</span>
    </div>
  );

  const inlineForm = (
    <CheckinForm
      values={stored}
      onChange={setFields}
      onSubmit={onInline}
      phase={inlinePhase}
      error={inlineError}
      compact
    >
      <button
        type="submit"
        className={`tbtn${shaking ? " shake" : ""}`}
        disabled={!isValidCheckin(stored) || inlinePhase === "loading"}
      >
        {inlinePhase === "loading" ? "Admitting…" : saveIntent ? "Keep your ticket" : "I’m Here"}
      </button>
    </CheckinForm>
  );

  return (
    <div
      ref={rootRef}
      className={`ci${flying ? " flying" : ""}${instant ? " instant" : ""}`}
      data-view={view}
      style={{
        overflowY: keyboardOpen && view === "ticket" ? "auto" : "hidden",
        touchAction: view === "ticket" && !keyboardOpen ? "none" : undefined,
      }}
    >
      <StatusShield color="#eef0f3" zIndex={40} />
      <div className="ci-ticket">
        <div className="ci-stage">
          <div className="ci-scaler" style={{ transform: `scale(${scale})` }}>
            <TicketStub
              ticketRef={ticketRef}
              city={city}
              region={region}
              date={date}
              ticketNo={stored.ticketNo}
              rsvpd={stored.rsvpd}
              ready={ready && hydrated}
            >
              <CheckinForm
                values={stored}
                onChange={setFields}
                onSubmit={onSubmit}
                phase={phase}
                error={error}
                hideEmptyPhone={capture}
                compact={capture}
                animateIn={animate}
                stamp={stamp}
              >
                <button
                  type="submit"
                  className="tbtn"
                  hidden={phase === "stamped"}
                  disabled={!valid || phase === "loading"}
                >
                  {phase === "loading" ? "Admitting…" : "I’m Here"}
                </button>
                {!capture && (
                  <button
                    type="button"
                    className="skip"
                    hidden={phase !== "idle"}
                    disabled={skipping || !hydrated}
                    onClick={onSkip}
                  >
                    Skip for now
                  </button>
                )}
              </CheckinForm>
            </TicketStub>
          </div>
        </div>
      </div>
      <Road
        stored={stored}
        simulateUpload={preview}
        markStep={markStep}
        inlineForm={inlineForm}
        stubRef={thumbRef}
        sheetRef={sheetRef}
        onSave={save}
        platform={platform}
        sheetOpen={sheetOpen}
        onNeedCheckin={(formOpen) => {
          pendingSave.current = true;
          setSaveIntent(true);
          if (!formOpen) return;
          setShaking(true);
          after(300, () => setShaking(false));
        }}
        onPlainCheckin={() => {
          pendingSave.current = false;
          setSaveIntent(false);
        }}
        onNudge={() => {
          setShaking(true);
          after(300, () => setShaking(false));
        }}
        saveError={saveError}
        past={past}
      />
    </div>
  );
}
