import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AudioProvider } from "./contexts/AudioContext";
import { VideoProvider } from "./contexts/VideoContext";
import { DevToolsProvider } from "./contexts/DevToolsContext";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import { Bebas_Neue } from "next/font/google";
import { Suspense } from "react";

// Dynamic imports to avoid SSR issues with usePathname during error handling
const Navbar = dynamic(() => import("./Navbar").then((mod) => mod.Navbar), { ssr: false });
const GlobalAudioPlayer = dynamic(
  () => import("./components/GlobalAudioPlayer").then((mod) => mod.GlobalAudioPlayer),
  { ssr: false }
);
const MissingResourceIndicator = dynamic(
  () => import("./components/MissingResourceIndicator").then((mod) => mod.MissingResourceIndicator),
  { ssr: false }
);
const DevToolsPanel = dynamic(
  () => import("./components/DevToolsPanel").then((mod) => mod.DevToolsPanel),
  { ssr: false }
);

const myFont = localFont({
  src: "./fonts/EpundaSans-VariableFont_wght.ttf",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const siteConfig = {
  name: "Peyt Spencer",
  title: "Peyt Spencer | Rapper & Developer",
  description: "Here, I rap lyrics and here's my app, Lyrist.",
  url: "https://peytspencer.com",
  keywords: ["Peyt Spencer", "rapper", "hip-hop", "Lyrist app", "software developer", "music"],
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
      "Hip-Hop",
      "Rapping",
      "Software Engineering",
      "Building Apps",
      "Music Production",
      "Startups",
      "AI",
    ],
  };

  return (
    <html
      lang="en"
      className={`${myFont.className} ${bebasNeue.variable} bg-white dark:bg-gray-900`}
    >
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
      <body className="antialiased flex flex-col min-h-screen bg-white dark:bg-gray-900">
        <DevToolsProvider>
          <AudioProvider>
            <VideoProvider>
              <Navbar />
              <main className="flex-auto min-w-0 flex flex-col pb-24 lg:pb-32">
                <Suspense>{children}</Suspense>
                <Analytics />
                <SpeedInsights />
              </main>
              <div className="h-24 lg:h-32">
                <GlobalAudioPlayer />
              </div>
              <MissingResourceIndicator />
              <DevToolsPanel />
            </VideoProvider>
          </AudioProvider>
        </DevToolsProvider>
      </body>
    </html>
  );
}
