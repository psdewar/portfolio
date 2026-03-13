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
      city={params.city}
      region={params.region}
      country={params.country}
      date={params.date}
      doorTime={params.doorTime}
      initialName={params.name}
      initialPhone={params.phone}
      initialEmail={params.email}
      initialItems={params.items ? params.items.split("|") : undefined}
    />
  );
}
