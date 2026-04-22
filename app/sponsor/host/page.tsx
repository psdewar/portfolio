import SponsorForm from "../../components/SponsorForm";

export default async function SponsorHostPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const isPdfMode = params.og === "true";
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
