import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { Bebas_Neue } from "next/font/google";
import { ClientLayout } from "./ClientLayout";

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
  title: "Peyt Spencer | Rapper & Software Engineer",
  description:
    "Rapper and Software Engineer at Microsoft. Stream original singles, attend live shows, and support independent music from Bellevue, WA.",
  url: "https://peytspencer.com",
  keywords: [
    "Peyt Spencer",
    "rapper software engineer",
    "hip-hop Bellevue WA",
    "independent rapper Seattle",
    "rapper Microsoft engineer",
    "East Coast rap Pacific Northwest",
    "Lyrist app",
    "live hip-hop stream",
    "hire developer Bellevue",
    "rapper who codes",
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
  alternates: { canonical: "/" },
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
    "@id": "https://peytspencer.com/#artist",
    name: siteConfig.name,
    alternateName: siteConfig.name,
    description:
      "Rapper and Microsoft engineer from Bellevue, WA known for East Coast cadence and confident delivery. Built Lyrist (songwriting app) and his own live streaming infrastructure. Influenced by Jay-Z, Ja Rule, LL Cool J, Ludacris, and T.I.",
    url: siteConfig.url,
    sameAs: [
      ...Object.values(siteConfig.social),
      "https://open.spotify.com/artist/2i77XjQtnVre1eS46M2ZlN",
      "https://lyrist.app/records/peyt-spencer",
    ],
    jobTitle: ["Rapper", "Software Engineer", "Founder"],
    worksFor: [
      { "@type": "Organization", name: "Microsoft" },
      { "@type": "Organization", name: "Lyrist", url: "https://lyrist.app" },
    ],
    homeLocation: {
      "@type": "Place",
      name: "Bellevue, Washington",
    },
    genre: ["Hip-Hop", "Rap"],
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
