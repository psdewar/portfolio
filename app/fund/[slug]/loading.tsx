export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] px-4 pt-12 dark:bg-[#0d0e11] sm:px-10">
      <div className="mx-auto max-w-[780px] animate-pulse">
        <div className="h-12 w-3/4 rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="mt-5 flex gap-2">
          <div className="h-11 w-24 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-11 w-32 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-11 w-40 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mt-8 space-y-5">
          <div className="h-6 w-2/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-6 w-1/2 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-6 w-3/5 rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mt-8 h-[40svh] rounded-xl bg-black/10 dark:bg-white/10" />
      </div>
    </div>
  );
}
