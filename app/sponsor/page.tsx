import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function SponsorPage() {
  return (
    <div className="space-y-3">
      <Link
        href="/sponsor/host"
        className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group block"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-base sm:text-lg">Host a new concert</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Book a date and location for a free concert in your community.
            </p>
          </div>
          <ArrowRightIcon
            size={20}
            className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0 ml-4 transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Link>

      <Link
        href="/sponsor/support"
        className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group block"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-base sm:text-lg">Support an upcoming concert</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Contribute to a concert already being planned near you.
            </p>
          </div>
          <ArrowRightIcon
            size={20}
            className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0 ml-4 transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Link>
    </div>
  );
}
