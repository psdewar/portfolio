"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseLyricsText, generateSrt, formatSrtTime, LyricLine } from "../../../lib/srt";
import { getDevToolsState } from "../../contexts/DevToolsContext";

type SyncState = "upload" | "sync" | "export";

interface TimedLine {
  text: string;
  start: number | null;
  end: number | null;
}

// IndexedDB helpers for audio storage
const DB_NAME = "lyrics-sync-db";
const STORE_NAME = "audio-files";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveAudioToDB(file: File): Promise<void> {
  const db = await openDB();
  const arrayBuffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ data: arrayBuffer, name: file.name, type: file.type }, "current-audio");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAudioFromDB(): Promise<File | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("current-audio");
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const blob = new Blob([result.data], { type: result.type });
          const file = new File([blob], result.name, { type: result.type });
          resolve(file);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearAudioFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete("current-audio");
  } catch {}
}

// localStorage keys
const LYRICS_STORAGE_KEY = "lyrics-sync-text";

export default function SyncPage() {
  // State
  const [state, setState] = useState<SyncState>("upload");
  const [lyricsText, setLyricsText] = useState("");
  const [lines, setLines] = useState<TimedLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [spaceHeldAt, setSpaceHeldAt] = useState<number | null>(null);

  // Clean lyrics staging
  const [showIngReview, setShowIngReview] = useState(false);
  const [ingConversions, setIngConversions] = useState<
    { original: string; converted: string; keep: boolean }[]
  >([]);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load saved lyrics and audio on mount
  useEffect(() => {
    // Load lyrics from localStorage
    const savedLyrics = localStorage.getItem(LYRICS_STORAGE_KEY);
    if (savedLyrics) {
      setLyricsText(savedLyrics);
    }

    // Load audio from IndexedDB
    loadAudioFromDB().then((file) => {
      if (file) {
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
      }
    });
  }, []);

  // Save lyrics to localStorage when changed
  useEffect(() => {
    if (lyricsText) {
      localStorage.setItem(LYRICS_STORAGE_KEY, lyricsText);
    }
  }, [lyricsText]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Audio time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // Spacebar handler for sync
  useEffect(() => {
    if (state !== "sync") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();

        if (e.repeat) return;
        if (!isPlaying || !audioRef.current) return;
        if (currentLineIndex >= lines.length) return;

        // Start timing this line
        const now = audioRef.current.currentTime;
        setSpaceHeldAt(now);
        setIsRecording(true);

        // Set start time for current line AND end time for previous line
        setLines((prev) => {
          const updated = [...prev];
          // Set current line's start
          updated[currentLineIndex] = {
            ...updated[currentLineIndex],
            start: now,
          };
          // Set previous line's end to this start (seamless transition)
          if (currentLineIndex > 0 && updated[currentLineIndex - 1].end === null) {
            updated[currentLineIndex - 1] = {
              ...updated[currentLineIndex - 1],
              end: now,
            };
          }
          return updated;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();

        if (!isRecording || !audioRef.current) return;

        // Don't set end time here - it will be set when next line starts
        // Only mark as not recording and move to next line
        const now = audioRef.current.currentTime;
        setIsRecording(false);
        setSpaceHeldAt(null);

        // Move to next line
        if (currentLineIndex < lines.length - 1) {
          setCurrentLineIndex((i) => i + 1);
        } else {
          // Last line - set its end time now since there's no next line
          setLines((prev) => {
            const updated = [...prev];
            updated[currentLineIndex] = {
              ...updated[currentLineIndex],
              end: now,
            };
            return updated;
          });
          // All lines synced
          setState("export");
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      }
    };

    // Prevent spacebar from scrolling page
    const preventScroll = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("keydown", preventScroll, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      document.removeEventListener("keydown", preventScroll, { capture: true });
    };
  }, [state, isPlaying, isRecording, currentLineIndex, lines.length]);

  // Auto-scroll to keep current line in view (centered)
  useEffect(() => {
    if (state !== "sync") return;
    const currentLineEl = lineRefs.current[currentLineIndex];
    if (currentLineEl && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      // Use scrollIntoView for reliable centering
      currentLineEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLineIndex, state]);

  // Handle lyrics file upload
  const handleLyricsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setLyricsText(text);
    };
    reader.readAsText(file);
  };

  // Handle audio file upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));

    // Save to IndexedDB for persistence
    saveAudioToDB(file);
  };

  // Start sync process
  const startSync = () => {
    if (!lyricsText.trim() || !audioUrl) return;

    const parsedLines = parseLyricsText(lyricsText);
    setLines(parsedLines.map((text) => ({ text, start: null, end: null })));
    setCurrentLineIndex(0);
    setState("sync");
  };

  // Play/pause audio
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Seek audio
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Reset and start over (keeps saved data)
  const reset = () => {
    setState("upload");
    setLines([]);
    setCurrentLineIndex(0);
    setIsRecording(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  // Clear all saved data and reset
  const clearAll = () => {
    reset();
    setLyricsText("");
    setAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    localStorage.removeItem(LYRICS_STORAGE_KEY);
    clearAudioFromDB();
  };

  // Undo last line
  const undoLast = () => {
    if (currentLineIndex === 0) return;

    setLines((prev) => {
      const updated = [...prev];
      // Clear the start/end of the line we're undoing
      updated[currentLineIndex - 1] = {
        ...updated[currentLineIndex - 1],
        start: null,
        end: null,
      };
      // Also clear the end time of the line before that (since it was set when this line started)
      if (currentLineIndex >= 2) {
        updated[currentLineIndex - 2] = {
          ...updated[currentLineIndex - 2],
          end: null,
        };
      }
      return updated;
    });
    setCurrentLineIndex((i) => i - 1);
  };

  // Generate and download SRT
  const downloadSrt = () => {
    const completedLines: LyricLine[] = lines
      .filter((line) => line.start !== null && line.end !== null)
      .map((line) => ({
        text: line.text,
        start: line.start!,
        end: line.end!,
      }));

    const srtContent = generateSrt(completedLines);
    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = audioFile?.name.replace(/\.[^.]+$/, ".srt") || "lyrics.srt";
    a.click();

    URL.revokeObjectURL(url);
  };

  // Download JSON for player
  const downloadJson = () => {
    const completedLines: LyricLine[] = lines
      .filter((line) => line.start !== null && line.end !== null)
      .map((line) => ({
        text: line.text,
        start: line.start!,
        end: line.end!,
      }));

    const jsonContent = JSON.stringify(completedLines, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = audioFile?.name.replace(/\.[^.]+$/, ".json") || "lyrics.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  // Words that should NOT be converted from "ing" to "in'"
  // These are nouns/rhyme words, not verbs
  const ingExceptions = new Set([
    "thing",
    "things",
    "nothing",
    "something",
    "everything",
    "anything",
    "ring",
    "rings",
    "bring",
    "brings",
    "king",
    "kings",
    "sing",
    "sings",
    "bling",
    "swing",
    "swings",
    "spring",
    "springs",
    "string",
    "strings",
    "wing",
    "wings",
    "sting",
    "stings",
    "fling",
    "flings",
    "cling",
    "clings",
    "wring",
    "wrings",
    "Beijing",
  ]);

  // Clean lyrics for hip-hop style - step 1: clean and find ING words
  const cleanLyrics = () => {
    const { enableIngConversion } = getDevToolsState();

    // Clean the text - normalize smart quotes, remove punctuation (keep parentheses for ad-libs)
    let cleaned = lyricsText
      .replace(/\$[^$]*\$/g, "") // Remove LaTeX-style math like $b$
      .replace(/[\u2018\u2019\u0060\u00B4]/g, "\u0027") // Curly apostrophes → straight '
      .replace(/[\u201C\u201D]/g, "") // Remove curly quotes
      .replace(/[^\w\s\u0027\-\n\(\)]/g, "") // Remove punctuation except apostrophes, hyphens, and parentheses
      .replace(/  +/g, " ") // Clean up extra spaces
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.charAt(0).toUpperCase() + line.slice(1)) // Capitalize first letter of each line
      .join("\n");

    // Add apostrophe to verbs ending in "in" (like runnin → runnin')
    cleaned = cleaned.replace(/\b(\w+in)\b(?!')/gi, (match) => {
      // Skip words that are already proper words ending in "in" (not dropped g)
      const skipWords = new Set([
        "in",
        "sin",
        "win",
        "bin",
        "tin",
        "pin",
        "kin",
        "chin",
        "thin",
        "skin",
        "spin",
        "grin",
        "begin",
        "within",
        "cabin",
        "satin",
        "basin",
        "raisin",
        "cousin",
        "margin",
        "origin",
        "virgin",
        "captain",
        "ertain",
        "mountain",
        "fountain",
        "curtain",
        "certain",
        "villain",
        "penguin",
        "dolphin",
        "pumpkin",
        "muffin",
        "coffin",
        "pain",
        "brain",
        "rain",
        "refrain",
        "remain",
        "terrain",
      ]);
      if (skipWords.has(match.toLowerCase())) {
        return match;
      }
      return match + "'";
    });

    // Find all ING words that would be converted (not in exceptions)
    const ingWords: { original: string; converted: string; keep: boolean }[] = [];
    const seenWords = new Set<string>();

    if (enableIngConversion) {
      cleaned.replace(/\b(\w+ing)\b/gi, (match) => {
        const lower = match.toLowerCase();
        if (!ingExceptions.has(lower) && !seenWords.has(lower)) {
          seenWords.add(lower);
          ingWords.push({
            original: match,
            converted: match.slice(0, -1) + "'",
            keep: true, // Default to keeping the conversion
          });
        }
        return match;
      });
    }

    // Apply conversions immediately (user will uncheck ones to revert)
    if (enableIngConversion) {
      cleaned = cleaned.replace(/\b(\w+ing)\b/gi, (match) => {
        if (ingExceptions.has(match.toLowerCase())) {
          return match;
        }
        return match.slice(0, -1) + "'";
      });
    }

    setLyricsText(cleaned);

    // If there are ING conversions, show review panel
    if (ingWords.length > 0) {
      setIngConversions(ingWords);
      setShowIngReview(true);
    }
  };

  // Apply ING review - revert unchecked conversions
  const applyIngReview = () => {
    let updated = lyricsText;

    // Revert conversions that were unchecked
    ingConversions.forEach(({ original, converted, keep }) => {
      if (!keep) {
        // Revert: replace converted back to original
        const regex = new RegExp(`\\b${converted.replace("'", "'")}\\b`, "gi");
        updated = updated.replace(regex, original);
      }
    });

    setLyricsText(updated);
    setShowIngReview(false);
    setIngConversions([]);
  };

  // Toggle a specific ING conversion
  const toggleIngConversion = (index: number) => {
    setIngConversions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, keep: !item.keep } : item))
    );
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-medium text-neutral-900 dark:text-white mb-2">
        Lyrics Sync Tool
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Sync lyrics to audio by holding spacebar for each line
      </p>

      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {/* Upload State */}
      {state === "upload" && (
        <div className="space-y-6">
          {/* Lyrics upload */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
              1. Add Lyrics
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors text-neutral-600 dark:text-neutral-400"
              >
                Upload .txt file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleLyricsUpload}
                className="hidden"
              />

              <div className="text-center text-neutral-400 text-sm">or paste below</div>

              <textarea
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
                placeholder="Paste lyrics here (one line per lyric)..."
                rows={10}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
              />

              {lyricsText && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      {parseLyricsText(lyricsText).length} lines detected
                    </p>
                    {!showIngReview && (
                      <button
                        onClick={cleanLyrics}
                        className="text-sm px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors"
                      >
                        ✨ Clean Lyrics
                      </button>
                    )}
                  </div>

                  {/* ING Conversion Review Panel */}
                  {showIngReview && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200 dark:border-orange-500/30">
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-3">
                        Review -ing → -in' conversions
                      </p>
                      <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mb-4">
                        Uncheck any words that should stay as "-ing" (for rhymes, etc.)
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {ingConversions.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => toggleIngConversion(i)}
                            className={`px-3 py-1.5 rounded-full text-sm font-mono transition-all ${
                              item.keep
                                ? "bg-orange-200 dark:bg-orange-500/30 text-orange-800 dark:text-orange-300"
                                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 line-through"
                            }`}
                          >
                            {item.keep ? item.converted : item.original}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={applyIngReview}
                          className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Audio upload */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
              2. Add Audio
            </h2>

            <button
              onClick={() => audioInputRef.current?.click()}
              className="w-full py-3 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors text-neutral-600 dark:text-neutral-400"
            >
              {audioFile ? audioFile.name : "Upload audio file"}
            </button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </div>

          {/* Start button */}
          <button
            onClick={startSync}
            disabled={!lyricsText.trim() || !audioUrl}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-neutral-400 disabled:to-neutral-500 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed"
          >
            Start Syncing
          </button>

          {/* Clear all - only show if there's saved data */}
          {(lyricsText || audioFile) && (
            <button
              onClick={clearAll}
              className="w-full py-3 text-sm text-neutral-500 hover:text-red-500 transition-colors"
            >
              Clear saved data
            </button>
          )}
        </div>
      )}

      {/* Sync State */}
      {state === "sync" && (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-4 text-center">
            <p className="text-orange-700 dark:text-orange-400 font-medium">
              Hold{" "}
              <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 rounded border border-orange-200 dark:border-orange-500/30 mx-1">
                Space
              </kbd>{" "}
              while singing each line
            </p>
            <p className="text-orange-600/70 dark:text-orange-400/70 text-sm mt-1">
              Press down when the line starts, release when it ends
            </p>
          </div>

          {/* Audio controls */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Progress bar */}
              <div className="flex-1">
                <div
                  className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    seekTo(pct * duration);
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lyrics display */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
              <span className="text-sm text-neutral-500">
                Line {currentLineIndex + 1} of {lines.length}
              </span>
              <button
                onClick={undoLast}
                disabled={currentLineIndex === 0}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Undo last
              </button>
            </div>

            <div ref={lyricsContainerRef} className="max-h-[400px] overflow-y-auto">
              {lines.map((line, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={`px-4 py-3 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0 transition-colors ${
                    i === currentLineIndex
                      ? isRecording
                        ? "bg-orange-100 dark:bg-orange-500/20"
                        : "bg-orange-50 dark:bg-orange-500/10"
                      : i < currentLineIndex
                      ? "bg-green-50 dark:bg-green-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-neutral-400 tabular-nums w-6 pt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`${
                          i === currentLineIndex
                            ? "font-medium text-neutral-900 dark:text-white"
                            : "text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {line.text}
                      </p>
                      {line.start !== null && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 tabular-nums">
                          {formatSrtTime(line.start)}
                          {line.end !== null ? ` → ${formatSrtTime(line.end)}` : " → ..."}
                        </p>
                      )}
                    </div>
                    {i < currentLineIndex && (
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {i === currentLineIndex && isRecording && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        {i === lines.length - 1 && (
                          <span className="text-xs font-semibold text-red-500 animate-pulse">
                            HOLD
                          </span>
                        )}
                      </div>
                    )}
                    {i === currentLineIndex && !isRecording && i === lines.length - 1 && (
                      <span className="text-[10px] text-orange-500 dark:text-orange-400 flex-shrink-0">
                        Last line – hold until end
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={reset}
            className="w-full py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Export State */}
      {state === "export" && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-6 text-center">
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-medium text-green-700 dark:text-green-400">
              Sync Complete!
            </h2>
            <p className="text-green-600/70 dark:text-green-400/70 mt-1">
              All {lines.length} lines have been synced
            </p>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-medium text-neutral-900 dark:text-white">Preview</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-4 font-mono text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
              {generateSrt(
                lines
                  .filter((l) => l.start !== null && l.end !== null)
                  .map((l) => ({ text: l.text, start: l.start!, end: l.end! }))
              )}
            </div>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={downloadSrt}
              className="py-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-medium rounded-xl transition-all"
            >
              .srt
            </button>
            <button
              onClick={downloadJson}
              className="py-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-medium rounded-xl transition-all"
            >
              .json
            </button>
            <button
              onClick={() => {
                downloadSrt();
                setTimeout(downloadJson, 100);
              }}
              className="py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all"
            >
              Both
            </button>
          </div>

          {/* Start over */}
          <button
            onClick={reset}
            className="w-full py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Sync Another Track
          </button>
        </div>
      )}
    </div>
  );
}
