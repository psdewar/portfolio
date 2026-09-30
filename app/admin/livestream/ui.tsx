import { useId, type ReactNode } from "react";


export const textBody = "text-base [@media(min-width:1600px)_and_(min-height:900px)]:text-lg";
export const textHelper = "text-sm [@media(min-width:1600px)_and_(min-height:900px)]:text-base";
export const textLabel = "text-[13px] [@media(min-width:1600px)_and_(min-height:900px)]:text-sm";
export const textButton = "text-base [@media(min-width:1600px)_and_(min-height:900px)]:text-lg";
export const textTitle = "text-lg [@media(min-width:1600px)_and_(min-height:900px)]:text-xl";
export const textGroup = "text-lg font-semibold [@media(min-width:1600px)_and_(min-height:900px)]:text-xl";

export const padX = "px-4 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:px-6 [@media(min-width:1600px)_and_(min-height:900px)]:px-8";
export const padY = "py-5 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:py-4 [@media(min-width:1600px)_and_(min-height:900px)]:py-6";
export const stackGap = "space-y-4 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:space-y-3 [@media(min-width:1600px)_and_(min-height:900px)]:space-y-5";

export const inputClass =
  "w-full min-h-11 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 px-2 py-1.5 [@media(min-width:1600px)_and_(min-height:900px)]:px-3 [@media(min-width:1600px)_and_(min-height:900px)]:py-2 " + textBody + " rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600";
export const labelClass =
  "block " + textLabel + " font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1";
export const sectionLabel = textLabel + " font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400";
export const primaryButtonClass =
  "min-h-11 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 px-4 py-2 [@media(min-width:1600px)_and_(min-height:900px)]:px-5 [@media(min-width:1600px)_and_(min-height:900px)]:py-2.5 " + textButton + " bg-[#d4a553] hover:bg-[#c99a48] disabled:opacity-50 disabled:hover:bg-[#d4a553] text-black font-medium rounded-lg transition-colors";
export const secondaryButtonClass =
  "inline-flex items-center justify-center min-h-11 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 px-4 py-2 [@media(min-width:1600px)_and_(min-height:900px)]:px-5 [@media(min-width:1600px)_and_(min-height:900px)]:py-2.5 " + textButton + " border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 font-medium rounded-lg transition-colors text-center";
export const checkRowClass = "flex items-center gap-3 min-h-11 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 cursor-pointer";
export const checkboxClass = "h-5 w-5 shrink-0 accent-[#d4a553] [@media(min-width:1600px)_and_(min-height:900px)]:h-6 [@media(min-width:1600px)_and_(min-height:900px)]:w-6";
export const helperClass = textHelper + " text-neutral-500 dark:text-neutral-400";
export const columnsClass =
  "[@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-1 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 ";

export const liveGroupClass =
  "min-w-0 min-h-0 flex flex-col [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-[9]";
export const practiceGroupClass =
  "min-w-0 min-h-0 flex flex-col bg-neutral-50 dark:bg-neutral-900/50 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-[4]";
export const groupBodyClass =
  "[@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-1 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0 ";
export const leadColumnClass =
  "min-w-0 min-h-0 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-[5] [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:overflow-y-auto";
export const trailColumnClass =
  "min-w-0 min-h-0 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-[4] [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:overflow-y-auto";
export const groupHeaderClass =
  "flex min-w-0 shrink-0 items-center gap-2.5 px-4 py-3 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:px-6 [@media(min-width:1600px)_and_(min-height:900px)]:px-8 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:py-0 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:h-12 [@media(min-width:1600px)_and_(min-height:900px)]:h-14 " + textBody + " text-neutral-600 dark:text-neutral-400";
export const defaultsRowClass =
  "shrink-0 flex flex-col gap-1 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-row [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex-wrap [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:items-center [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:gap-x-8 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:px-6 [@media(min-width:1600px)_and_(min-height:900px)]:px-8 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:py-2 [@media(min-width:1600px)_and_(min-height:900px)]:py-3 ";
export const defaultsChecksClass = "grid grid-cols-1 min-[420px]:grid-cols-3 gap-x-6 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:flex [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:gap-x-8";
export const brandRowClass = "flex items-center gap-2.5";
export const destRowClass = "flex items-center gap-3 min-h-11 [@media(orientation:landscape)_and_(min-width:1280px)_and_(min-height:500px)]:min-h-0";
export const audienceSlotClass = "w-28 shrink-0 [@media(min-width:1600px)_and_(min-height:900px)]:w-32";
export const brandIconClass = "h-7 w-7 shrink-0 [@media(min-width:1600px)_and_(min-height:900px)]:h-8 [@media(min-width:1600px)_and_(min-height:900px)]:w-8";

export type Message = { type: "success" | "error"; text: string };

export async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function YouTubeMark() {
  return (
    <svg viewBox="0 0 28 20" className={brandIconClass} role="img" aria-label="YouTube">
      <path
        fill="#FF0000"
        d="M27.4 3.12A3.5 3.5 0 0 0 24.93.64C22.75 0 14 0 14 0S5.25 0 3.07.64A3.5 3.5 0 0 0 .6 3.12C0 5.31 0 10 0 10s0 4.69.6 6.88a3.5 3.5 0 0 0 2.47 2.48C5.25 20 14 20 14 20s8.75 0 10.93-.64a3.5 3.5 0 0 0 2.47-2.48C28 14.69 28 10 28 10s0-4.69-.6-6.88Z"
      />
      <path fill="#FFFFFF" d="M11.2 14.29V5.71L18.5 10Z" />
    </svg>
  );
}

export function InstagramMark() {
  const id = useId();
  const gradient = `ig-${id}`;
  return (
    <svg viewBox="0 0 24 24" className={brandIconClass} role="img" aria-label="Instagram">
      <defs>
        <radialGradient id={gradient} cx="6.5" cy="25" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFDC80" />
          <stop offset="0.1" stopColor="#FCAF45" />
          <stop offset="0.25" stopColor="#F77737" />
          <stop offset="0.4" stopColor="#F56040" />
          <stop offset="0.5" stopColor="#FD1D1D" />
          <stop offset="0.62" stopColor="#E1306C" />
          <stop offset="0.75" stopColor="#C13584" />
          <stop offset="0.9" stopColor="#833AB4" />
          <stop offset="1" stopColor="#5851DB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradient})`} />
      <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="16.3" cy="7.7" r="1" fill="#FFFFFF" />
    </svg>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={`${padX} ${padY} ${stackGap}`}>
      {title && <h2 className={`${textTitle} font-semibold text-neutral-900 dark:text-white`}>{title}</h2>}
      {children}
    </section>
  );
}

export function Notice({ message }: { message: Message }) {
  return (
    <div
      className={`p-3 rounded-lg ${textBody} ${
        message.type === "success"
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
      }`}
    >
      {message.text}
    </div>
  );
}
