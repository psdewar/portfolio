"use client";

interface SuccessModalProps {
  show: boolean;
  onClose: () => void;
  amountCents?: number | null;
  sessionId?: string | null;
}

export function SuccessModal({ show, onClose, amountCents, sessionId }: SuccessModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 p-6 animate-in fade-in zoom-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-medium text-neutral-900 dark:text-white">Thank you! 🎉</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition"
          >
            ✕
          </button>
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 mb-4 leading-relaxed">
          Your contribution has been received.{" "}
          {amountCents ? `($${(amountCents / 100).toFixed(2)})` : ""}
        </p>
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <span>✉️</span>
            <span>A personal thank-you note will be included with your order.</span>
          </p>
        </div>
        {sessionId && (
          <p className="text-xs text-neutral-500 mb-4 break-all">
            Receipt ref: <span className="font-mono">{sessionId}</span>
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <a
            href="https://peytspencer.com"
            className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
          >
            Explore peytspencer.com
          </a>
        </div>
      </div>
    </div>
  );
}
