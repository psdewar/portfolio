import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listen",
  description: "Stream my singles: Right One, Safe, Patience. Freestyles too.",
  openGraph: {
    title: "Listen | Peyt Spencer Music",
    description: "Stream my singles: Right One, Safe, Patience. Freestyles too.",
    images: [
      {
        url: "https://peytspencer.com/api/og/listen",
        width: 1200,
        height: 630,
        alt: "Peyt Spencer Music",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Listen | Peyt Spencer Music",
    description: "Stream my singles: Right One, Safe, Patience. Freestyles too.",
    images: ["https://peytspencer.com/api/og/listen"],
  },
};

export default function ListenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
