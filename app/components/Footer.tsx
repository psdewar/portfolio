"use client";

import Link from "next/link";
import { ArrowIcon } from "../ArrowIcon";
import { usePatronStatus } from "../hooks/usePatronStatus";

export function Footer() {
  const isPatron = usePatronStatus();

  if (!isPatron) return null;

  return (
    <footer className="fixed bottom-20 right-4 z-30">
      <div className="flex items-center gap-3 px-4 py-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <Link
          href="/hire"
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Hire
        </Link>
        <span className="text-gray-300 dark:text-gray-700">·</span>
        <Link
          href="https://lyrist.app"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
        >
          Lyrist
          <ArrowIcon />
        </Link>
        <span className="text-gray-300 dark:text-gray-700">·</span>
        <Link
          href="https://lyrist.app/records/peyt-spencer"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
        >
          Press Kit
          <ArrowIcon />
        </Link>
      </div>
    </footer>
  );
}
