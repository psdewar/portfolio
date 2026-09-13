"use client";

import { CheckSquareIcon, SquareIcon } from "@phosphor-icons/react";
import { SUPPORT_MENU, HONORARIUM_ITEM, HONORARIUM_DEFINITION } from "../lib/sponsor";

type Props = {
  checked: Set<string>;
  onToggle: (item: string) => void;
  locked?: string[];
  size?: number;
  className?: string;
};

function ItemLabel({ item }: { item: string }) {
  return (
    <span>
      {item}
      {item === HONORARIUM_ITEM && (
        <span className="block text-sm text-neutral-400 dark:text-neutral-500">
          {HONORARIUM_DEFINITION}
        </span>
      )}
    </span>
  );
}

export default function ContributionChecklist({
  checked,
  onToggle,
  locked = [],
  size = 20,
  className = "",
}: Props) {
  return (
    <div className={`sm:columns-2 gap-6 ${className}`}>
      {SUPPORT_MENU.map((group) => (
        <div key={group.category} className="break-inside-avoid mb-6 sm:mb-0">
          <h4 className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
            {group.category}
          </h4>
          <div className="space-y-2">
            {group.items.map((item) => {
              const isChecked = checked.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggle(item)}
                  className="w-full flex items-start gap-2 text-left text-neutral-700 dark:text-neutral-300"
                >
                  {isChecked ? (
                    <CheckSquareIcon
                      size={size}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-neutral-900 dark:text-white"
                    />
                  ) : (
                    <SquareIcon size={size} className="mt-0.5 shrink-0 text-neutral-400" />
                  )}
                  <ItemLabel item={item} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {locked.length > 0 && (
        <div className="break-inside-avoid mb-6 sm:mb-0">
          <h4 className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Private deal</h4>
          <div className="space-y-2">
            {locked.map((item) => (
              <div key={item} className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                <CheckSquareIcon
                  size={size}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-neutral-900 dark:text-white"
                />
                <ItemLabel item={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
