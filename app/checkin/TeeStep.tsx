"use client";

import { venmoPayUrl } from "../components/PaymentOptions";
import CheckinPayRails from "./CheckinPayRails";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { TShirtIcon } from "@phosphor-icons/react";
import { ColorSwatches, SizeGrid, TEE_COLORS, TEE_DEFAULT_SIZE, TEE_SIZES } from "../components/TeePickers";
import { Lead, StepShell, motion, reducedMotion, runRowMotion, useIsoLayoutEffect } from "./RoadParts";

const EmbeddedTeeCheckout = dynamic(() => import("../components/EmbeddedTeeCheckout"), { ssr: false });

const PRODUCT_ID = "tee-patience";
const PRICE = "45";
const COLORS = TEE_COLORS;
const SIZES = TEE_SIZES;
const src = (id: string) => `/images/merch/checkin/patience-${id}.webp`;
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
  const [color, setColor] = useState<(typeof COLORS)[number]>(COLORS[0]);
  const [size, setSize] = useState<string>(TEE_DEFAULT_SIZE);
  const [paying, setPaying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);
  const wasOpen = useRef(false);
  const anims = useRef<Animation[]>([]);
  const intent = useRef<Intent>("open");
  const closed = useRef<Closed | null>(null);
  const el = <T extends HTMLElement>(sel: string) => rootRef.current?.querySelector<T>(sel) ?? null;

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

  const finish = () => {
    if (intent.current === "close") {
      flushSync(onToggle);
      clear();
    } else {
      clear();
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
      if (rootRef.current) runRowMotion(rootRef.current, intent.current);
      return;
    }
    if (!open) {
      measureClosed();
      intent.current = "open";
      await heroRef.current?.decode().catch(() => {});
      onToggle();
      return;
    }
    intent.current = "close";
    run("reverse");
    if (rootRef.current) runRowMotion(rootRef.current, "close");
  };

  useIsoLayoutEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!open) {
      clear();
      return;
    }
    if (!opened) return;
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
      n={5}
      id="st-5"
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
      title="Grab merch"
      sub={`“All I Need Is Patience” Tee, $${PRICE}`}
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
            <ColorSwatches
              colors={COLORS}
              value={color.id}
              accent="#d4a553"
              tone="ink"
              onChange={(id) => setColor(COLORS.find((c) => c.id === id) ?? COLORS[0])}
              className="mt-4"
            />
            <SizeGrid
              sizes={SIZES}
              value={size}
              activeHex="#262b3f"
              onChange={setSize}
              className="mt-4"
            />
            </div>
            <CheckinPayRails
              venmoUrl={venmoPayUrl(PRICE, `Patience tee ${size} ${color.name}`)}
              zelleAmount={`$${PRICE}`}
              onCard={() => setPaying(true)}
              cardNoFees
              onExternal={onExternal}
            />
          </div>
    </StepShell>
  );
}
