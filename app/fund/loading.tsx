export default function FundLoading() {
  return (
    <div className="lg:flex lg:justify-center mb-32 pt-8">
      <div className="max-w-2xl px-4 w-full">
        {/* Skeleton for FundingCard - matches actual card structure */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 min-h-[600px] animate-pulse">
          {/* Progress bar skeleton */}
          <div className="mb-6">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
          </div>

          {/* Stats row: amount raised + backers */}
          <div className="mb-6 grid grid-cols-3 items-start">
            <div className="col-span-2">
              <div className="text-3xl lg:text-4xl font-semibold mb-1 invisible">$8,888</div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
            </div>
            <div className="text-right col-span-1">
              <div className="text-3xl lg:text-4xl font-semibold mb-1 invisible">88</div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto" />
            </div>
          </div>

          {/* Contribute title skeleton */}
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3" />

          {/* Payment options grid (2x2) */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>

          {/* Custom amount input + contribute button */}
          <div className="flex gap-3 items-stretch mb-2">
            <div className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="w-28 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>

          {/* Helper text row */}
          <div className="flex justify-between mb-6">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>

          {/* Details paragraph skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
