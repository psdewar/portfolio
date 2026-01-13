import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "T-shirts and music downloads. The full catalog in one bundle.",
  openGraph: {
    title: "Shop Peyt Spencer | Merch & Music",
    description: "T-shirts and music downloads. The full catalog in one bundle.",
    images: [
      {
        url: "https://peytspencer.com/api/og/shop",
        width: 1200,
        height: 630,
        alt: "Peyt Spencer Shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Peyt Spencer | Merch & Music",
    description: "T-shirts and music downloads. The full catalog in one bundle.",
    images: ["https://peytspencer.com/api/og/shop"],
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
