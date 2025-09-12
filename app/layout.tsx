import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./Navbar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AudioProvider } from "./contexts/AudioContext";
import { GlobalAudioPlayer } from "./components/GlobalAudioPlayer";
import localFont from "next/font/local";

const myFont = localFont({
  src: "./fonts/EpundaSans-VariableFont_wght.ttf",
});

const siteConfig = {
  name: "Peyt Spencer",
  title: "Peyt Spencer - I write raps · I build apps",
  description: "",
  url: "https://peytspencer.com",
  keywords: [
    "Peyt Spencer",
    "I write raps",
    "Positive hip-hop/rap",
    "I build apps",
    "Lyrist",
    "Software engineer",
    "Tech founder",
  ],
  ogImage: "https://peytspencer.com/api/og",
  social: {
    ig: "https://instagram.com/peytspencer",
    tt: "https://tiktok.com/@peytspencer",
    yt: "https://youtube.com/@peytspencer",
    tw: "https://twitter.com/peytspencer",
    fb: "https://facebook.com/9psd2",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@peytspencer",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    alternateName: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    sameAs: Object.values(siteConfig.social),
    jobTitle: ["Father", "Founder", "Rapper"],
    worksFor: [{ "@type": "Organization", name: "Lyrist", url: "https://lyrist.app" }],
    knowsAbout: [
      "Rapping",
      "Software Engineering",
      "Building Apps",
      "Music Production",
      "Startups",
      "AI",
    ],
  };

  return (
    <html lang="en" className={myFont.className}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased max-w-4xl flex flex-col md:flex-row mx-4 mt-8 lg:mx-auto">
        <AudioProvider>
          <Navbar />
          <main className="flex-auto min-w-0 flex flex-col px-2 md:px-0 pt-8">
            {children}
            <Analytics />
            <SpeedInsights />
          </main>
          <GlobalAudioPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}
