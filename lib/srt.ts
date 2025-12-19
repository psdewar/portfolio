/**
 * Shared SRT utilities for parsing and generating subtitle files
 * Used by: convert-srt.js (build), /admin/sync (runtime)
 */

export interface LyricLine {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

/**
 * Parse SRT timestamp to seconds
 * Format: HH:MM:SS,mmm (e.g., "00:01:23,456")
 */
export function parseSrtTime(time: string): number {
  const [h, m, rest] = time.split(":");
  const [s, ms] = rest.split(",");
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}

/**
 * Convert seconds to SRT timestamp format
 * Format: HH:MM:SS,mmm
 */
export function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return (
    [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":") +
    "," +
    ms.toString().padStart(3, "0")
  );
}

/**
 * Parse SRT file content to array of lyric lines
 */
export function parseSrt(content: string): LyricLine[] {
  const blocks = content.trim().split(/\n\n+/);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length < 3) return null;

      const timeLine = lines[1];
      if (!timeLine.includes(" --> ")) return null;

      const [startTime, endTime] = timeLine.split(" --> ");

      return {
        start: parseSrtTime(startTime.trim()),
        end: parseSrtTime(endTime.trim()),
        text: lines.slice(2).join(" ").trim(),
      };
    })
    .filter((line): line is LyricLine => line !== null);
}

/**
 * Generate SRT file content from array of lyric lines
 */
export function generateSrt(lines: LyricLine[]): string {
  return lines
    .map((line, index) => {
      return [
        (index + 1).toString(),
        `${formatSrtTime(line.start)} --> ${formatSrtTime(line.end)}`,
        line.text,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Parse plain text lyrics (one line per lyric) to array of strings
 */
export function parseLyricsText(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Convert timed entries to JSON format for the player
 */
export function toPlayerJson(lines: LyricLine[]): string {
  return JSON.stringify(lines, null, 2);
}
