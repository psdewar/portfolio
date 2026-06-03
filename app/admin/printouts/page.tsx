import { getUpcomingShows } from "../../lib/shows";
import PrintoutsClient from "./PrintoutsClient";

export default async function PrintoutsPage() {
  const shows = await getUpcomingShows();
  const currentCity = shows[0]?.city ?? null;
  return <PrintoutsClient currentCity={currentCity} />;
}
