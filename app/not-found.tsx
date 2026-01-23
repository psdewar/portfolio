import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-bebas text-[20vw] sm:text-[15vw] leading-none text-neutral-800 dark:text-neutral-200 mb-1">
          404
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">This page doesn't exist.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
