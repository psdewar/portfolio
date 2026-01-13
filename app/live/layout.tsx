import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live",
  description:
    "Watch Peyt Spencer live. Join the stream, chat, and support independent artistry.",
  openGraph: {
    title: "Live | Peyt Spencer",
    description:
      "Watch Peyt Spencer live. Join the stream, chat, and support independent artistry.",
    images: [
      {
        url: "https://peytspencer.com/api/og/live",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live | Peyt Spencer",
    description:
      "Watch Peyt Spencer live. Join the stream, chat, and support independent artistry.",
    images: ["https://peytspencer.com/api/og/live"],
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
