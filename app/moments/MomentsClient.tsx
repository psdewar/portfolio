"use client";

import { useEffect, useRef, useState } from "react";
import { Images, ArrowRight } from "@phosphor-icons/react";
import FormInput from "../components/FormInput";
import MomentsGallery from "./MomentsGallery";
import SunScheme from "../components/SunScheme";
import UploadList from "./UploadList";
import UploadSurface from "./UploadSurface";
import { useMomentsUpload } from "./useMomentsUpload";
import type { GalleryItem } from "../api/shared/moments";

const parkinsans = { fontFamily: '"Parkinsans", sans-serif' } as const;
const mono = { fontFamily: '"Space Mono", monospace' } as const;
const epunda = { fontFamily: "var(--font-epunda)" } as const;
const gold = "linear-gradient(to right, #d4a553, #e0b860)";

export default function MomentsClient({
  fundSlug,
  items,
}: {
  fundSlug?: string;
  items: GalleryItem[];
}) {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const upload = useMomentsUpload(passcode);
  const { jobs, uploading, failedJobs, doneCount, handleFiles } = upload;
  const passcodeRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const prevJobCount = useRef(0);

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

  return (
    <main className="flex h-full flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <SunScheme />
      <MomentsGallery items={items} />

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
              className="w-full py-4 font-medium text-lg rounded-btn text-[#0a0a0a] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
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
                <UploadSurface bleed>
                  <UploadList
                    upload={upload}
                    cta={
                      !uploading && doneCount > 0 && failedJobs.length === 0 ? (
                        <div className="px-4 py-4 sm:px-6">
                          <a
                            href="/fund"
                            className="flex w-full items-center justify-center gap-2 rounded-btn py-4 text-lg font-medium text-[#0a0a0a] transition-all hover:scale-[1.01]"
                            style={{ background: gold }}
                          >
                            {fundName
                              ? `Help me cover my ${fundName} tour`
                              : "Help me cover my tour"}
                            <ArrowRight size={20} weight="bold" />
                          </a>
                        </div>
                      ) : null
                    }
                  />
                </UploadSurface>
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
