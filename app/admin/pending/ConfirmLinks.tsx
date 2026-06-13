"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SponsorForm from "../../components/SponsorForm";

export interface ConfirmLink {
  slug: string;
  path: string;
  label: string;
  host: {
    submittedAt: string;
    name: string;
    email: string;
    phone: string;
    venue: string;
    address: string;
    city: string;
    region: string;
    country: string;
    date: string;
    doorTime: string;
    items: string[];
  } | null;
}

export default function ConfirmLinks({ links }: { links: ConfirmLink[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [amending, setAmending] = useState<ConfirmLink | null>(null);

  const copy = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied((c) => (c === path ? null : c)), 1800);
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-1">
        Confirmation link ready
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Send this to the sponsor. The show stays hidden from{" "}
        <span className="font-mono">/rsvp</span> until they open it and confirm.
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
              {l.host && (
                <button
                  onClick={() => setAmending(l)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-[#d4a553] hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
                >
                  Amend
                </button>
              )}
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

      {amending?.host && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAmending(null)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-light tracking-wide text-neutral-900 dark:text-white">
                AMEND &middot; {amending.slug}
              </h4>
              <button
                onClick={() => setAmending(null)}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <SponsorForm
              showSlug={amending.slug}
              submittedAt={amending.host.submittedAt}
              venue={amending.host.venue}
              address={amending.host.address}
              city={amending.host.city}
              region={amending.host.region}
              country={amending.host.country}
              date={amending.host.date}
              doorTime={amending.host.doorTime}
              initialName={amending.host.name}
              initialPhone={amending.host.phone}
              initialEmail={amending.host.email}
              initialItems={amending.host.items}
              compact
              editMode
              pending
              onSuccess={() => {
                setAmending(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
