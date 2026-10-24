"use client";

import { useEffect, useRef } from "react";
import RoadCar, { ROAD_FILL, roadDashImage, treadTransform } from "../components/RoadCar";
import { reducedMotion } from "./RoadParts";
import "./FundArt.css";

const DASH_ON = 6;
const DASH_PERIOD = 16;
const LOOP_S = 0.45;
const SPEED = DASH_PERIOD / LOOP_S / 1000;

const STOP_MS = 600;
const GO_MS = 800;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

export default function FundArt({ open }: { open: boolean }) {
  const tileRef = useRef<HTMLSpanElement>(null);
  const dashRef = useRef<HTMLSpanElement>(null);
  const treadRef = useRef<SVGPatternElement>(null);
  const offset = useRef(0);
  const factor = useRef(1);
  useEffect(() => {
    const tile = tileRef.current;
    if (!tile || reducedMotion()) return;
    const target = open ? 0 : 1;
    const from = factor.current;
    const dur = open ? STOP_MS : GO_MS;
    const ease = open ? easeOut : easeInOut;
    const began = performance.now();
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (last) offset.current += (now - last) * SPEED * factor.current;
      last = now;
      const t = Math.min((now - began) / dur, 1);
      factor.current = from + (target - from) * ease(t);
      treadRef.current?.setAttribute("patternTransform", treadTransform(offset.current));
      if (dashRef.current) dashRef.current.style.backgroundPositionX = `${offset.current.toFixed(2)}px`;
      if (target === 0 && t >= 1) return;
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      last = 0;
      if (entry.isIntersecting) frame = requestAnimationFrame(tick);
    });
    io.observe(tile);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [open]);
  return (
    <span ref={tileRef} className="rowart fundcar" aria-hidden="true" style={{ background: ROAD_FILL }}>
      <span
        className="dash"
        ref={dashRef}
        style={{ backgroundImage: roadDashImage(DASH_ON, DASH_PERIOD), backgroundSize: `${DASH_PERIOD}px 2px` }}
      />
      <span className="carbox">
        <RoadCar treadRef={treadRef} braking={open} />
      </span>
    </span>
  );
}
