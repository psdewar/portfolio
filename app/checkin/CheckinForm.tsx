"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { reducedMotion } from "./RoadParts";
import {
  TICKET_INK,
  displayFace,
  ticketMono,
} from "../components/TicketStub";
import { lineCount, overflowsX, shrinkToFit, useFontFit } from "../components/fitText";
import { MAX_NAME_LENGTH } from "../lib/name";
import { isValidCheckin, type CheckinFields } from "./useCheckinState";

const NAME_FS = 1.375;
const NAME_FLOOR = 1.0625;
const NAME_MAX_LINES = 2;
const STAMP_OVERLAP = 14 / (NAME_FS * 16);

export type FormPhase = "idle" | "loading" | "stamped";

export default function CheckinForm({
  values,
  onChange,
  onSubmit,
  phase,
  error,
  hideEmptyPhone = false,
  compact = false,
  animateIn = false,
  stamp,
  children,
}: {
  values: CheckinFields;
  onChange: (patch: Partial<CheckinFields>) => void;
  onSubmit: (website: string) => void;
  phase: FormPhase;
  error: string;
  hideEmptyPhone?: boolean;
  compact?: boolean;
  animateIn?: boolean;
  stamp?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [website, setWebsite] = useState("");
  const locked = phase !== "idle";
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const [fieldsH, setFieldsH] = useState(0);
  const stampBoxRef = useRef<HTMLDivElement>(null);
  const [stampH, setStampH] = useState(0);
  const admitted = phase === "stamped";
  const blockRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLParagraphElement>(null);
  const [nameRem, setNameRem] = useState(NAME_FS);
  const [compactH, setCompactH] = useState(0);
  useFontFit(() => {
    const n = nameTextRef.current;
    if (!n) return;
    n.style.overflowWrap = "normal";
    const fs = shrinkToFit(
      n,
      NAME_FS,
      NAME_FLOOR,
      (el) => !overflowsX(el) && lineCount(el) <= NAME_MAX_LINES,
    );
    if (overflowsX(n)) n.style.overflowWrap = "anywhere";
    setNameRem(fs);
  }, [admitted, values.name]);
  useLayoutEffect(() => {
    if (!admitted && fieldsRef.current)
      setFieldsH(fieldsRef.current.offsetHeight);
    const span = stampBoxRef.current?.querySelector("span");
    if (admitted && span) {
      const a = (13 * Math.PI) / 180;
      setStampH(
        Math.ceil(
          span.offsetWidth * Math.sin(a) + span.offsetHeight * Math.cos(a),
        ),
      );
    }
    const block = blockRef.current;
    const box = stampBoxRef.current;
    if (admitted && block && box)
      setCompactH(box.offsetTop + box.offsetHeight - block.offsetTop);
  });
  const [collapse, setCollapse] = useState<"none" | "anim" | "now">("none");
  const [shrunk, setShrunk] = useState(false);
  useLayoutEffect(() => {
    if (!admitted) {
      setCollapse("none");
      setShrunk(false);
      return;
    }
    setCollapse(animateIn && fieldsH && !reducedMotion() ? "anim" : "now");
  }, [admitted]);
  useEffect(() => {
    if (collapse !== "anim") return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShrunk(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [collapse]);
  const blockH =
    collapse === "anim" ? (shrunk && compactH ? compactH : fieldsH) : undefined;
  const showPhone = !(hideEmptyPhone && !values.phone.trim());

  const walk =
    (next: React.RefObject<HTMLInputElement | null> | null) =>
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
      if (next) {
        e.preventDefault();
        next.current?.focus();
      } else if (!isValidCheckin(values)) {
        e.preventDefault();
        (values.name.trim() ? emailRef : nameRef).current?.focus();
      }
    };

  return (
    <form
      className="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (isValidCheckin(values) && phase === "idle") onSubmit(website);
      }}
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
      <div className="fields" data-fields ref={fieldsRef}>
        {admitted ? (
          <div
            ref={blockRef}
            className="text-center"
            style={{
              height: blockH,
              transition:
                collapse === "anim" ? "height 300ms ease-out" : undefined,
              paddingTop: 4,
              marginBottom: -8,
              marginTop: 12,
              color: TICKET_INK,
            }}
          >
            <p
              style={{
                ...ticketMono,
                fontSize: 10,
                letterSpacing: "0.18em",
                opacity: 0.6,
                margin: 0,
              }}
            >
              GUEST
            </p>
            <p
              ref={nameTextRef}
              style={{
                ...displayFace(values.name),
                fontWeight: 800,
                lineHeight: 1.1,
                textTransform: "uppercase",
                margin: "6px 0 0",
              }}
            >
              {values.name}
            </p>
            <div
              ref={stampBoxRef}
              style={{
                position: "relative",
                height: stampH || 112,
                marginTop: -Math.round(STAMP_OVERLAP * nameRem * 16),
              }}
            >
              {stamp}
            </div>
          </div>
        ) : (
          <>
            <input
              className="fld"
              type="text"
              name="name"
              autoComplete="name"
              enterKeyHint="next"
              ref={nameRef}
              onKeyDown={walk(emailRef)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="your name"
              aria-label="Your name"
              value={values.name}
              disabled={locked}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <input
              className="fld fade"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint={showPhone ? "next" : "go"}
              ref={emailRef}
              onKeyDown={walk(showPhone ? phoneRef : null)}
              placeholder="your email"
              aria-label="Email"
              value={values.email}
              disabled={locked}
              onChange={(e) => onChange({ email: e.target.value })}
            />
            {showPhone && (
              <input
                className="fld fade"
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="go"
                ref={phoneRef}
                onKeyDown={walk(null)}
                placeholder="your phone"
                aria-label="Phone"
                value={values.phone}
                disabled={locked}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            )}
          </>
        )}
      </div>
      {error && (
        <p className="ferr" role="alert">
          {error}
        </p>
      )}
      <div
        className={`act fade${compact ? " tight" : ""}`}
        data-act
        hidden={admitted}
      >
        {children}
      </div>
    </form>
  );
}
