import { requireAdminPage } from "../../lib/admin-page";
import { chorusList } from "../../lib/chorus";
import { getRsvpCounts } from "../../lib/rsvp";
import { type Show } from "../../lib/shows-shared";
import { type Leg } from "../../fund/legs-shared";
import HostsClient, { type Sponsor } from "./HostsClient";

export const dynamic = "force-dynamic";

export default async function HostsAdminPage() {
  if (!(await requireAdminPage("/admin/hosts"))) return null;

  const [shows, sponsors, legs, rsvpCounts] = await Promise.all([
    chorusList<Show>("shows"),
    chorusList<Sponsor>("sponsors"),
    chorusList<Leg>("legs"),
    getRsvpCounts().catch(() => ({})),
  ]);

  return (
    <HostsClient
      initialShows={shows}
      initialSponsors={sponsors}
      initialLegs={legs}
      initialRsvpCounts={rsvpCounts}
    />
  );
}
