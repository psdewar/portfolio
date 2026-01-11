import { Metadata } from "next";
import HomePage, { TOUR_DATES } from "../components/HomePage";

export const metadata: Metadata = {
  title: "Tour Dates | Peyt Spencer - Better World Concert Tour Jan 2026",
  description: `Catch Peyt Spencer live on the Better World Concert Tour - Jan 16-19, 2026 in Washington State. Free shows in Vancouver, Bellevue, Edmonds & Kelso. RSVP now!`,
  openGraph: {
    title: "Peyt Spencer - Better World Concert Tour",
    description: "Free live shows Jan 16-19, 2026 in Washington State. Vancouver, Bellevue, Edmonds & Kelso.",
    images: ["/images/home/new-era-1.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peyt Spencer - Better World Concert Tour",
    description: "Free live shows Jan 16-19, 2026 in Washington State",
    images: ["/images/home/new-era-1.jpg"],
  },
  keywords: [
    "Peyt Spencer",
    "Better World Concert",
    "live music",
    "free concert",
    "Washington state",
    "Vancouver WA",
    "Bellevue",
    "Edmonds",
    "Kelso",
    "January 2026",
    "tour dates",
  ],
};

export default function TourPage() {
  return <HomePage initialScrollToTour />;
}
