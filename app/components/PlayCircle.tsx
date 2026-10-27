import { PLAY_MASK_STYLE, PAUSE_MASK_STYLE } from "../lib/glyph-masks";

export function PlayCircle({ playing, tone = "gradient" }: { playing: boolean; tone?: "gradient" | "gold" }) {
  return (
    <span
      aria-hidden
      className={`w-8 h-8 shrink-0 rounded-full ${tone === "gold" ? "bg-[#d4a553]" : "bg-gradient-to-br from-orange-400 to-pink-500"} flex items-center justify-center`}
    >
      <span
        className={`w-3.5 h-3.5 ${tone === "gold" ? "bg-[#262b3f]" : "bg-white"}`}
        style={playing ? PAUSE_MASK_STYLE : PLAY_MASK_STYLE}
      />
    </span>
  );
}
