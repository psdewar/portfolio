"use client";

import { useEffect, useRef, useState } from "react";
import { Trash, Images } from "@phosphor-icons/react";
import FormInput from "../components/FormInput";
import MomentsGallery from "./MomentsGallery";
import { uploadFile, type UploadMeta } from "./upload";

type JobStatus = "queued" | "uploading" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  progress: number;
  status: JobStatus;
  error?: string;
  duplicate?: boolean;
  key?: string;
};

const parkinsans = { fontFamily: '"Parkinsans", sans-serif' } as const;
const mono = { fontFamily: '"Space Mono", monospace' } as const;
const gold = "linear-gradient(to right, #d4a553, #e0b860)";

export default function MomentsClient() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [jobs, setJobs] = useState<FileJob[]>([]);
  const passcodeRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const removedIds = useRef(new Set<string>());
  const prevJobCount = useRef(0);

  useEffect(() => {
    if (!unlocked) passcodeRef.current?.focus();
  }, [unlocked]);

  useEffect(() => {
    const saved = sessionStorage.getItem("momentsUnlock");
    if (saved) {
      setPasscode(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (jobs.length > prevJobCount.current) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevJobCount.current = jobs.length;
  }, [jobs.length]);

  const uploading = jobs.some((j) => j.status === "uploading" || j.status === "queued");
  const failedJobs = jobs.filter((j) => j.status === "error");
  const doneCount = jobs.filter((j) => j.status === "done").length;

  useEffect(() => {
    if (!uploading) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as {
      wakeLock?: {
        request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };
    const request = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        lock = null;
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible" && uploading) request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [uploading]);

  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function retryAllFailed() {
    for (const job of failedJobs) await runJob(job);
  }

  async function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    const code = passcode.trim();
    if (!code) return;
    setUnlockLoading(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/moments/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUnlockError(data.error || "Wrong passcode");
        return;
      }
      setUnlocked(true);
      sessionStorage.setItem("momentsUnlock", code);
    } catch {
      setUnlockError("Something went wrong. Try again.");
    } finally {
      setUnlockLoading(false);
    }
  }

  function updateJob(id: string, patch: Partial<FileJob>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const active = new Set(
      jobs
        .filter((j) => j.status === "uploading" || j.status === "queued")
        .map((j) => `${j.file.name}:${j.file.size}:${j.file.lastModified}`),
    );
    const incoming = Array.from(fileList).filter(
      (f) => !active.has(`${f.name}:${f.size}:${f.lastModified}`),
    );
    if (incoming.length === 0) return;

    const newJobs: FileJob[] = incoming.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      progress: 0,
      status: "queued",
    }));
    setJobs((prev) => [...prev, ...newJobs]);

    for (const job of newJobs) await runJob(job);
  }

  async function runJob(job: FileJob) {
    if (removedIds.current.has(job.id)) return;
    const meta: UploadMeta = { passcode };
    const controller = new AbortController();
    controllers.current.set(job.id, controller);
    updateJob(job.id, { status: "uploading", progress: 0, error: undefined });
    let lastPct = -1;
    try {
      const result = await uploadFile(
        job.file,
        meta,
        (pct) => {
          const rounded = Math.round(pct);
          if (rounded !== lastPct) {
            lastPct = rounded;
            updateJob(job.id, { progress: rounded });
          }
        },
        controller.signal,
      );
      updateJob(job.id, {
        status: "done",
        progress: 100,
        duplicate: result.duplicate,
        key: result.key,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "CancelledError") return;
      updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      controllers.current.delete(job.id);
    }
  }

  function removeJob(job: FileJob) {
    removedIds.current.add(job.id);
    controllers.current.get(job.id)?.abort();
    controllers.current.delete(job.id);
    if (job.status === "done" && job.key && !job.duplicate) {
      fetch("/api/moments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, key: job.key }),
      }).catch(() => {});
    }
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col items-center px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="w-full max-w-xl space-y-8">
        <header className="space-y-3">
          <h1
            className="text-4xl md:text-5xl font-semibold uppercase leading-tight"
            style={parkinsans}
          >
            Send me your favorite moments from the concert
          </h1>
          <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-300">
            Thanks for attending From The Ground Up: My Path of Growth and the Principles that
            Connect Us!
          </p>
        </header>

        <MomentsGallery />

        {!unlocked ? (
          <form onSubmit={tryUnlock} className="space-y-4">
            <FormInput
              ref={passcodeRef}
              type="text"
              placeholder="Type the code I sent you"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              error={unlockError}
              variant="gold"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={unlockLoading || !passcode.trim()}
              className="w-full py-4 font-medium text-lg rounded-lg text-[#0a0a0a] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: gold }}
            >
              {unlockLoading ? "Opening..." : "Open"}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <DropZone onFiles={handleFiles} disabled={uploading} />

            {jobs.length > 0 && (
              <div className="space-y-3">
                {(uploading || (doneCount > 0 && failedJobs.length === 0)) && (
                  <Banner type="uploading" box>
                    {uploading ? (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4a553] opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d4a553]" />
                      </span>
                    ) : (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                    )}
                    <p className="flex-1 text-sm font-semibold">
                      {uploading
                        ? "Wait here until uploading finishes."
                        : "All uploads finished. Drop another if you have one."}
                    </p>
                    <span
                      className={`shrink-0 text-xs font-semibold tabular-nums ${
                        uploading ? "text-[#d4a553]" : "text-green-400"
                      }`}
                    >
                      {doneCount}/{jobs.length}
                    </span>
                  </Banner>
                )}
                {failedJobs.length > 0 && (
                  <Banner
                    type="failed"
                    onClick={retryAllFailed}
                    ariaLabel={`Retry ${failedJobs.length} failed uploads`}
                  >
                    <span className="text-sm font-semibold">
                      {failedJobs.length} failed
                      {doneCount > 0 ? ` · ${doneCount} done` : ""}
                    </span>
                    <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                      Retry all
                    </span>
                  </Banner>
                )}
                <ul className="space-y-2">
                  {jobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onRetry={() => runJob(job)}
                      onRemove={() => removeJob(job)}
                    />
                  ))}
                </ul>
                <div ref={listEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const BANNER_STYLES = {
  uploading: "bg-neutral-900 text-white dark:bg-neutral-800",
  failed: "bg-red-600 text-white",
} as const;

function Banner({
  type,
  box,
  onClick,
  ariaLabel,
  children,
}: {
  type: keyof typeof BANNER_STYLES;
  box?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const edge = box
    ? "mx-[calc(50%-50vw)] w-screen sm:mx-0 sm:w-auto sm:rounded-xl"
    : "mx-[calc(50%-50vw)] w-screen";
  const cls = `sticky top-0 z-20 ${edge} flex min-h-[3rem] items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 shadow-md ${BANNER_STYLES[type]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-live="polite"
        style={mono}
        className={`${cls} text-left transition-all hover:brightness-95`}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cls} style={mono}>
      {children}
    </div>
  );
}

function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: FileList | null) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    onFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-neutral-200 opacity-60 dark:border-neutral-800"
          : dragActive
            ? "cursor-pointer border-[#d4a553] bg-[#d4a553]/5"
            : "cursor-pointer border-neutral-300 hover:border-[#d4a553] dark:border-neutral-700 dark:hover:border-[#d4a553]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d4a553]/15 text-[#d4a553] transition-transform duration-300 group-hover:scale-110">
        <Images size={30} weight="regular" />
      </span>
      <div className="space-y-1.5">
        <p className="text-xl md:text-2xl" style={parkinsans}>
          Add your photos and videos
        </p>
        <p className="text-balance text-sm md:text-base text-neutral-600 dark:text-neutral-300">
          Choose the best from your camera roll or gallery.
        </p>
      </div>
    </div>
  );
}

function JobRow({
  job,
  onRetry,
  onRemove,
}: {
  job: FileJob;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const isError = job.status === "error";
  const isDone = job.status === "done";
  const pct = isDone ? 100 : job.progress;
  const statusText = isDone
    ? job.duplicate
      ? "Already added"
      : "Done"
    : isError
      ? job.error || "Failed"
      : job.status === "queued"
        ? "Waiting"
        : `${job.progress}%`;

  const lerp = (from: number, to: number) => Math.round(from + ((to - from) * pct) / 100);
  const fillColor = isError
    ? "rgba(239, 68, 68, 0.15)"
    : `rgb(${lerp(115, 22)}, ${lerp(115, 163)}, ${lerp(115, 74)})`;

  return (
    <li className="relative flex min-h-[56px] items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-white/5">
      <div
        className="absolute inset-y-0 left-0 transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
      <div className="relative flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{job.file.name}</p>
          <span
            className={`text-xs tabular-nums ${
              isError
                ? "text-red-600 dark:text-red-400"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
            style={mono}
          >
            {statusText}
          </span>
        </div>
        {isError && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={`Retry ${job.file.name}`}
            className="shrink-0 px-2 py-2 text-xs uppercase tracking-wider text-[#d4a553]"
            style={mono}
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Remove this upload?")) onRemove();
          }}
          aria-label={`Remove ${job.file.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
        >
          <Trash size={20} weight="regular" />
        </button>
      </div>
      {!isError && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-all duration-300"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        >
          <div className="flex h-full w-full items-center gap-2 px-3 py-2 text-white">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{job.file.name}</p>
              <span className="text-xs tabular-nums" style={mono}>
                {statusText}
              </span>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Trash size={20} weight="regular" />
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
