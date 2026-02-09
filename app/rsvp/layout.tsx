import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/rsvp" },
  title: "RSVP | From The Ground Up",
  description:
    "RSVP for From The Ground Up - a rap concert and a conversation by Microsoft engineer Peyt Spencer. Free admission.",
  openGraph: {
    title: "RSVP | From The Ground Up",
    description:
      "RSVP for From The Ground Up - a rap concert and a conversation by Microsoft engineer Peyt Spencer. Free admission.",
  },
};

export default function RSVPLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
