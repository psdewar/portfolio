export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-medium text-gray-900 mb-2">Thank You!</h1>
          <p className="text-lg text-gray-600">
            Your contribution has been successfully processed.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-700">
            Your support helps make live performances possible. You'll receive an email confirmation
            shortly with the details of your contribution.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="/projects"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            Back to Project
          </a>
          <a
            href="/"
            className="block w-full bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-6 rounded-md border border-gray-300 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
