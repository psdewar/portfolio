import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./Navbar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const description = "Founder at Lyrist, Software Engineer at Microsoft";

export const metadata: Metadata = {
  metadataBase: new URL("https://peytspencer.com"),
  title: {
    default: "Peyt Spencer Dewar",
    template: "%s | Peyt Spencer",
  },
  description,
  openGraph: {
    title: "Peyt Spencer",
    description,
    url: "https://peytspencer.com",
    siteName: "Peyt Spencer",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased max-w-2xl flex flex-col md:flex-row mx-4 mt-8 lg:mx-auto">
        <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
          <Navbar />
          {children}
          <Analytics />
          <SpeedInsights />
        </main>
      </body>
    </html>
  );
}
