"use client";

import { useEffect, useRef, useState } from "react";
import FormInput from "../components/FormInput";
import { uploadFile, type UploadMeta } from "./upload";

type JobStatus = "queued" | "uploading" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  progress: number;
  status: JobStatus;
  error?: string;
};

const parkinsans = { fontFamily: '"Parkinsans", sans-serif' } as const;
const mono = { fontFamily: '"Space Mono", monospace' } as const;
const gold = "linear-gradient(to right, #d4a553, #e8c474)";

export default function MomentsClient() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [jobs, setJobs] = useState<FileJob[]>([]);
  const passcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unlocked) passcodeRef.current?.focus();
  }, [unlocked]);

  const anySucceeded = jobs.some((j) => j.status === "done");
  const uploading = jobs.some((j) => j.status === "uploading" || j.status === "queued");

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

    const newJobs: FileJob[] = Array.from(fileList).map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      progress: 0,
      status: "queued",
    }));
    setJobs((prev) => [...prev, ...newJobs]);

    const meta: UploadMeta = { passcode };
    for (const job of newJobs) {
      updateJob(job.id, { status: "uploading" });
      try {
        await uploadFile(job.file, meta, (pct) => updateJob(job.id, { progress: Math.round(pct) }));
        updateJob(job.id, { status: "done", progress: 100 });
      } catch (err) {
        updateJob(job.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col items-center px-6 py-10 md:py-16">
      <div className="w-full max-w-xl space-y-8">
        <header className="space-y-3">
          <h1
            className="text-4xl md:text-5xl font-extrabold uppercase leading-tight"
            style={parkinsans}
          >
            Send me your favorite moments from the concert
          </h1>
          <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-300">
            Thanks for attending From The Ground Up: My Path of Growth and the Principles that
            Connect Us
          </p>
        </header>

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
            <div className="space-y-2">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Pick from your camera roll or gallery. Anything forwarded through Messages,
                WhatsApp, or Instagram gets compressed and loses quality.
              </p>
              <DropZone onFiles={handleFiles} disabled={uploading} />
            </div>

            {jobs.length > 0 && (
              <div className="space-y-3">
                {anySucceeded && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300" aria-live="polite">
                    Got it. Drop another if you have one.
                  </p>
                )}
                <ul className="space-y-2">
                  {jobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
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
      className={`rounded-xl border-2 border-dashed p-10 md:p-12 text-center transition-colors ${
        disabled
          ? "border-neutral-200 dark:border-neutral-800 cursor-not-allowed"
          : dragActive
            ? "border-[#d4a553] bg-black/5 dark:bg-white/5 cursor-pointer"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer"
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
      <p className="text-lg" style={parkinsans}>
        Drop your highest-quality photos and videos here
      </p>
    </div>
  );
}

function JobRow({ job }: { job: FileJob }) {
  const statusText =
    job.status === "done"
      ? "Done"
      : job.status === "error"
        ? job.error || "Failed"
        : job.status === "queued"
          ? "Waiting"
          : `${job.progress}%`;
  const isError = job.status === "error";

  return (
    <li className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-white/5">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm">{job.file.name}</p>
        <div className="mt-2 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${job.status === "done" ? 100 : job.progress}%`,
              background: isError ? "#ef4444" : gold,
            }}
          />
        </div>
      </div>
      <span
        className={`text-xs tabular-nums min-w-[3rem] text-right ${
          isError ? "text-red-500 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"
        }`}
        style={mono}
      >
        {statusText}
      </span>
    </li>
  );
}
