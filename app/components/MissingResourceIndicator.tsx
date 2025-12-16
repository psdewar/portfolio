"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface MissingItem {
  item: string;
  type: "stripe-product" | "placeholder-single" | "missing-audio";
  location: string;
}

// Known placeholder productIds that need real Stripe products
const PLACEHOLDER_PRODUCT_IDS = ["prod_2025_download_bundle", "prod_everything_bundle"];

// Placeholder singles that need real audio/artwork
// Add single names here when you have upcoming releases, e.g. ["new-single-2025"]
const PLACEHOLDER_SINGLES: string[] = [];

// Example: const PLACEHOLDER_SINGLES = ["${single name}", "another-single"];
// This will remind you to add audio files and artwork for these singles

export function MissingResourceIndicator() {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only run on localhost
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    setIsLocalhost(isLocal);

    if (!isLocal) return;

    const checkMissing = () => {
      const missing: MissingItem[] = [];

      // Check for placeholder Stripe products (always add these on shop page)
      if (pathname === "/shop") {
        PLACEHOLDER_PRODUCT_IDS.forEach((productId) => {
          missing.push({
            item: productId,
            type: "stripe-product",
            location: "/shop",
          });
        });
      }

      // Check for placeholder singles on listen page
      if (pathname === "/listen") {
        PLACEHOLDER_SINGLES.forEach((single) => {
          missing.push({
            item: single,
            type: "placeholder-single",
            location: "/listen",
          });
        });
      }

      setMissingItems(missing);
    };

    checkMissing();
  }, [pathname]);

  if (!isLocalhost || missingItems.length === 0) return null;

  const getTypeColor = (type: MissingItem["type"]) => {
    switch (type) {
      case "stripe-product":
        return "text-purple-400";
      case "placeholder-single":
        return "text-yellow-400";
      case "missing-audio":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getTypeLabel = (type: MissingItem["type"]) => {
    switch (type) {
      case "stripe-product":
        return "Stripe Product";
      case "placeholder-single":
        return "Placeholder Single";
      case "missing-audio":
        return "Missing Audio";
      default:
        return type;
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9999]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
        title={`${missingItems.length} item(s) need attention`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {missingItems.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 max-h-96 overflow-auto bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-purple-400">Dev Checklist</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          <ul className="p-2 space-y-2">
            {missingItems.map((item, i) => (
              <li key={i} className="text-sm p-2 bg-gray-800 rounded">
                <span className={`text-xs uppercase ${getTypeColor(item.type)} block`}>
                  {getTypeLabel(item.type)}
                </span>
                <span className="text-white break-all">{item.item}</span>
                <span className="text-gray-500 text-xs block">{item.location}</span>
              </li>
            ))}
          </ul>
          <div className="p-2 border-t border-gray-700 text-xs text-gray-500">
            Only visible on localhost
          </div>
        </div>
      )}
    </div>
  );
}
