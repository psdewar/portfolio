"use client";

import { useEffect, useRef, useState } from "react";
import { Trash, Images, CheckCircle } from "@phosphor-icons/react";
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
const epunda = { fontFamily: "var(--font-epunda)" } as const;
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

    const FILE_CONCURRENCY = 3;
    let nextIndex = 0;
    await Promise.all(
      Array.from({ length: Math.min(FILE_CONCURRENCY, newJobs.length) }, async () => {
        while (nextIndex < newJobs.length) {
          await runJob(newJobs[nextIndex++]);
        }
      }),
    );
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
    <main className="flex h-full flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <MomentsGallery />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        {!unlocked ? (
          <form onSubmit={tryUnlock} className="mx-auto w-full max-w-xl space-y-4 sm:my-auto">
            <FormInput
              ref={passcodeRef}
              type="text"
              placeholder="Type the code I sent you"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              error={unlockError}
              variant="gold"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6">
            <DropZone onFiles={handleFiles} disabled={uploading} />

            {jobs.length > 0 && (
              <>
                <div className="shrink-0 mx-[calc(50%-50vw)] w-screen overflow-hidden border-y border-black/10 divide-y divide-black/10 sm:mx-0 sm:w-auto sm:rounded-2xl sm:border dark:border-white/10 dark:divide-white/10">
                {(uploading || (doneCount > 0 && failedJobs.length === 0)) && (
                  <Banner type="uploading" flat>
                    {uploading && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4a553] opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d4a553]" />
                      </span>
                    )}
                    <p className="flex-1 text-sm md:text-base font-medium tabular-nums" style={epunda}>
                      {uploading
                        ? "Wait here until uploading finishes."
                        : `${doneCount}/${jobs.length} received`}
                    </p>
                    {uploading ? (
                      <span className="shrink-0 text-xs font-normal tabular-nums text-[#d4a553]">
                        {doneCount}/{jobs.length}
                      </span>
                    ) : (
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-sm md:text-base font-normal" style={epunda}>
                        Send more or
                        <a
                          href="/support"
                          className="-my-2 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-normal uppercase tracking-wide text-[#0a0a0a]"
                          style={{ background: gold }}
                        >
                          Help fund my tour
                        </a>
                      </span>
                    )}
                  </Banner>
                )}
                {failedJobs.length > 0 && (
                  <Banner
                    type="failed"
                    flat
                    onClick={retryAllFailed}
                    ariaLabel={`Retry ${failedJobs.length} failed uploads`}
                  >
                    <span className="text-sm font-normal">
                      {failedJobs.length} failed
                      {doneCount > 0 ? ` · ${doneCount} done` : ""}
                    </span>
                    <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-normal uppercase tracking-wide text-red-600">
                      Retry all
                    </span>
                  </Banner>
                )}
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRetry={() => runJob(job)}
                    onRemove={() => removeJob(job)}
                  />
                ))}
                </div>
                <div ref={listEndRef} />
              </>
            )}
          </div>
        )}
      </div>

      {unlocked && (
        <p
          className="shrink-0 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm md:text-base"
          style={{ ...mono, backgroundColor: "#262b3f", color: "#d4a553" }}
        >
          Thanks for your participation
          <br />
          in my concert-conversation
        </p>
      )}
    </main>
  );
}

const BANNER_STYLES = {
  uploading: "bg-[#262b3f] text-white",
  failed: "bg-red-600 text-white",
} as const;

function Banner({
  type,
  flat,
  onClick,
  ariaLabel,
  children,
}: {
  type: keyof typeof BANNER_STYLES;
  flat?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const layout = flat
    ? "px-6"
    : "sticky top-0 z-20 mx-[calc(50%-50vw)] w-screen px-4 sm:px-6 lg:px-8 shadow-md";
  const cls = `${layout} flex min-h-[56px] items-center gap-3 py-3 ${BANNER_STYLES[type]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-live="polite"
        style={mono}
        className={`${cls} w-full text-left transition-all hover:brightness-95`}
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
      className={`group flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
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
          Send me your favorite moments
        </p>
        <p className="text-balance text-sm md:text-base text-neutral-600 dark:text-neutral-300">
          Share your longer videos too! They'll need some time to load.
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
  const showCheck = isDone && !job.duplicate;
  const dotIndex = job.file.name.lastIndexOf(".");
  const base = dotIndex > 0 ? job.file.name.slice(0, dotIndex) : job.file.name;
  const ext = dotIndex > 0 ? job.file.name.slice(dotIndex) : "";
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
    <div className="relative flex min-h-[56px] items-center overflow-hidden bg-neutral-100 dark:bg-white/5">
      <div
        className="absolute inset-y-0 left-0 transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: fillColor }}
      />
      <div className="relative flex min-w-0 flex-1 items-center gap-3 px-6 py-2">
        {showCheck && (
          <CheckCircle size={20} weight="fill" className="shrink-0 text-green-600 dark:text-green-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline text-sm md:text-base"><span className="min-w-0 truncate" style={epunda}>{base}</span>{ext && <span className="shrink-0" style={epunda}>{ext}</span>}</p>
          {!showCheck && (
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
          )}
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
          className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
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
          <div className="flex h-full w-full items-center gap-3 px-6 py-2 text-white">
            {showCheck && <CheckCircle size={20} weight="fill" className="shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-baseline text-sm md:text-base"><span className="min-w-0 truncate" style={epunda}>{base}</span>{ext && <span className="shrink-0" style={epunda}>{ext}</span>}</p>
              {!showCheck && (
                <span className="text-xs tabular-nums" style={mono}>
                  {statusText}
                </span>
              )}
            </div>
            <span className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center">
              <Trash size={20} weight="regular" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
