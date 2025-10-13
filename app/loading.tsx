export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 animate-bounce">
            <svg
              className="w-full h-full text-green-600 dark:text-green-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-green-600/20 dark:bg-green-500/20 animate-ping" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-gray-700 dark:text-gray-200">Loading</span>
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-green-600 dark:bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-green-600 dark:bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-green-600 dark:bg-green-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
