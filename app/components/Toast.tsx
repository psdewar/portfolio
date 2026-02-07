interface ToastProps {
  message: string;
  exiting?: boolean;
}

export function Toast({ message, exiting = false }: ToastProps) {
  return (
    <div className="fixed top-20 left-0 right-0 z-[100] flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 bg-neutral-900 border border-[#d4a553]/30 px-5 py-3 rounded-lg shadow-2xl transition-all duration-500 ${
          exiting ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-[#d4a553] flex-shrink-0" />
        <span className="text-neutral-200 text-sm">{message}</span>
      </div>
    </div>
  );
}
