import { notFound } from "next/navigation";
import SponsorForm from "../../components/SponsorForm";
import { getShows } from "../../lib/shows";
import { verifyDraftToken } from "../../lib/draft-token";

export default async function SponsorHostPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const isPdfMode = params.og === "true";
  const draftId = params.draft;
  const draftToken = params.t;

  if (draftId && draftToken) {
    if (!verifyDraftToken(draftId, draftToken)) notFound();
    const shows = await getShows();
    const show = shows.find((s) => s.id === draftId);
    if (!show || show.visibility !== "draft") notFound();

    return (
      <SponsorForm
        mode="host"
        isPdfMode={isPdfMode}
        draftId={show.id}
        draftSlug={show.slug}
        venue={show.venue || undefined}
        address={show.address || undefined}
        city={show.city}
        region={show.region}
        country={show.country}
        date={show.date}
        doorTime={show.doorTime}
      />
    );
  }

  return (
    <SponsorForm
      mode="host"
      isPdfMode={isPdfMode}
      venue={params.venue}
      address={params.address}
      city={params.city}
      region={params.region}
      country={params.country}
      date={params.date}
      initialDates={params.dates ? params.dates.split("|") : undefined}
      doorTime={params.doorTime}
      initialDoorTimes={params.doorTimes ? params.doorTimes.split("|") : undefined}
      initialName={params.name}
      initialPhone={params.phone}
      initialEmail={params.email}
      initialItems={params.items ? params.items.split("|") : undefined}
    />
  );
}
