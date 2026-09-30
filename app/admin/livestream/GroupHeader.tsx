import { groupHeaderClass, textGroup } from "./ui";

export default function GroupHeader({
  name,
  receiving,
  relaysTo,
}: {
  name: string;
  receiving: boolean;
  relaysTo: string[];
}) {
  return (
    <div className={groupHeaderClass}>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          receiving ? "bg-red-500" : "bg-neutral-300 dark:bg-neutral-600"
        }`}
      />
      <span className={`shrink-0 text-neutral-900 dark:text-white ${textGroup}`}>{name}</span>
      <span className="shrink-0">{receiving ? "Receiving" : "Offline"}</span>
      {relaysTo.length > 0 && (
        <span className="min-w-0 truncate">
          {receiving ? "Relays to" : "Will relay to"} {relaysTo.join(", ")}
        </span>
      )}
    </div>
  );
}
