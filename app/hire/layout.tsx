import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/hire" },
  title: "Hire",
  description:
    "Hire Peyt Spencer — Microsoft engineer and founder of Lyrist. Full-stack development with TypeScript, React, Next.js, Supabase, and Stripe. Based in Bellevue, WA.",
  openGraph: {
    title: "Hire Peyt Spencer | Developer",
    description:
      "Microsoft engineer and founder of Lyrist. Full-stack development with TypeScript, React, Next.js, Supabase, and Stripe.",
    images: [
      {
        url: "https://peytspencer.com/api/og/hire",
        width: 1200,
        height: 630,
        alt: "Hire Peyt Spencer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hire Peyt Spencer | Developer",
    description:
      "Microsoft engineer and founder of Lyrist. Full-stack development with TypeScript, React, Next.js, Supabase, and Stripe.",
    images: ["https://peytspencer.com/api/og/hire"],
  },
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
