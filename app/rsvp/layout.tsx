import { Metadata } from "next";

const title = "RSVP | From The Ground Up";
const description =
  "RSVP for From The Ground Up - a rap concert and a conversation by Microsoft engineer Peyt Spencer. Free admission.";
const ogImage = "https://peytspencer.com/api/og/rsvp";

export const metadata: Metadata = {
  alternates: { canonical: "/rsvp" },
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: ogImage, width: 1440, height: 2160 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export default function RSVPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
