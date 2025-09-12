import Link from "next/link";
import { ArrowIcon } from "./ArrowIcon";

export function PageLink({
  slug,
  name,
  newTab,
  icon,
}: {
  slug: string;
  name: string;
  newTab?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group">
      <Link
        href={slug}
        target={newTab ? "_blank" : "_self"}
        className={`flex w-full items-center ${
          icon ? "whitespace-pre" : "justify-between"
        } rounded border border-neutral-200 bg-neutral-50 px-3 py-4 dark:border-neutral-700 dark:bg-neutral-800`}
      >
        {icon}
        <div className="flex flex-col">
          <p className="font-medium text-neutral-900 dark:text-neutral-100 overflow-hidden overflow-ellipsis">
            {icon && "  "}
            {name}
          </p>
        </div>
        <div className="transform text-neutral-700 transition-transform duration-300 group-hover:-rotate-12 dark:text-neutral-300 ml-auto">
          <ArrowIcon />
        </div>
      </Link>
    </div>
  );
}
