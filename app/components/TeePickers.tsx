"use client";

export interface TeeColor {
  id: string;
  name: string;
  hex: string;
}

export const TEE_COLORS = [
  { id: "navy", name: "Navy", hex: "#262b3f" },
  { id: "forest", name: "Forest", hex: "#2c413a" },
  { id: "maroon", name: "Maroon", hex: "#5d2c30" },
] as const;

export const TEE_SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const TEE_DEFAULT_SIZE = "M";

const NAME_TONES = {
  neutral: {
    on: "text-stone-900 dark:text-white",
    off: "text-stone-400 dark:text-neutral-500",
  },
  ink: { on: "text-[#262b3f]", off: "text-[#262b3f]/50" },
};

function ColorName({
  name,
  active,
  tone,
  className = "",
}: {
  name: string;
  active: boolean;
  tone: keyof typeof NAME_TONES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`text-[11px] uppercase leading-none tracking-[0.18em] transition-colors lgtall:text-[13px] ${
        active ? NAME_TONES[tone].on : NAME_TONES[tone].off
      } ${className}`}
    >
      {name}
    </span>
  );
}

interface ColorProps {
  colors: readonly TeeColor[];
  value: string;
  accent: string;
  tone?: keyof typeof NAME_TONES;
  onChange: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ColorSwatches({ colors, value, accent, tone = "neutral", onChange, className, style }: ColorProps) {
  return (
    <div className={className} style={style}>
      <div className="flex gap-5 lgtall:gap-6">
        {colors.map((c) => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={active}
              aria-label={c.name}
              className="group relative mb-6 lg:mb-[1.2rem] lgtall:mb-[1.3rem]"
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
              <ColorName
                name={c.name}
                active={active}
                tone={tone}
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap"
              />
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
      <div className="flex gap-2.5 sm:gap-3 lgtall:gap-3.5">
        {sizes.map((s) => {
          const active = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              style={active ? { backgroundColor: activeHex, borderColor: activeHex } : undefined}
              className={`tee-size flex h-12 min-w-0 flex-1 items-center justify-center rounded-btn border text-base font-semibold transition-all lgtall:h-16 lgtall:text-xl ${
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
