export function ProgressBar({
  current,
  goal,
  stretch,
}: {
  current: number;
  goal: number;
  stretch?: { goalCents: number } | null;
}) {
  const pct = Math.round((current / Math.max(goal, 1)) * 100);
  const displayPct = Math.min(100, pct);
  const hitPrimary = current >= goal;

  return (
    <div className="w-full">
      <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-green-600 dark:bg-green-400"
          style={{ width: `${displayPct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400 tabular-nums">
          ${(goal / 100).toLocaleString()} goal · {pct}% raised
        </span>
        {hitPrimary && stretch && (
          <div className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full whitespace-nowrap">
            Stretch goal: ${(stretch.goalCents / 100).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
