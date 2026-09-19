import LiveClient from "./LiveClient";
import { getShowHistory } from "../lib/shows";
import { getNextStream, getStreamStatus } from "../lib/live";

export default async function LivePage() {
  const [history, initialStatus, nextStream] = await Promise.all([
    getShowHistory(),
    getStreamStatus(),
    getNextStream(),
  ]);
  return (
    <LiveClient recentShows={history.slice(0, 6)} initialStatus={initialStatus} nextStream={nextStream} />
  );
}
