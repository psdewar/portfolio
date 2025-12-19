"use client";

import Link from "next/link";

const adminPages = [
  {
    href: "/admin/sync",
    title: "Timestamp Sync",
    description: "Sync timestamps and cache data",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Manage your site settings and run pre-deploy checks.
        </p>

        <div className="grid gap-4">
          {adminPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group"
            >
              <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {page.icon}
              </div>
              <div>
                <h2 className="font-semibold text-lg text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {page.title}
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">{page.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            ← Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}
