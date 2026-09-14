"use client";

import { useState } from "react";
import { CaretDownIcon, CheckSquareIcon, SquareIcon } from "@phosphor-icons/react";
import {
  CORE_ITEMS,
  COVER_ITEMS,
  SPECIAL_ITEMS,
  HONORARIUM_ITEM,
  HONORARIUM_DEFINITION,
} from "../lib/sponsor";

type Props = {
  checked: Set<string>;
  onToggle: (item: string) => void;
  locked?: string[];
  special?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
};

function ItemLabel({ item, compact }: { item: string; compact: boolean }) {
  return (
    <span>
      {item}
      {item === HONORARIUM_ITEM && (
        <span
          className={`block ${compact ? "text-xs" : "text-sm"} text-neutral-400 dark:text-neutral-500`}
        >
          {HONORARIUM_DEFINITION}
        </span>
      )}
    </span>
  );
}

function CheckRow({
  item,
  isChecked,
  onToggle,
  size,
  compact,
  readOnly,
}: {
  item: string;
  isChecked: boolean;
  onToggle: (item: string) => void;
  size: number;
  compact: boolean;
  readOnly: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      onClick={() => onToggle(item)}
      disabled={readOnly}
      className={`w-full flex items-start gap-2 ${compact ? "py-1" : "py-1.5 lg:py-1"} text-left ${compact ? "text-sm" : "text-base"} text-neutral-700 dark:text-neutral-300${readOnly ? " opacity-75 cursor-default" : ""}`}
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
      <ItemLabel item={item} compact={compact} />
    </button>
  );
}

export default function ContributionChecklist({
  checked,
  onToggle,
  locked = [],
  special = false,
  readOnly = false,
  compact = false,
  className = "",
}: Props) {
  const size = compact ? 16 : 20;
  const rowPadding = compact ? "py-1" : "py-1.5 lg:py-1";
  const [coverOpen] = useState(() =>
    [...COVER_ITEMS, ...(special ? SPECIAL_ITEMS : [])].some((item) => checked.has(item)),
  );

  return (
    <div className={className}>
      {CORE_ITEMS.map((item) => (
        <CheckRow
          key={item}
          item={item}
          isChecked={checked.has(item)}
          onToggle={onToggle}
          size={size}
          compact={compact}
          readOnly={readOnly}
        />
      ))}

      <details open={coverOpen} className="group">
        <summary
          className={`flex cursor-pointer select-none items-start gap-2 list-none ${compact ? "pt-1.5 pb-1" : "pt-2.5 pb-1.5 lg:pt-2 lg:pb-1"} text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white`}
        >
          <CaretDownIcon size={size} className="mt-0.5 shrink-0 transition-transform group-open:rotate-180" />
          You can also cover
        </summary>
        {COVER_ITEMS.map((item) => (
          <CheckRow
            key={item}
            item={item}
            isChecked={checked.has(item)}
            onToggle={onToggle}
            size={size}
            compact={compact}
            readOnly={readOnly}
          />
        ))}
        {special &&
          SPECIAL_ITEMS.map((item) => (
            <CheckRow
              key={item}
              item={item}
              isChecked={checked.has(item)}
              onToggle={onToggle}
              size={size}
              compact={compact}
              readOnly={readOnly}
            />
          ))}
      </details>

      {locked.map((item) => (
        <div
          key={item}
          className={`flex items-start gap-2 ${rowPadding} text-neutral-700 dark:text-neutral-300`}
        >
          <CheckSquareIcon
            size={size}
            weight="fill"
            className="mt-0.5 shrink-0 text-neutral-900 dark:text-white"
          />
          <ItemLabel item={item} compact={compact} />
        </div>
      ))}
    </div>
  );
}
