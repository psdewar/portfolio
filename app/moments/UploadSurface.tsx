export default function UploadSurface({
  bleed,
  className = "",
  children,
}: {
  bleed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const edge = bleed ? "mx-[calc(50%-50vw)] w-screen sm:mx-0 sm:w-auto sm:rounded-2xl sm:border" : "";
  return (
    <div
      className={`ups-surface shrink-0 overflow-hidden border-y border-[color:var(--ups-line)] divide-y divide-[color:var(--ups-line)] [--ups-line:rgba(0,0,0,0.1)] dark:[--ups-line:rgba(255,255,255,0.1)] ${edge} ${className}`}
    >
      {children}
    </div>
  );
}
