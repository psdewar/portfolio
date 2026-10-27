"use client";

import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type Ref } from "react";

const toMs = (v: string) => {
  const n = parseFloat(v);
  if (!n) return 320;
  return v.trim().endsWith("ms") ? n : n * 1000;
};

export const motion = () => {
  const cs = getComputedStyle(document.querySelector(".ci") ?? document.documentElement);
  return {
    ms: toMs(cs.getPropertyValue("--ck-dur")),
    ease: cs.getPropertyValue("--ck-ease").trim() || "cubic-bezier(.2,.8,.2,1)",
  };
};

export function Mark({ done, pop = false }: { done: boolean; pop?: boolean }) {
  if (done) {
    return (
      <span className="mk">
        <svg className={pop ? "pop" : undefined} viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="#d4a553" />
          <path
            d="M3.8 7.2l2.2 2.2 4.2-4.4"
            fill="none"
            stroke="#262b3f"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="mk">
      <svg viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="7" fill="#d5d8de" />
        <path
          d="M3.8 7.2l2.2 2.2 4.2-4.4"
          fill="none"
          stroke="#fff"
          strokeOpacity=".7"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Lead({
  done = false,
  pop = false,
  mark = true,
  children,
}: {
  done?: boolean;
  pop?: boolean;
  mark?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={`lead${children ? "" : " plain"}`}>
      {children}
      {mark && <Mark done={done} pop={pop} />}
    </span>
  );
}

export const DoneText = ({ done }: { done: boolean }) =>
  done ? <span className="sr-only">, done</span> : null;

const lineProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function Chev() {
  return (
    <svg className="chev" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg className="dl" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19h15" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg className="dl" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 19h15" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const bezier = (ease: string) => {
  const m = ease.match(/cubic-bezier\(([^)]+)\)/);
  const [x1, y1, x2, y2] = m ? m[1].split(",").map(parseFloat) : [0.2, 0.8, 0.2, 1];
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 20; i++) {
      t = (lo + hi) / 2;
      if (at(x1, x2, t) < x) lo = t;
      else hi = t;
    }
    return at(y1, y2, t);
  };
};

type Run = { root: Element; dir: "open" | "close"; stop: (release: boolean) => void };
type SheetState = { last: number; pad: number; run: Run | null };
const sheets = new WeakMap<Element, SheetState>();

const sheetState = (sheet: HTMLElement) => {
  let s = sheets.get(sheet);
  if (!s) {
    const state: SheetState = { last: sheet.scrollTop, pad: 0, run: null };
    sheet.addEventListener(
      "scroll",
      () => {
        if (!state.run) state.last = sheet.scrollTop;
      },
      { passive: true },
    );
    sheets.set(sheet, state);
    s = state;
  }
  return s;
};

export function runRowMotion(root: HTMLElement, dir: "open" | "close") {
  const sheet = root.closest<HTMLElement>(".ci-sheet");
  const head = root.querySelector<HTMLElement>(".srow");
  if (!sheet || !head) return;
  const s = sheetState(sheet);
  if (s.run?.root === root && s.run.dir === dir) return;
  const s0 = s.run ? sheet.scrollTop : s.last;
  s.run?.stop(false);
  const clientH = sheet.clientHeight;
  const top = root.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop;
  const y0 = top - s0;
  const body = root.querySelector<HTMLElement>(".body");
  const grown = body ? body.offsetHeight : 0;
  const base = (parseFloat(getComputedStyle(sheet).paddingBottom) || 0) - s.pad;
  const content = sheet.firstElementChild;
  const padTop = parseFloat(getComputedStyle(sheet).paddingTop) || 0;
  const measure = () =>
    content && sheet.scrollHeight <= sheet.clientHeight
      ? content.getBoundingClientRect().height + padTop + base
      : sheet.scrollHeight - s.pad;
  const natural = measure();
  const openH = body ? ((body.firstElementChild as HTMLElement | null)?.scrollHeight ?? grown) : root.offsetHeight - head.offsetHeight;
  const room = Math.max(0, natural - grown + openH - clientH);
  const setPad = (want: number) => {
    const pad = want < 0.5 ? 0 : want;
    sheet.style.paddingBottom = pad ? `${base + pad}px` : "";
    s.pad = pad;
  };
  let end: number;
  if (dir === "open") {
    end = Math.min(room, top);
  } else {
    end = Math.min(s0, Math.max(0, natural - grown - clientH));
  }
  if (reducedMotion()) {
    setPad(0);
    sheet.scrollTop = end;
    s.last = sheet.scrollTop;
    return;
  }
  if (Math.abs(end - s0) < 1) {
    setPad(0);
    return;
  }
  const { ms, ease } = motion();
  const curve = bezier(ease);
  let t0 = -1;
  let set = sheet.scrollTop;
  let raf = 0;
  let p = 0;

  const apply = () => {
    const clamped = sheet.scrollTop < set && sheet.scrollTop >= sheet.scrollHeight - sheet.clientHeight - 1;
    if (!clamped && Math.abs(sheet.scrollTop - set) > 2) {
      stop(true);
      return;
    }
    const now = root.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop;
    let v: number;
    if (dir === "open") {
      v = s0 + (Math.min(room, now) - s0) * curve(p);
    } else {
      const e = Math.min(end, Math.max(0, sheet.scrollHeight - s.pad - clientH));
      v = Math.max(0, now - (y0 + (top - e - y0) * curve(p)));
    }
    setPad(Math.max(0, v + clientH - measure()));
    sheet.scrollTop = v;
    set = sheet.scrollTop;
  };

  const tick = (now: number) => {
    if (t0 < 0) {
      t0 = now;
      set = sheet.scrollTop;
    }
    p = Math.min(1, (now - t0) / ms);
    apply();
    if (!s.run || s.run.stop !== stop) return;
    if (p < 1) raf = requestAnimationFrame(tick);
    else stop(true);
  };

  const ro = new ResizeObserver(apply);
  const interrupt = () => stop(true);

  function stop(release: boolean) {
    cancelAnimationFrame(raf);
    ro.disconnect();
    sheet!.removeEventListener("touchstart", interrupt);
    sheet!.removeEventListener("wheel", interrupt);
    if (release) {
      setPad(0);
      s.last = sheet!.scrollTop;
    }
    if (s.run?.stop === stop) s.run = null;
  }

  s.run = { root, dir, stop };
  if (content) ro.observe(content);
  sheet.addEventListener("touchstart", interrupt, { passive: true });
  sheet.addEventListener("wheel", interrupt, { passive: true });
  apply();
  raf = requestAnimationFrame(tick);
}

export function useRowMotion(rootRef: MutableRefObject<HTMLElement | null>, open: boolean) {
  const prev = useRef(open);
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const sheet = root?.closest<HTMLElement>(".ci-sheet");
    if (!root || !sheet) return;
    const s = sheetState(sheet);
    if (prev.current === open) return;
    prev.current = open;
    if (open) {
      runRowMotion(root, "open");
      return;
    }
    queueMicrotask(() => {
      if (s.run?.dir === "open" && s.run.root !== root) return;
      runRowMotion(root, "close");
    });
  }, [open, rootRef]);
}

