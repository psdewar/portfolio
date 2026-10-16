import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketRedirect({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }
  const qs = query.toString();
  permanentRedirect(`/checkin/${slug}${qs ? `?${qs}` : ""}`);
}
