import { MusicNoteIcon } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
  return (
    <div className="h-full flex-auto flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <MusicNoteIcon
          size={48}
          weight="duotone"
          className="text-neutral-400 dark:text-neutral-500 animate-pulse"
        />
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
