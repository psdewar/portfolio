import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShowBySlug } from "../../lib/shows";
import { musicEventSchema } from "../../lib/schema";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) return {};

  const title = `RSVP - ${show.city}, ${show.region} | From The Ground Up`;
  const description = `RSVP for From The Ground Up in ${show.city}, ${show.region}. A rap concert and a conversation by Microsoft engineer Peyt Spencer. Free admission.`;

  return {
    alternates: { canonical: `/rsvp/${slug}` },
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `https://peytspencer.com/api/og/rsvp/${slug}`,
          width: 1440,
          height: 2160,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://peytspencer.com/api/og/rsvp/${slug}`],
    },
  };
}

export default async function ShowRSVPLayout({ params, children }: Props) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) notFound();

  const eventJsonLd = musicEventSchema({
    name: `${show.name} - A Concert by Peyt Spencer`,
    date: show.date,
    doorTime: show.doorTime,
    venueName: show.venue || `${show.city}, ${show.region}`,
    city: show.city,
    region: show.region,
    country: show.country,
    description:
      "A rap concert and a conversation on my path of growth and the principles that connect us. A free event by Microsoft engineer Peyt Spencer.",
    url: `https://peytspencer.com/rsvp/${slug}`,
    isAccessibleForFree: true,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      {children}
    </>
  );
}
