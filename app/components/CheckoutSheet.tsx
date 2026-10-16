"use client";

const SHEET_STYLE = `
.co-wrap { position: fixed; inset: 0; z-index: var(--co-z); }
.co-card { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; background: #fff; padding: env(safe-area-inset-top, 0px) 0 calc(env(safe-area-inset-bottom, 0px) + 16px); animation: co-up 300ms cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-color-scheme: dark) { .co-card { background: #171717; } }
@keyframes co-up { from { transform: translateY(100%); } to { transform: none; } }
@keyframes co-fade { from { opacity: 0; } to { opacity: 1; } }
@media (min-width: 600px) {
  .co-wrap { display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.35); }
  .co-card { position: relative; inset: auto; width: 100%; max-width: 428px; max-height: 90vh; border-radius: 16px; padding: 24px 0; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: co-fade 200ms ease both; }
}
@media (prefers-reduced-motion: reduce) { .co-card { animation: co-fade 150ms ease both; } }
`;

export default function CheckoutSheet({
  sheet = false,
  zIndex,
  onClose,
  label,
  wrapClass,
  cardClass,
  children,
}: {
  sheet?: boolean;
  zIndex: number;
  onClose: () => void;
  label?: string;
  wrapClass: string;
  cardClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={sheet ? "co-wrap" : wrapClass}
      style={sheet ? ({ "--co-z": zIndex } as React.CSSProperties) : { zIndex }}
      onClick={sheet ? undefined : onClose}
    >
      {sheet && <style>{SHEET_STYLE}</style>}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={sheet ? "co-card" : cardClass}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
