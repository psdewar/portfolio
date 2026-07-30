"use client";

import { useEffect, useRef, useState } from "react";
import { X, Images, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import FormInput from "../components/FormInput";
import MomentsGallery from "./MomentsGallery";
import { uploadFile, makePreview, type PreviewResult, type UploadMeta } from "./upload";

type JobStatus = "queued" | "uploading" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  progress: number;
  status: JobStatus;
  thumb?: string;
  duration?: number;
  error?: string;
  duplicate?: boolean;
  key?: string;
};

const parkinsans = { fontFamily: '"Parkinsans", sans-serif' } as const;
const mono = { fontFamily: '"Space Mono", monospace' } as const;
const epunda = { fontFamily: "var(--font-epunda)" } as const;
const gold = "linear-gradient(to right, #d4a553, #e0b860)";

export default function MomentsClient({ fundSlug }: { fundSlug?: string }) {
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
  const jobsRef = useRef<FileJob[]>([]);
  jobsRef.current = jobs;
  const previewBlobs = useRef(new Map<string, Blob>());

  useEffect(
    () => () => {
      for (const j of jobsRef.current) if (j.thumb) URL.revokeObjectURL(j.thumb);
    },
    [],
  );

  useEffect(() => {
    if (!unlocked) passcodeRef.current?.focus();
  }, [unlocked]);

  useEffect(() => {
    const saved = sessionStorage.getItem("momentsUnlock");
    if (saved) {
      setPasscode(saved);
      setUnlocked(true);
      return;
    }
    const match = window.location.hash.match(/(?:^#|&)code=([^&]+)/);
    if (!match) return;
    let code = "";
    try {
      code = decodeURIComponent(match[1]);
    } catch {
      return;
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setPasscode(code);
    setUnlockLoading(true);
    fetch("/api/moments/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: code }),
    })
      .then((res) => {
        if (res.ok) {
          setUnlocked(true);
          sessionStorage.setItem("momentsUnlock", code);
        }
      })
      .catch(() => {})
      .finally(() => setUnlockLoading(false));
  }, []);

  useEffect(() => {
    if (jobs.length > prevJobCount.current) {
      listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevJobCount.current = jobs.length;
  }, [jobs.length]);

  const fundName = fundSlug ? fundSlug.charAt(0).toUpperCase() + fundSlug.slice(1) : "";
  const uploading = jobs.some((j) => j.status === "uploading" || j.status === "queued");
  const failedJobs = jobs.filter((j) => j.status === "error");
  const doneCount = jobs.filter((j) => j.status === "done").length;

  const measured = jobs.filter((j) => j.status !== "error");
  const totalBytes = measured.reduce((a, j) => a + j.file.size, 0);
  const uploadedBytes = measured.reduce(
    (a, j) => a + (j.status === "done" ? j.file.size : (j.progress / 100) * j.file.size),
    0,
  );
  const [etaText, setEtaText] = useState("");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const rateRef = useRef<{ t: number; bytes: number; rate: number } | null>(null);

  useEffect(() => {
    if (!uploading) {
      rateRef.current = null;
      setEtaText("");
      setDeadline(null);
      return;
    }
    const now = Date.now();
    const prev = rateRef.current;
    if (!prev) {
      rateRef.current = { t: now, bytes: uploadedBytes, rate: 0 };
      return;
    }
    const dt = (now - prev.t) / 1000;
    if (dt < 1) return;
    const inst = Math.max(0, uploadedBytes - prev.bytes) / dt;
    const rate = prev.rate > 0 ? prev.rate * 0.7 + inst * 0.3 : inst;
    rateRef.current = { t: now, bytes: uploadedBytes, rate };
    if (rate > 20000) {
      const secs = (totalBytes - uploadedBytes) / rate;
      if (secs <= 120) {
        setDeadline(now + secs * 1000);
        setEtaText("");
      } else {
        setDeadline(null);
        setEtaText(`${Math.min(99, Math.floor((uploadedBytes / totalBytes) * 100))}% sent`);
      }
    }
  }, [uploading, uploadedBytes, totalBytes]);

  useEffect(() => {
    if (!uploading || deadline === null) return;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [uploading, deadline]);

  const nowMs = clock > 0 ? clock : Date.now();
  const remainingSecs = deadline !== null ? Math.round((deadline - nowMs) / 1000) : null;
  const countdown =
    remainingSecs === null
      ? ""
      : remainingSecs < -2
        ? "Almost done"
        : remainingSecs < 60
          ? `${Math.max(1, remainingSecs)} second${Math.max(1, remainingSecs) === 1 ? "" : "s"} left`
          : "A couple minutes left";
  const subline = etaText || countdown;

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

  useEffect(() => {
    if (!uploading) return;
    window.history.pushState({ momentsUpload: true }, "");
    const onPop = () => {
      window.history.pushState({ momentsUpload: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.momentsUpload) window.history.back();
    };
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

  function grantThumb(job: FileJob, made: PreviewResult) {
    if (job.thumb || removedIds.current.has(job.id) || previewBlobs.current.has(job.id))
      return;
    previewBlobs.current.set(job.id, made.blob);
    updateJob(job.id, {
      thumb: URL.createObjectURL(made.blob),
      duration: made.duration,
    });
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
      thumb: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setJobs((prev) => [...prev, ...newJobs]);

    (async () => {
      for (const job of newJobs) {
        if (job.thumb) continue;
        const made = await makePreview(job.file).catch(() => null);
        if (made) grantThumb(job, made);
      }
    })();

    const queue = [...newJobs].sort((a, b) => a.file.size - b.file.size);
    const FILE_CONCURRENCY = 3;
    let nextIndex = 0;
    await Promise.all(
      Array.from({ length: Math.min(FILE_CONCURRENCY, queue.length) }, async () => {
        while (nextIndex < queue.length) {
          await runJob(queue[nextIndex++]);
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
        previewBlobs.current.get(job.id),
        (made) => grantThumb(job, made),
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
    previewBlobs.current.delete(job.id);
    if (job.thumb) URL.revokeObjectURL(job.thumb);
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
            <DropZone onFiles={handleFiles} />

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
                      {uploading ? (
                        <>
                          Wait here until uploading finishes.
                          {subline && (
                            <span className="block text-xs font-normal text-white/60">
                              {subline}
                            </span>
                          )}
                        </>
                      ) : (
                        `${doneCount}/${jobs.length} received`
                      )}
                    </p>
                    {uploading ? (
                      <span className="shrink-0 text-xs font-normal tabular-nums text-[#d4a553]">
                        {doneCount}/{jobs.length}
                      </span>
                    ) : (
                      <span className="ml-auto shrink-0 text-sm md:text-base font-normal" style={epunda}>
                        Send more anytime
                      </span>
                    )}
                  </Banner>
                )}
                {!uploading && doneCount > 0 && failedJobs.length === 0 && (
                  <div className="px-4 py-4 sm:px-6">
                    <a
                      href="/fund"
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-medium text-[#0a0a0a] transition-all hover:scale-[1.01]"
                      style={{ background: gold }}
                    >
                      {fundName ? `Help me cover my ${fundName} tour` : "Help me cover my tour"}
                      <ArrowRight size={20} weight="bold" />
                    </a>
                  </div>
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
                <div className="grid grid-cols-3 gap-px bg-black/10 sm:grid-cols-4 dark:bg-white/10">
                  <style>{`@media (prefers-reduced-motion: no-preference){.tile-in{animation:tileIn .45s ease both}}@keyframes tileIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}`}</style>
                  {jobs.map((job) => (
                    <MomentTile
                      key={job.id}
                      job={job}
                      onRetry={() => runJob(job)}
                      onRemove={() => removeJob(job)}
                    />
                  ))}
                </div>
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

function formatDuration(secs: number) {
  const total = Math.round(secs);
  const sec = total % 60;
  return `${Math.floor(total / 60)}:${sec < 10 ? "0" : ""}${sec}`;
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

function DropZone({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    onFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`group flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragActive
          ? "border-[#d4a553] bg-[#d4a553]/5"
          : "border-neutral-300 hover:border-[#d4a553] dark:border-neutral-700 dark:hover:border-[#d4a553]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,image/heic,image/heif,video/*"
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

function MomentTile({
  job,
  onRetry,
  onRemove,
}: {
  job: FileJob;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const isVideo = job.file.type.startsWith("video/");
  const isError = job.status === "error";
  const isDone = job.status === "done";
  const uploadingNow = job.status === "uploading";
  const pct = isDone ? 100 : job.progress;
  const veil = 100 - pct;

  return (
    <div className="tile-in relative aspect-square overflow-hidden bg-[#262b3f]">
      {job.thumb ? (
        <>
          <img
            src={job.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "grayscale(1) brightness(0.45)" }}
          />
          <img
            src={job.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-[clip-path] duration-300 ease-out"
            style={{ clipPath: `inset(0 0 ${veil}% 0)` }}
          />
        </>
      ) : (
        <p
          className="absolute inset-x-1 top-1/2 -translate-y-1/2 truncate text-center text-[10px] text-white/70"
          style={mono}
        >
          {job.file.name}
        </p>
      )}

      {uploadingNow && pct > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 h-[2px] bg-[#d4a553] shadow-[0_0_6px_rgba(212,165,83,0.9)] transition-[top] duration-300 ease-out"
          style={{ top: `${pct}%` }}
        />
      )}

      {uploadingNow &&
        (pct > 0 ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.85)] sm:text-xl"
            style={mono}
          >
            {pct}%
          </span>
        ) : (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
          </span>
        ))}
      {job.status === "queued" && (
        <span
          className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white/80"
          style={mono}
        >
          waiting
        </span>
      )}
      {isDone &&
        (job.duplicate ? (
          <span
            className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white"
            style={mono}
          >
            Already added
          </span>
        ) : (
          <CheckCircle
            size={18}
            weight="fill"
            className="absolute bottom-1 left-1 text-[#d4a553] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
          />
        ))}

      {isVideo && !isError && (
        <span
          className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1 py-0.5 text-[10px] tabular-nums text-white"
          style={mono}
        >
          {job.duration ? formatDuration(job.duration) : "video"}
        </span>
      )}

      {isError && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry ${job.file.name}`}
          className="absolute inset-0 flex items-center justify-center bg-red-600/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span
            className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600"
            style={mono}
          >
            Retry
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("Remove this upload?")) onRemove();
        }}
        aria-label={`Remove ${job.file.name}`}
        className="absolute right-0 top-0 z-10 flex h-11 w-11 items-start justify-end p-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a553]"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}
