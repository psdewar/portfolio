export default function ListenLoading() {
  return (
    <div className="w-full">
      {/* Skeleton grid matching the track layout */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900"
          >
            {/* Artist name - top left */}
            <div className="absolute top-3 left-3">
              <div className="h-3 bg-gray-300/60 dark:bg-gray-700/60 rounded w-20 animate-pulse" />
            </div>

            {/* Center visual element - mimics album art focal point */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gray-300/40 dark:bg-gray-700/40 animate-pulse" />
            </div>

            {/* Song title - bottom right */}
            <div className="absolute bottom-3 right-3 text-right">
              <div className="h-3 bg-gray-300/60 dark:bg-gray-700/60 rounded w-24 ml-auto animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
