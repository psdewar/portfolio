import LiveClient from "./LiveClient";
import { getShowHistory } from "../lib/shows";

export default async function LivePage() {
  const recentShows = (await getShowHistory()).slice(0, 6);
  return <LiveClient recentShows={recentShows} />;
}