export function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function Row({ disabled, children, ...props }: React.ComponentProps<"button">) {
  if (disabled) return <div className={props.className}>{children}</div>;
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}

export function StepShell({
  id,
  n,
  stop = false,
  open,
  linked,
  onToggle,
  lead,
  title,
  sub,
  done = false,
  two = true,
  rootRef,
  after,
  disabled = false,
  children,
}: {
  id?: string;
  n?: number;
  stop?: boolean;
  open: boolean;
  linked: boolean;
  onToggle: () => void;
  lead: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  done?: boolean;
  two?: boolean;
  rootRef?: Ref<HTMLDivElement>;
  after?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const own = useRef<HTMLDivElement | null>(null);
  useRowMotion(own, open);
  const lastSub = useRef(sub);
  if (sub) lastSub.current = sub;
  const shownSub = sub ?? lastSub.current;
  const setRoot = (el: HTMLDivElement | null) => {
    own.current = el;
    if (typeof rootRef === "function") rootRef(el);
    else if (rootRef) (rootRef as MutableRefObject<HTMLDivElement | null>).current = el;
  };
  return (
    <div
      ref={setRoot}
      className={`${stop ? "stop" : "st"}${open ? " open" : ""}${linked ? " linked" : ""}${disabled ? " off" : ""}`}
      data-n={n}
      id={id}
    >
      <Row className={`srow${two ? " two" : ""}`} aria-expanded={open} disabled={disabled} onClick={onToggle}>
        {lead}
        <span className="t">
          {title}
          {shownSub && (
            <span className={`msub${sub ? " on" : ""}`}>
              <span className="mi">
                <span className="m">{shownSub}</span>
              </span>
            </span>
          )}
        </span>
        <Chev />
        <DoneText done={done} />
      </Row>
      <div className="body">
        <div className="inner">{children}</div>
      </div>
      {after}
    </div>
  );
}
