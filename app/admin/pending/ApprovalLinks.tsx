"use client";

import { useState } from "react";
import Link from "next/link";

export default function ApprovalLinks({
  links,
}: {
  links: { slug: string; path: string; label: string }[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied((c) => (c === path ? null : c)), 1800);
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-1">
        Approval link ready
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Send this to the sponsor. The show stays hidden from{" "}
        <span className="font-mono">/rsvp</span> until they open it and approve.
      </p>

      <div className="space-y-3">
        {links.map((l) => (
          <div
            key={l.slug}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
          >
            <p className="font-medium text-neutral-900 dark:text-white">{l.label}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 break-all mt-1 font-mono">
              {l.path}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => copy(l.path)}
                className="px-3 py-1.5 text-xs rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold hover:opacity-90 transition-opacity"
              >
                {copied === l.path ? "Copied" : "Copy link"}
              </button>
              <Link
                href={l.path}
                target="_blank"
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
              >
                Preview
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/admin/pending"
        className="inline-block mt-6 text-sm text-neutral-500 hover:text-[#d4a553] transition-colors"
      >
        + Create another
      </Link>
    </div>
  );
}
