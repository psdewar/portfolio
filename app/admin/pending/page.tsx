import { getShowBySlug } from "../../lib/shows";
import { getSponsors } from "../../lib/sponsors";
import { confirmPath } from "../../lib/confirm";
import PendingCreator from "./PendingCreator";
import ConfirmLinks, { type ConfirmLink } from "./ConfirmLinks";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { created } = await searchParams;

  if (created) {
    const slugs = created.split(",").filter(Boolean);
    const sponsors = await getSponsors();
    const links: ConfirmLink[] = await Promise.all(
      slugs.map(async (slug) => {
        const show = await getShowBySlug(slug);
        const host = sponsors.find((s) => s.showSlug === slug && s.role === "host");
        return {
          slug,
          path: confirmPath(slug),
          label: show
            ? `${show.venue ? `${show.venue}, ` : ""}${show.city}, ${show.region}`
            : slug,
          host:
            host && host.submittedAt
              ? {
                  submittedAt: host.submittedAt,
                  name: host.name ?? "",
                  email: host.email ?? "",
                  phone: host.phone ?? "",
                  venue: host.venue ?? "",
                  address: host.address ?? "",
                  city: host.city ?? "",
                  region: host.region ?? "",
                  country: host.country ?? "",
                  date: host.date ?? "",
                  doorTime: host.doorTime ?? "",
                  items: host.items ?? [],
                }
              : null,
        };
      }),
    );
    return <ConfirmLinks links={links} />;
  }

  return <PendingCreator />;
}
