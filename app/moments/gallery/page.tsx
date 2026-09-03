import type { Metadata } from "next";
import MomentsGallery from "../MomentsGallery";
import { getFeaturedGalleryItems } from "../../api/shared/moments";

const title = "Moments from the road";
const description = "Photos and videos from From The Ground Up concerts across North America.";
const url = "https://peytspencer.com/moments/gallery";
const ogImage = "https://peytspencer.com/og/home.jpeg";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/moments/gallery" },
  openGraph: {
    title,
    description,
    url,
    siteName: "Peyt Spencer",
    images: [{ url: ogImage }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const items = await getFeaturedGalleryItems();
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <MomentsGallery items={items} />
    </div>
  );
}
