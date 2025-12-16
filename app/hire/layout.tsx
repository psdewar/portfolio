import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hire",
  description: "Full-stack developer for hire. I build web and mobile apps. Tell me your idea.",
  openGraph: {
    title: "Hire Peyt Spencer | Developer",
    description: "Full-stack developer for hire. Web and mobile apps.",
    images: [
      {
        url: "https://peytspencer.com/api/og",
        width: 1200,
        height: 630,
        alt: "Hire Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hire Peyt Spencer | Developer",
    description: "Full-stack developer for hire. Web and mobile apps.",
    images: ["https://peytspencer.com/api/og"],
  },
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
