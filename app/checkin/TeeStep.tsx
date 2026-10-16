"use client";

import { venmoPayUrl } from "../components/PaymentModal";
import CheckinPayRails from "./CheckinPayRails";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { TShirtIcon } from "@phosphor-icons/react";
import { Lead, StepShell, motion, reducedMotion } from "./RoadParts";

const EmbeddedTeeCheckout = dynamic(() => import("../components/EmbeddedTeeCheckout"), { ssr: false });

const PRODUCT_ID = "tee-patience";
const PRICE = "45";
const COLORS = [
  { id: "navy", name: "Navy", hex: "#262b3f" },
  { id: "forest", name: "Forest", hex: "#2c413a" },
  { id: "maroon", name: "Maroon", hex: "#5d2c30" },
];
const SIZES = ["XS", "S", "M", "L", "XL"];
const src = (id: string) => `/images/merch/checkin/patience-${id}.webp`;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const HERO_RATIO = 1018 / 1080;

type Intent = "open" | "close";
type Closed = { x: number; y: number; w: number; rowH: number };

export default function TeeStep({
  open,
  linked,
  done,
  checkinId,
  onToggle,
  onDone,
  onExternal,
}: {
  open: boolean;
  linked: boolean;
  done: boolean;
  checkinId: string | null;
  onToggle: () => void;
  onDone: () => void;
  onExternal: () => void;
}) {
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState("");
  const [paying, setPaying] = useState(false);
  const [shaking, setShaking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);
  const wasOpen = useRef(false);
  const anims = useRef<Animation[]>([]);
  const intent = useRef<Intent>("open");
  const pin = useRef<number | null>(null);
  const closed = useRef<Closed | null>(null);
  const el = <T extends HTMLElement>(sel: string) => rootRef.current?.querySelector<T>(sel) ?? null;

  const nudgeSize = () => {
    el(".sizes")?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
    setTimeout(() => setShaking(false), 320);
  };

  const measureClosed = () => {
    const row = el(".srow");
    const thumb = thumbRef.current;
    if (!row || !thumb) return;
    const r = row.getBoundingClientRect();
    const t = thumb.getBoundingClientRect();
    closed.current = { x: t.left - r.left, y: t.top - r.top, w: t.width, rowH: r.height };
  };

  const clear = () => {
    anims.current.forEach((a) => a.cancel());
    anims.current = [];
    rootRef.current?.removeAttribute("data-flying");
  };

  const ensureVisible = () => {
    const row = el(".srow");
    const body = el(".body");
    const sheet = rootRef.current?.closest<HTMLElement>(".ci-sheet");
    if (!row || !body || !sheet) return;
    const sr = sheet.getBoundingClientRect();
    const need = body.getBoundingClientRect().bottom - sr.bottom + 16;
    const room = row.getBoundingClientRect().top - sr.top;
    if (need > 0) sheet.scrollBy({ top: Math.min(need, room), behavior: "smooth" });
  };

  const finish = () => {
    if (intent.current === "close") {
      flushSync(onToggle);
      clear();
    } else {
      clear();
      ensureVisible();
    }
  };

  const run = (direction: "normal" | "reverse") => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const row = el(".srow");
    const body = el(".body");
    const more = el(".tee-more");
    const sheet = root?.closest<HTMLElement>(".ci-sheet");
    const c = closed.current;
    if (!root || !hero || !row || !body || !more || !sheet || !c) {
      if (direction === "reverse") finish();
      return;
    }
    clear();
    void root.offsetHeight;
    const to = hero.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const s = c.w / to.width;
    const fromTop = rr.top + c.y + (c.w - c.w * HERO_RATIO) / 2;
    const fromLeft = rr.left + c.x;
    const shiftY = body.getBoundingClientRect().height + (c.rowH - rr.height);
    root.setAttribute("data-flying", "");
    const opts: KeyframeAnimationOptions = {
      duration: motion().ms,
      easing: motion().ease,
      fill: "both",
      direction,
    };
    const list = [
      hero.animate(
        [
          { transform: `translate(${fromLeft - to.left}px, ${fromTop - to.top}px) scale(${s})` },
          { transform: "none" },
        ],
        opts,
      ),
      more.animate([{ opacity: 0 }, { opacity: 1 }], opts),
    ];
    let n = root.nextElementSibling;
    while (n) {
      list.push(
        n.animate([{ transform: `translateY(${-shiftY}px)` }, { transform: "none" }], opts),
      );
      n = n.nextElementSibling;
    }
    anims.current = list;
    list[0].onfinish = finish;
  };

  const toggle = async () => {
    if (reducedMotion()) {
      onToggle();
      return;
    }
    if (anims.current.length) {
      intent.current = intent.current === "open" ? "close" : "open";
      anims.current.forEach((a) => a.reverse());
      return;
    }
    if (!open) {
      measureClosed();
      pin.current = el(".srow")?.getBoundingClientRect().top ?? null;
      intent.current = "open";
      await heroRef.current?.decode().catch(() => {});
      onToggle();
      return;
    }
    intent.current = "close";
    run("reverse");
  };

  useIsoLayoutEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!open) {
      clear();
      return;
    }
    if (!opened) return;
    const sheet = rootRef.current?.closest<HTMLElement>(".ci-sheet");
    const top = el(".srow")?.getBoundingClientRect().top;
    if (sheet && pin.current !== null && top !== undefined) sheet.scrollTop += top - pin.current;
    pin.current = null;
    if (reducedMotion()) return;
    if (!closed.current) measureClosed();
    intent.current = "open";
    run("normal");
  }, [open]);

  useEffect(() => {
    if (open) return;
    measureClosed();
    const onResize = () => measureClosed();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, color]);

  useEffect(() => clear, []);

  useEffect(() => {
    COLORS.forEach((c) => {
      const img = new Image();
      img.src = src(c.id);
      img.decode().catch(() => {});
    });
  }, []);

  return (
    <StepShell
      rootRef={rootRef}
      n={3}
      id="st-3"
      open={open}
      linked={linked}
      done={done}
      onToggle={toggle}
      lead={
        <Lead done={done} pop>
          <span className="thumbwrap" ref={thumbRef}>
            <img src={src(color.id)} alt="" />
            <span className="tiptile tico" aria-hidden="true">
              <TShirtIcon />
            </span>
          </span>
        </Lead>
      }
      title="Grab T-shirt for $45"
      sub="“All I Need Is Patience”, no fees"
      after={
        paying && (
          <EmbeddedTeeCheckout
            productId={PRODUCT_ID}
            color={color.id}
            size={size}
            checkinId={checkinId}
            sheet
            backLabel="Back"
            onClose={() => setPaying(false)}
            onComplete={onDone}
          />
        )
      }
    >
          <div className="pad">
            <img
              ref={heroRef}
              className="teeimg"
              src={src(color.id)}
              width={1080}
              height={1018}
              alt={`All I Need Is Patience tee in ${color.name}`}
            />
          </div>
          <div className="tee-more">
            <div className="pad">
            <div className="dots" role="radiogroup" aria-label="Color">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="dot"
                  role="radio"
                  aria-checked={c.id === color.id}
                  aria-label={c.name}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div className={`sizes${shaking ? " shake" : ""}`} role="group" aria-label="Size">
              {SIZES.map((z) => (
                <button
                  key={z}
                  type="button"
                  className="size"
                  aria-pressed={size === z}
                  onClick={() => setSize(z)}
                >
                  {z}
                </button>
              ))}
            </div>
            </div>
            <CheckinPayRails
              venmoUrl={venmoPayUrl(PRICE, `Patience tee ${size} ${color.name}`)}
              zelleAmount={`$${PRICE}`}
              blocked={!size}
              onBlocked={nudgeSize}
              onCard={() => setPaying(true)}
              onExternal={onExternal}
            />
          </div>
    </StepShell>
  );
}
