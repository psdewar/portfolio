import { useId, type Ref } from "react";

export const ROAD_FILL = "#3a3d45";
export const ROAD_EDGE = "#e0b53c";
export const ROAD_DASH = "#8f939a";
export const ROAD_BAND_GRADIENT = `linear-gradient(180deg, ${ROAD_EDGE} 0 2px, ${ROAD_FILL} 2px 4px, ${ROAD_EDGE} 4px 6px)`;

export const roadDashImage = (on: string | number, period: string | number) =>
  `repeating-linear-gradient(90deg, ${ROAD_DASH} 0 ${on}px, transparent ${on}px ${period}px)`;

export const treadTransform = (offset: number) =>
  `translate(${((offset / 2) % 4).toFixed(2)} 0)`;

export type CarLights = "off" | "low" | "high";

export default function RoadCar({
  treadRef,
  lights = "off",
  braking = false,
  reversing = false,
  width = 46,
  className = "",
}: {
  treadRef?: Ref<SVGPatternElement>;
  lights?: CarLights;
  braking?: boolean;
  reversing?: boolean;
  width?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const lampFill = lights === "off" ? "#a9adb5" : "#ffffff";
  const tailFill = braking
    ? "#ffd6d6"
    : reversing
      ? "#ffffff"
      : lights === "off"
        ? "#7d2222"
        : "#ff5a5a";
  return (
    <svg
      viewBox="0 0 46 18"
      width={width}
      height={(width * 18) / 46}
      aria-hidden="true"
      className={`overflow-visible ${className}`}
    >
      <defs>
        <pattern
          ref={treadRef}
          id={`${uid}-tread`}
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <rect width="4" height="4" fill="#141416" />
          <rect x="1.2" width="1.6" height="4" fill="#6b6e75" />
        </pattern>
        <linearGradient id={`${uid}-beam-low`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff1b8" stopOpacity=".55" />
          <stop offset=".7" stopColor="#fff1b8" stopOpacity=".3" />
          <stop offset="1" stopColor="#fff1b8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-beam-high`} x1="0" x2="1">
          <stop offset="0" stopColor="#f2f7ff" stopOpacity=".7" />
          <stop offset=".35" stopColor="#f2f7ff" stopOpacity=".3" />
          <stop offset="1" stopColor="#f2f7ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-lamp-glow`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-brake-glow`}>
          <stop offset="0" stopColor="#ff3b3b" stopOpacity=".85" />
          <stop offset="1" stopColor="#ff3b3b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {lights === "low" ? (
        <>
          <path
            d="M44.6 3.9L78 -3V11.5L44.6 5.7Z"
            fill={`url(#${uid}-beam-low)`}
          />
          <path
            d="M44.6 10.3L78 4.5V19L44.6 12.1Z"
            fill={`url(#${uid}-beam-low)`}
          />
        </>
      ) : null}
      {lights === "high" ? (
        <>
          <path
            d="M44.6 3.9L124 -4V11.5L44.6 5.7Z"
            fill={`url(#${uid}-beam-high)`}
          />
          <path
            d="M44.6 10.3L124 4.5V20L44.6 12.1Z"
            fill={`url(#${uid}-beam-high)`}
          />
        </>
      ) : null}
      <rect
        x="2"
        y="3.5"
        width="44"
        height="13.5"
        rx="3.5"
        fill="rgba(0,0,0,.35)"
      />
      <g fill={`url(#${uid}-tread)`}>
        <rect x="4.5" y="0" width="8" height="3.6" rx="0.9" />
        <rect x="4.5" y="12.4" width="8" height="3.6" rx="0.9" />
        <rect x="34.5" y="0" width="8" height="3.6" rx="0.9" />
        <rect x="34.5" y="12.4" width="8" height="3.6" rx="0.9" />
      </g>
      <rect x="29.8" y="0.9" width="2.4" height="1.6" rx="0.5" fill="#1c1c1e" />
      <rect
        x="29.8"
        y="13.5"
        width="2.4"
        height="1.6"
        rx="0.5"
        fill="#1c1c1e"
      />
      <path
        d="M3.5 2H41.5Q45 2 45 5.5V10.5Q45 14 41.5 14H3.5Q1 14 1 11.5V4.5Q1 2 3.5 2Z"
        fill="#c8202b"
        stroke="#7a0f18"
        strokeWidth="0.6"
      />
      <path
        d="M4 2.8H41Q43.6 2.8 44.2 5"
        fill="none"
        stroke="#ef5560"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <path
        d="M4 13.2H41Q43.6 13.2 44.2 11"
        fill="none"
        stroke="#8c121c"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <path d="M39 2.7V13.3M6.5 2.7V13.3" stroke="#8c121c" strokeWidth="0.5" />
      <rect x="11" y="3.4" width="20" height="9.2" rx="1" fill="#17181b" />
      <path
        d="M31.5 3.6H33.5Q36.4 4.6 37 8Q36.4 11.4 33.5 12.4H31.5Z"
        fill="#17181b"
      />
      <path d="M10.5 3.6V12.4H8.8Q7.9 8 8.8 3.6Z" fill="#17181b" />
      <path
        d="M32.6 4.6L35.2 5.6M32.8 11.4L35.4 10.4"
        stroke="rgba(255,255,255,.35)"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      {lights !== "off" ? (
        <>
          <circle cx="44" cy="4.8" r="2.6" fill={`url(#${uid}-lamp-glow)`} />
          <circle cx="44" cy="11.2" r="2.6" fill={`url(#${uid}-lamp-glow)`} />
        </>
      ) : null}
      <rect
        x="43.2"
        y="3.6"
        width="1.4"
        height="2.4"
        rx="0.5"
        fill={lampFill}
      />
      <rect x="43.2" y="10" width="1.4" height="2.4" rx="0.5" fill={lampFill} />
      {braking ? (
        <>
          <ellipse
            cx="0"
            cy="8"
            rx="9"
            ry="7"
            fill={`url(#${uid}-brake-glow)`}
            opacity=".45"
          />
          <circle cx="2" cy="4.8" r="3.2" fill={`url(#${uid}-brake-glow)`} />
          <circle cx="2" cy="11.2" r="3.2" fill={`url(#${uid}-brake-glow)`} />
        </>
      ) : null}
      {reversing ? (
        <>
          <circle cx="2" cy="4.8" r="2.6" fill={`url(#${uid}-lamp-glow)`} />
          <circle cx="2" cy="11.2" r="2.6" fill={`url(#${uid}-lamp-glow)`} />
        </>
      ) : null}
      <rect
        x="1.4"
        y="3.6"
        width="1.2"
        height="2.4"
        rx="0.5"
        style={{ fill: tailFill, transition: "fill .3s" }}
      />
      <rect
        x="1.4"
        y="10"
        width="1.2"
        height="2.4"
        rx="0.5"
        style={{ fill: tailFill, transition: "fill .3s" }}
      />
    </svg>
  );
}
