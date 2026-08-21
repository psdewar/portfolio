"use client";

export interface TeeColor {
  id: string;
  name: string;
  hex: string;
}

const HEADING = "font-bebas text-2xl leading-none text-stone-900 dark:text-white sm:text-3xl lgtall:text-4xl";

interface ColorProps {
  colors: readonly TeeColor[];
  value: string;
  accent: string;
  onChange: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ColorSwatches({ colors, value, accent, onChange, className, style }: ColorProps) {
  return (
    <div className={className} style={style}>
      <h2 className={HEADING}>Color</h2>
      <div className="mt-3 flex gap-4 lgtall:mt-4 lgtall:gap-5">
        {colors.map((c) => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={active}
              className="group flex flex-col items-center gap-2"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full lgtall:h-14 lgtall:w-14 ring-1 ring-inset ring-black/10 transition-transform duration-200 group-hover:scale-105 dark:ring-white/15"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: active ? `0 0 0 2px ${accent}, 0 0 0 5px ${accent}33` : "none",
                }}
              >
                {active && (
                  <svg viewBox="0 0 20 20" className="h-5 w-5 lgtall:h-6 lgtall:w-6" fill="none" aria-hidden="true">
                    <path
                      d="M4 10.5L8 14.5L16 6"
                      stroke={accent}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span
                className={`text-[11px] uppercase tracking-[0.18em] transition-colors lgtall:text-[13px] ${
                  active ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-neutral-500"
                }`}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SizeProps {
  sizes: readonly string[];
  value: string;
  activeHex: string;
  activeTextClass?: string;
  onChange: (size: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SizeGrid({
  sizes,
  value,
  activeHex,
  activeTextClass = "text-white",
  onChange,
  className,
  style,
}: SizeProps) {
  return (
    <div className={className} style={style}>
      <h2 className={HEADING}>Size</h2>
      <div className="mt-3 flex gap-2.5 sm:gap-3 lgtall:mt-4 lgtall:gap-3.5">
        {sizes.map((s) => {
          const active = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              style={active ? { backgroundColor: activeHex, borderColor: activeHex } : undefined}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl border text-base font-semibold transition-all lgtall:h-16 lgtall:text-xl ${
                active
                  ? activeTextClass
                  : "border-stone-300 text-stone-700 hover:border-stone-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
