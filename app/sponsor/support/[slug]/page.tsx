import SponsorForm from "../../../components/SponsorForm";

export default async function SponsorSupportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SponsorForm mode="supporter" showSlug={slug} />;
}
