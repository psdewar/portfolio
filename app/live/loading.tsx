export default function LiveLoading() {
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden animate-pulse">
      {/* Desktop Layout */}
      <div className="hidden lg:flex fixed inset-6 items-center justify-center">
        <div className="flex h-full max-h-[min(100%,800px)]">
          {/* Vertical Video */}
          <div className="relative h-full aspect-[9/16] bg-neutral-900 rounded-l-2xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
            </div>
            {/* Top bar skeleton */}
            <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-neutral-800 rounded-full" />
                <div className="w-24 h-4 bg-neutral-800 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="w-12 h-5 bg-neutral-800 rounded-full" />
                <div className="w-10 h-5 bg-neutral-800 rounded-full" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 h-full bg-neutral-900 rounded-r-2xl flex flex-col overflow-hidden">
            {/* Tip section */}
            <div className="p-4 border-b border-neutral-800">
              <div className="w-32 h-5 bg-neutral-800 rounded mb-3" />
              <div className="w-full h-3 bg-neutral-800 rounded mb-4" />
              <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 h-8 bg-neutral-800 rounded" />
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-8 bg-neutral-800 rounded" />
                <div className="w-14 h-8 bg-neutral-800 rounded" />
              </div>
            </div>

            {/* Chat section */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 border-b border-neutral-800">
                <div className="w-20 h-4 bg-neutral-800 rounded" />
              </div>
              <div className="flex-1 p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-7 h-7 bg-neutral-800 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="w-16 h-3 bg-neutral-800 rounded" />
                      <div className="w-full h-3 bg-neutral-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notify section */}
            <div className="p-4 border-t border-neutral-800">
              <div className="w-24 h-4 bg-neutral-800 rounded mb-3" />
              <div className="h-9 bg-neutral-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden fixed inset-0 bg-neutral-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
        </div>
        {/* Top bar skeleton */}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-800 rounded-full" />
            <div className="w-24 h-4 bg-neutral-800 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-12 h-5 bg-neutral-800 rounded-full" />
            <div className="w-10 h-5 bg-neutral-800 rounded-full" />
          </div>
        </div>
        {/* Bottom buttons skeleton */}
        <div className="absolute bottom-0 inset-x-0 p-4 flex justify-center gap-3">
          <div className="w-20 h-9 bg-neutral-800 rounded-full" />
          <div className="w-24 h-9 bg-neutral-800 rounded-full" />
        </div>
      </div>
    </div>
  );
}
