import patienceLyrics from "../../data/lyrics/patience.json";

export type LyricLine = { start: number; end: number; text: string; isCTA?: boolean };

export const CTA_MARKER = "[GET FULL LYRICS]";
export const LYRIC_LOOKAHEAD = 0.3;

const LYRICS_DATA: Record<string, LyricLine[]> = {
  patience: patienceLyrics as LyricLine[],
};

export const getLyrics = (trackId: string): LyricLine[] | undefined => LYRICS_DATA[trackId];

export const getCurrentLyric = (
  trackId: string,
  currentTime: number,
  offset = LYRIC_LOOKAHEAD,
): LyricLine | undefined => {
  const lines = LYRICS_DATA[trackId];
  if (!lines) return undefined;
  const adjusted = currentTime + offset;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (adjusted >= lines[i].start) return lines[i];
  }
  return undefined;
};

export const isCtaLyric = (line: LyricLine | undefined): boolean =>
  !!line?.text.includes(CTA_MARKER);
