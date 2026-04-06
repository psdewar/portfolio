"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const adminPages = [
  { segment: "shows", title: "Shows", href: "/admin/shows" },
  { segment: "schedule", title: "Schedule", href: "/admin/schedule" },
  { segment: "printouts", title: "Printouts", href: "/admin/printouts" },
  { segment: "sync", title: "Sync", href: "/admin/sync" },
];

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "peyt2024";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const stored = sessionStorage.getItem("admin-auth");
    if (stored === "true") setIsAuthenticated(true);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dropdownOpen]);

  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const current = adminPages.find((p) => p.segment === segment);

  return (
    <div className="min-h-screen print:min-h-0 bg-white dark:bg-neutral-950">
      <div className="border-b border-neutral-200 dark:border-neutral-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Admin
            </span>
            {isAuthenticated && current && (
              <div className="relative flex items-center gap-3" ref={dropdownRef}>
                <span className="text-sm font-light text-neutral-300 dark:text-neutral-700 select-none">
                  /
                </span>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="text-sm font-semibold tracking-[0.15em] uppercase text-neutral-900 dark:text-white hover:text-[#d4a553] transition-colors"
                >
                  {current.title}
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl min-w-[160px] z-50">
                    {adminPages.map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        onClick={() => setDropdownOpen(false)}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          page.segment === segment
                            ? "text-[#d4a553]"
                            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {page.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {isAuthenticated && segment === "printouts" && (
            <span className="text-xs text-neutral-400 dark:text-neutral-600">
              Print with Chrome, set margins to Default
            </span>
          )}
          {isAuthenticated ? (
            <button
              onClick={() => {
                sessionStorage.removeItem("admin-auth");
                setIsAuthenticated(false);
                setPassword("");
              }}
              className="text-sm text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
            >
              Logout
            </button>
          ) : !isChecking ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (password === ADMIN_PASSWORD) {
                  sessionStorage.setItem("admin-auth", "true");
                  setIsAuthenticated(true);
                  setError("");
                } else {
                  setError("Incorrect password");
                  setPassword("");
                }
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={error || "Password"}
                className={`w-40 px-3 py-1.5 text-sm rounded-lg border bg-neutral-100 dark:bg-neutral-900/50 text-neutral-900 dark:text-white focus:outline-none transition-colors ${
                  error
                    ? "border-red-300 dark:border-red-800 placeholder-red-400/70"
                    : "border-neutral-300 dark:border-neutral-800 placeholder-neutral-400 dark:placeholder-neutral-600 focus:border-neutral-400 dark:focus:border-neutral-600"
                }`}
                autoFocus
              />
            </form>
          ) : null}
        </div>
      </div>

      {isAuthenticated && children}
    </div>
  );
}
