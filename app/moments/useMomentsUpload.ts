import { useEffect, useRef, useState } from "react";
import { isNetworkError, networkFetch, NO_CONNECTION } from "../lib/network-error";
import { uploadFile, uploadOriginal, makePreview, type PreviewResult, type UploadMeta } from "./upload";

export type JobStatus = "queued" | "uploading" | "done" | "error";

export type FileJob = {
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

const SIM_TICK_MS = 100;
const RETRY_DELAYS_MS = [30_000, 120_000, 300_000];
const simDuration = (bytes: number) => Math.min(3000, Math.max(1500, 1500 + bytes / 2000));

function simulateUpload(
  size: number,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const total = simDuration(size);
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / total) * 100);
      onProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        resolve();
      }
    }, SIM_TICK_MS);
    signal.addEventListener("abort", () => {
      clearInterval(id);
      const err = new Error("Cancelled");
      err.name = "CancelledError";
      reject(err);
    });
  });
}

const failureMessage = (err: unknown) =>
  isNetworkError(err) ? NO_CONNECTION : err instanceof Error ? err.message : "Upload failed";

export function useMomentsUpload(
  passcode: string,
  onFirstDone?: () => void,
  { simulate = false }: { simulate?: boolean } = {},
) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const removedIds = useRef(new Set<string>());
  const jobsRef = useRef<FileJob[]>([]);
  jobsRef.current = jobs;
  const previewBlobs = useRef(new Map<string, Blob>());
  const pendingOriginals = useRef(new Map<string, { file: File; tries: number; busy: boolean; controller?: AbortController }>());
  const previewedIds = useRef(new Set<string>());
  const retryTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const passcodeRef = useRef(passcode);
  passcodeRef.current = passcode;

  function stopOriginal(id: string) {
    pendingOriginals.current.get(id)?.controller?.abort();
    pendingOriginals.current.delete(id);
    clearTimeout(retryTimers.current.get(id));
    retryTimers.current.delete(id);
  }

  function scheduleOriginal(id: string) {
    const entry = pendingOriginals.current.get(id);
    if (!entry) return;
    clearTimeout(retryTimers.current.get(id));
    retryTimers.current.set(
      id,
      setTimeout(() => attemptOriginal(id, true), RETRY_DELAYS_MS[entry.tries]),
    );
  }

  async function attemptOriginal(id: string, timed: boolean) {
    const entry = pendingOriginals.current.get(id);
    if (!entry || removedIds.current.has(id)) return;
    if (entry.busy || document.visibilityState === "hidden") {
      if (timed) scheduleOriginal(id);
      return;
    }
    entry.busy = true;
    if (timed) entry.tries++;
    entry.controller = new AbortController();
    try {
      const result = await uploadOriginal(
        entry.file,
        { passcode: passcodeRef.current },
        () => {},
        entry.controller.signal,
      );
      stopOriginal(id);
      updateJob(id, { status: "done", progress: 100, key: result.key });
    } catch (err) {
      entry.busy = false;
      if (!pendingOriginals.current.has(id) || (err instanceof Error && err.name === "CancelledError")) return;
      if (!timed) return;
      if (entry.tries >= RETRY_DELAYS_MS.length) {
        stopOriginal(id);
        updateJob(id, { status: "error", error: failureMessage(err) });
      } else {
        scheduleOriginal(id);
      }
    }
  }

  useEffect(() => {
    const retryAll = () => {
      for (const id of [...pendingOriginals.current.keys()]) attemptOriginal(id, false);
    };
    const stopAll = () => {
      for (const id of [...pendingOriginals.current.keys()]) stopOriginal(id);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") retryAll();
    };
    window.addEventListener("online", retryAll);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", stopAll);
    return () => {
      window.removeEventListener("online", retryAll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", stopAll);
      stopAll();
    };
  }, []);

  useEffect(
    () => () => {
      for (const j of jobsRef.current) if (j.thumb) URL.revokeObjectURL(j.thumb);
    },
    [],
  );

  const uploading = jobs.some((j) => j.status === "uploading" || j.status === "queued");
  const failedJobs = jobs.filter((j) => j.status === "error");
  const doneCount = jobs.filter((j) => j.status === "done").length;

  const measured = jobs.filter((j) => j.status !== "error");
  const totalBytes = measured.reduce((a, j) => a + j.file.size, 0);
  const uploadedBytes = measured.reduce(
    (a, j) => a + (j.status === "done" ? j.file.size : (j.progress / 100) * j.file.size),
    0,
  );
  const [deadline, setDeadline] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const rateRef = useRef<{ t: number; bytes: number; rate: number } | null>(null);
  const deadlineRef = useRef<{ at: number; rate: number } | null>(null);

  useEffect(() => {
    if (!uploading) {
      rateRef.current = null;
      deadlineRef.current = null;
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
      const at = now + ((totalBytes - uploadedBytes) / rate) * 1000;
      const held = deadlineRef.current;
      if (held && at > held.at && rate >= held.rate / 2) return;
      deadlineRef.current = { at, rate };
      setDeadline(at);
    }
  }, [uploading, uploadedBytes, totalBytes]);

  useEffect(() => {
    if (!uploading || deadline === null) return;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [uploading, deadline]);

  const nowMs = clock > 0 ? clock : Date.now();
  const remainingSecs = deadline !== null ? Math.round((deadline - nowMs) / 1000) : null;
  const subline =
    remainingSecs === null
      ? ""
      : remainingSecs < -2
        ? "Almost done"
        : remainingSecs < 60
          ? `${Math.max(1, remainingSecs)} second${Math.max(1, remainingSecs) === 1 ? "" : "s"} left`
          : `About ${Math.ceil(remainingSecs / 60)} min left`;

  useEffect(() => {
    if (!uploading || simulate) return;
    const nav = navigator as unknown as {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) return;
    let lock: { release: () => Promise<void> } | null = null;
    let active = true;
    const request = async () => {
      try {
        const next = await nav.wakeLock!.request("screen");
        if (!active) next.release().catch(() => {});
        else lock = next;
      } catch {
        lock = null;
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [uploading, simulate]);

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

  function updateJob(id: string, patch: Partial<FileJob>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  function grantThumb(job: FileJob, made: PreviewResult) {
    if (job.thumb || removedIds.current.has(job.id) || previewBlobs.current.has(job.id)) return;
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
      const onProgress = (pct: number) => {
        const rounded = Math.round(pct);
        if (rounded !== lastPct) {
          lastPct = rounded;
          updateJob(job.id, { progress: rounded });
        }
      };
      if (simulate) await simulateUpload(job.file.size, onProgress, controller.signal);
      const result = simulate
        ? { duplicate: false, key: undefined, originalPending: false }
        : previewedIds.current.has(job.id)
          ? await uploadOriginal(job.file, meta, onProgress, controller.signal)
          : await uploadFile(
              job.file,
              meta,
              onProgress,
              controller.signal,
              previewBlobs.current.get(job.id),
              (made) => grantThumb(job, made),
            );
      if (result.originalPending) {
        previewedIds.current.add(job.id);
        updateJob(job.id, { key: result.key });
        pendingOriginals.current.set(job.id, { file: job.file, tries: 0, busy: false });
        scheduleOriginal(job.id);
        return;
      }
      updateJob(job.id, {
        status: "done",
        progress: 100,
        duplicate: result.duplicate,
        key: result.key,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "CancelledError") return;
      updateJob(job.id, { status: "error", error: failureMessage(err) });
    } finally {
      controllers.current.delete(job.id);
    }
  }

  function removeJob(job: FileJob) {
    removedIds.current.add(job.id);
    controllers.current.get(job.id)?.abort();
    controllers.current.delete(job.id);
    previewBlobs.current.delete(job.id);
    stopOriginal(job.id);
    const previewed = previewedIds.current.delete(job.id);
    if (job.thumb) URL.revokeObjectURL(job.thumb);
    if ((job.status === "done" || previewed) && job.key && !job.duplicate) {
      networkFetch("/api/moments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, key: job.key }),
      }).catch(() => {});
    }
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
  }

  async function retryAllFailed() {
    for (const job of failedJobs) await runJob(job);
  }

  const onFirstDoneRef = useRef(onFirstDone);
  onFirstDoneRef.current = onFirstDone;
  const firedFirstDone = useRef(false);
  useEffect(() => {
    if (doneCount === 0 || firedFirstDone.current) return;
    firedFirstDone.current = true;
    onFirstDoneRef.current?.();
  }, [doneCount]);

  return {
    jobs,
    uploading,
    failedJobs,
    doneCount,
    subline,
    handleFiles,
    runJob,
    removeJob,
    retryAllFailed,
  };
}
