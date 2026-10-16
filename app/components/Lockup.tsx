import { LOCKUP_CSS } from "../lib/lockup";
import { LYRIST_MARK_D } from "./lyristMark";

const LOGO_W = 2247 / 762;
const RECORDS_X = 3.1242;
const VIEW_W = 5.826;

function TintedLockup({ color, height }: { color: string; height: number }) {
  return (
    <svg
      role="img"
      aria-label="Lyrist Records"
      viewBox={`0 0 ${VIEW_W} 1`}
      height={height}
      style={{ display: "inline-block", width: "auto", verticalAlign: "middle", letterSpacing: "normal", textTransform: "none" }}
    >
      <path d={LYRIST_MARK_D} fill={color} fillRule="evenodd" transform={`scale(${LOGO_W / 2247})`} />
      <text
        x={RECORDS_X}
        y={0.7165}
        fontSize={0.7445}
        fontWeight={500}
        fill={color}
        style={{ fontFamily: "var(--font-fira-sans), sans-serif" }}
      >
        Records
      </text>
    </svg>
  );
}

export default function Lockup({ color, height }: { color?: string; height?: number }) {
  if (color && height) return <TintedLockup color={color} height={height} />;
  return (
    <>
      <style>{LOCKUP_CSS}</style>
      <div className="lockup">
        <img src="/lyrist-trademark-white.png" alt="Lyrist" className="lockup-img" />
        <span className="lockup-records">Records</span>
      </div>
    </>
  );
}
