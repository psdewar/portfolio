export function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(100, Math.round((current / Math.max(goal, 1)) * 100));
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-green-600 dark:bg-green-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-gray-900 dark:text-white">${(current / 100).toLocaleString()}</span>
        <span className="text-gray-500 dark:text-gray-400">
          ${(goal / 100).toLocaleString()} goal · {pct}%
        </span>
      </div>
    </div>
  );
}
