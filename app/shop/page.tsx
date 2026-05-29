import type { Metadata } from "next";
import { ShopContent } from "../components/ShopContent";

export const metadata: Metadata = {
  title: "Pre-Order: All I Need Is Patience Tee",
  description:
    "Pre-order the All I Need Is Patience tee in navy, forest, or maroon. First pressing, made to order, shipped within the US.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Pre-Order: All I Need Is Patience Tee",
    description:
      "Pre-order the All I Need Is Patience tee in navy, forest, or maroon. First pressing, made to order.",
    images: ["/images/merch/patience-navy.jpeg"],
  },
};

export default function Page() {
  return <ShopContent />;
}
