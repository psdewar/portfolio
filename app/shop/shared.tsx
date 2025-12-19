// Shared shop components and data

export const TRACKLIST = [
  { name: "Right One", duration: "2:15" },
  { name: "Safe", duration: "2:17" },
  { name: "Patience", duration: "2:21" },
  { name: "Pretty Girls Freestyle", duration: "0:48" },
  { name: "Chains & Whips Freestyle", duration: "0:56" },
  { name: "Mula Freestyle", duration: "1:01" },
];

export const BookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

export const ShirtIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.5 3L3 6v2l3 1.5V21h12V9.5L21 8V6l-3.5-3h-4L12 5l-1.5-2h-4z"
    />
  </svg>
);

export const MusicNoteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
    />
  </svg>
);

// Track list component with border-left style (used in normal shop)
export function TrackListBordered({ colorClass = "border-green-500" }: { colorClass?: string }) {
  return (
    <div className="space-y-1">
      {TRACKLIST.map((track) => (
        <div
          key={track.name}
          className={`py-2.5 pl-4 pr-3 border-l-2 ${colorClass}/60 hover:${colorClass} hover:bg-green-500/5 transition-all flex items-center justify-between`}
        >
          <span className="text-gray-900 dark:text-white font-medium text-lg">{track.name}</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">
            {track.duration}
          </span>
        </div>
      ))}
    </div>
  );
}

// Simple track list (used in quick shop) - matches normal shop border-left style
export function TrackListSimple({
  borderClass = "border-white/60",
  hoverBorderClass = "hover:border-white",
  hoverBgClass = "hover:bg-white/5",
}: {
  borderClass?: string;
  hoverBorderClass?: string;
  hoverBgClass?: string;
}) {
  return (
    <div className="space-y-1">
      {TRACKLIST.map((track) => (
        <div
          key={track.name}
          className={`py-2.5 pl-4 pr-3 border-l-2 ${borderClass} ${hoverBorderClass} ${hoverBgClass} transition-all flex items-center justify-between`}
        >
          <span className="text-white font-medium text-base lg:text-lg">{track.name}</span>
          <span className="text-white/60 text-sm font-mono">{track.duration}</span>
        </div>
      ))}
    </div>
  );
}
