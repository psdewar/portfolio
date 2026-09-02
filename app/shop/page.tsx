import type { Metadata } from "next";
import { ShopTabs, type ShopTab } from "../components/ShopTabs";

const DESCRIPTION =
  "The All I Need Is Patience tee in navy, forest, or maroon, and Exhibit PSD, the 2015 design that used to only sell at shows.";

export const metadata: Metadata = {
  title: "Shop: Patience & Exhibit PSD Tees",
  description: DESCRIPTION,
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop: Patience & Exhibit PSD Tees",
    description: DESCRIPTION,
    images: ["/images/merch/patience-navy.jpeg"],
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; color?: string }>;
}) {
  const { tab, color } = await searchParams;
  const initialTab: ShopTab = tab === "exhibit" ? "exhibit" : "patience";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-3 pb-8 sm:px-6 lg:px-8 lg:pt-8">
      <ShopTabs initialTab={initialTab} initialColor={color} />
    </div>
  );
}
