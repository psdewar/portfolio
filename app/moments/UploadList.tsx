import { X, CheckCircle } from "@phosphor-icons/react";
import type { FileJob } from "./useMomentsUpload";

const mono = { fontFamily: '"Space Mono", monospace' } as const;
const epunda = { fontFamily: "var(--font-epunda)" } as const;

type UploadState = {
  jobs: FileJob[];
  uploading: boolean;
  failedJobs: FileJob[];
  doneCount: number;
  subline: string;
  runJob: (job: FileJob) => Promise<void>;
  removeJob: (job: FileJob) => void;
  retryAllFailed: () => Promise<void>;
};

export default function UploadList({
  upload,
  bannerPad = "px-6",
  gridClass = "grid-cols-3 sm:grid-cols-4",
  cta,
}: {
  upload: UploadState;
  bannerPad?: string;
  gridClass?: string;
  cta?: React.ReactNode;
}) {
  const { jobs, uploading, failedJobs, doneCount, subline, runJob, removeJob, retryAllFailed } =
    upload;
  return (
    <>
      {(uploading || (doneCount > 0 && failedJobs.length === 0)) && (
        <Banner type="uploading" flat pad={bannerPad}>
          {uploading && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4a553] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d4a553]" />
            </span>
          )}
          <p className="flex-1 text-sm md:text-base font-medium tabular-nums" style={epunda}>
            {uploading ? (
              <>
                Keep this page open until complete.
                {subline && (
                  <span className="block text-xs font-normal text-white/60">{subline}</span>
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
      {cta}
      {failedJobs.length > 0 && (
        <Banner
          type="failed"
          flat
          pad={bannerPad}
          onClick={retryAllFailed}
          ariaLabel={`Retry ${failedJobs.length} failed uploads`}
        >
          <span className="min-w-0 text-sm font-normal">
            {failedJobs.length} failed{failedJobs[0].error ? `: ${failedJobs[0].error}` : ""}
            {doneCount > 0 ? ` · ${doneCount} done` : ""}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-normal uppercase tracking-wide text-red-600">
            Retry all
          </span>
        </Banner>
      )}
      <div className={`grid gap-px bg-black/10 dark:bg-white/10 ${gridClass}`}>
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
    </>
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
  pad = "px-6",
  onClick,
  ariaLabel,
  children,
}: {
  type: keyof typeof BANNER_STYLES;
  flat?: boolean;
  pad?: string;
  onClick?: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const layout = flat
    ? pad
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
    <div
      role="group"
      aria-label={job.file.name}
      className="tile-in relative aspect-square overflow-hidden bg-[#262b3f]"
    >
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
