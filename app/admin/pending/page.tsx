import { getShowBySlug } from "../../lib/shows";
import { approvePath } from "../../lib/approve";
import PendingCreator from "./PendingCreator";
import ApprovalLinks from "./ApprovalLinks";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { created } = await searchParams;

  if (created) {
    const slugs = created.split(",").filter(Boolean);
    const links = await Promise.all(
      slugs.map(async (slug) => {
        const show = await getShowBySlug(slug);
        return {
          slug,
          path: approvePath(slug),
          label: show
            ? `${show.venue ? `${show.venue}, ` : ""}${show.city}, ${show.region}`
            : slug,
        };
      }),
    );
    return <ApprovalLinks links={links} />;
  }

  return <PendingCreator />;
}
