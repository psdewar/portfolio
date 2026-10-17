import { PLAY_MASK_STYLE, PAUSE_MASK_STYLE } from "../lib/glyph-masks";

export function PlayCircle({ playing }: { playing: boolean }) {
  return (
    <span
      aria-hidden
      className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center"
    >
      <span
        className="w-3.5 h-3.5 bg-white"
        style={playing ? PAUSE_MASK_STYLE : PLAY_MASK_STYLE}
      />
    </span>
  );
}
